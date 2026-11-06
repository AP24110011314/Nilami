import mongoose, { type FilterQuery } from 'mongoose';
import { Auction, type IAuction, type AuctionDocument } from './auction.model.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../lib/errors.js';
import type { CreateAuctionInput, UpdateAuctionInput, AuctionListQuery } from './auction.schema.js';
import { scheduleAuctionJobs } from '../../queues/queues.js';

export interface SanitizedAuction extends Omit<IAuction, 'reservePrice'> {
  id: string;
  reserveMet: boolean;
  seller?: {
    id: string;
    name: string;
    ratingAvg: number;
    ratingCount: number;
  };
}

export function sanitizeAuction(auction: AuctionDocument | IAuction & { _id: mongoose.Types.ObjectId }): SanitizedAuction {
  const doc = 'toObject' in auction && typeof auction.toObject === 'function' ? auction.toObject() : { ...auction };

  const hasReserve = doc.reservePrice !== null && doc.reservePrice !== undefined;
  const reserveMet = hasReserve ? doc.currentPrice >= (doc.reservePrice as number) : true;

  // STRICT REQUIREMENT: Never expose reservePrice to any client
  delete doc.reservePrice;

  return {
    ...doc,
    id: doc._id ? doc._id.toString() : (auction as AuctionDocument)._id.toString(),
    reserveMet,
  };
}

export class AuctionService {
  public static async create(sellerId: string, input: CreateAuctionInput): Promise<SanitizedAuction> {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const now = new Date();

    const status = startsAt <= now ? 'active' : 'scheduled';

    const auction = await Auction.create({
      sellerId: new mongoose.Types.ObjectId(sellerId),
      title: input.title,
      description: input.description,
      category: input.category,
      condition: input.condition,
      images: input.images,
      currency: 'INR',
      startingPrice: input.startingPrice,
      reservePrice: input.reservePrice,
      minIncrement: input.minIncrement,
      currentPrice: input.startingPrice,
      minNextBid: input.startingPrice,
      startsAt,
      endsAt,
      originalEndsAt: endsAt,
      status,
      antiSnipe: {
        enabled: true,
        windowMs: 10000,
        extendMs: 30000,
        maxExtensions: 20,
      },
    });

    // Schedule BullMQ lifecycle jobs (activate, ending-soon, close)
    void scheduleAuctionJobs(auction._id.toString(), startsAt, endsAt);

    return sanitizeAuction(auction);
  }

  public static async getById(id: string): Promise<{ auction: SanitizedAuction; serverTime: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Auction not found');
    }

    const auction = await Auction.findById(id).populate('sellerId', 'name ratingAvg ratingCount');
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    const sanitized = sanitizeAuction(auction);
    if (auction.sellerId && typeof auction.sellerId === 'object' && '_id' in auction.sellerId) {
      const seller = auction.sellerId as unknown as {
        _id: mongoose.Types.ObjectId;
        name: string;
        ratingAvg: number;
        ratingCount: number;
      };
      sanitized.seller = {
        id: seller._id.toString(),
        name: seller.name,
        ratingAvg: seller.ratingAvg,
        ratingCount: seller.ratingCount,
      };
    }

    return {
      auction: sanitized,
      serverTime: new Date().toISOString(),
    };
  }

  public static async update(
    auctionId: string,
    sellerId: string,
    input: UpdateAuctionInput,
  ): Promise<SanitizedAuction> {
    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      throw new NotFoundError('Auction not found');
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    if (auction.sellerId.toString() !== sellerId) {
      throw new ForbiddenError('You can only edit your own auctions');
    }

    // Business rule FR-B2: Edit only before first bid
    if (auction.bidCount > 0) {
      throw new ConflictError(
        'Auction cannot be edited once bids have been placed',
        'AUCTION_HAS_BIDS',
      );
    }

    if (auction.status !== 'scheduled' && auction.status !== 'active') {
      throw new ConflictError('Only scheduled or active auctions can be edited');
    }

    if (input.title) auction.title = input.title;
    if (input.description) auction.description = input.description;
    if (input.category) auction.category = input.category;
    if (input.condition) auction.condition = input.condition;
    if (input.images) auction.images = input.images;
    if (input.startingPrice) {
      auction.startingPrice = input.startingPrice;
      auction.currentPrice = input.startingPrice;
      auction.minNextBid = input.startingPrice;
    }
    if (input.reservePrice !== undefined) auction.reservePrice = input.reservePrice;
    if (input.minIncrement) auction.minIncrement = input.minIncrement;
    if (input.startsAt) auction.startsAt = new Date(input.startsAt);
    if (input.endsAt) {
      auction.endsAt = new Date(input.endsAt);
      auction.originalEndsAt = new Date(input.endsAt);
    }

    auction.version += 1;
    await auction.save();

    return sanitizeAuction(auction);
  }

  public static async cancel(
    auctionId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<SanitizedAuction> {
    if (!mongoose.Types.ObjectId.isValid(auctionId)) {
      throw new NotFoundError('Auction not found');
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      throw new NotFoundError('Auction not found');
    }

    if (!isAdmin) {
      if (auction.sellerId.toString() !== userId) {
        throw new ForbiddenError('You can only cancel your own auctions');
      }
      // Non-admin owner can only cancel before first bid
      if (auction.bidCount > 0) {
        throw new ConflictError(
          'Owner cannot cancel an auction after bids have been placed. Contact support.',
          'AUCTION_HAS_BIDS',
        );
      }
    }

    if (['completed', 'cancelled', 'payment_pending'].includes(auction.status)) {
      throw new ConflictError(`Cannot cancel an auction with status: ${auction.status}`);
    }

    auction.status = 'cancelled';
    auction.closedAt = new Date();
    auction.version += 1;
    await auction.save();

    return sanitizeAuction(auction);
  }

  public static async list(query: AuctionListQuery): Promise<{
    items: SanitizedAuction[];
    total: number;
    page: number;
    limit: number;
    serverTime: string;
  }> {
    const filter: FilterQuery<IAuction> = {};

    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $in: ['active', 'scheduled'] };
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.currentPrice = {};
      if (query.minPrice !== undefined) filter.currentPrice.$gte = query.minPrice;
      if (query.maxPrice !== undefined) filter.currentPrice.$lte = query.maxPrice;
    }

    if (query.q) {
      filter.$text = { $search: query.q };
    }

    const sortOptions: Record<string, 1 | -1> = {};
    switch (query.sort) {
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'priceAsc':
        sortOptions.currentPrice = 1;
        break;
      case 'priceDesc':
        sortOptions.currentPrice = -1;
        break;
      case 'mostBids':
        sortOptions.bidCount = -1;
        break;
      case 'endingSoon':
      default:
        sortOptions.endsAt = 1;
        break;
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      Auction.find(filter)
        .select('-reservePrice')
        .sort(sortOptions)
        .skip(skip)
        .limit(query.limit)
        .populate('sellerId', 'name ratingAvg ratingCount'),
      Auction.countDocuments(filter),
    ]);

    const sanitizedItems = items.map((a) => {
      const sanitized = sanitizeAuction(a);
      if (a.sellerId && typeof a.sellerId === 'object' && '_id' in a.sellerId) {
        const seller = a.sellerId as unknown as {
          _id: mongoose.Types.ObjectId;
          name: string;
          ratingAvg: number;
          ratingCount: number;
        };
        sanitized.seller = {
          id: seller._id.toString(),
          name: seller.name,
          ratingAvg: seller.ratingAvg,
          ratingCount: seller.ratingCount,
        };
      }
      return sanitized;
    });

    return {
      items: sanitizedItems,
      total,
      page: query.page,
      limit: query.limit,
      serverTime: new Date().toISOString(),
    };
  }
}

