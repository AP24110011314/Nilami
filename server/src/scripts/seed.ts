import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, type IUser } from '../modules/users/user.model.js';
import { Auction, type IAuction, type AuctionCategory, type AuctionCondition } from '../modules/auctions/auction.model.js';
import { Bid } from '../modules/bids/bid.model.js';
import { Payment } from '../modules/payments/payment.model.js';
import { Review, type IReview } from '../modules/reviews/review.model.js';
import { Watchlist } from '../modules/watchlist/watchlist.model.js';
import { Notification, type NotificationType } from '../modules/notifications/notification.model.js';
import { FraudFlag, type IFraudFlag } from '../modules/fraud/fraud.model.js';

interface SeedManifestItem {
  slug: string;
  title: string;
  description: string;
  category: AuctionCategory;
  condition: AuctionCondition;
  startingPrice: number;
  reservePrice?: number;
  minIncrement: number;
  targetStatus: 'active' | 'scheduled' | 'completed' | 'payment_pending' | 'payment_failed' | 'unsold' | 'cancelled';
  endsInMinutes?: number;
  startsInHours?: number;
  images: Array<{
    url: string;
    photographer: string;
    sourceUrl: string;
  }>;
}

export async function runSeed(reset = false) {
  if (env.NODE_ENV === 'production') {
    logger.error('CRITICAL: Refusing to run seed script in production!');
    process.exit(1);
  }

  logger.info({ reset }, 'Starting Nilami rich database seed script...');
  await connectDB();

  try {
    const isReset = reset || process.argv.includes('--reset');

    if (isReset) {
      logger.info('Reset flag detected: purging all existing seed collections...');
      await Promise.all([
        User.deleteMany({ email: /@(nilami\.local|test\.nilami\.local)$/ }),
        Auction.deleteMany({}),
        Bid.deleteMany({}),
        Payment.deleteMany({}),
        Review.deleteMany({}),
        Watchlist.deleteMany({}),
        Notification.deleteMany({}),
        FraudFlag.deleteMany({}),
      ]);
      logger.info('All collections purged.');
    } else {
      // Check if seed data already exists (idempotency check)
      const existingAuctionsCount = await Auction.countDocuments();
      if (existingAuctionsCount >= 80) {
        logger.info(
          { existingAuctionsCount },
          'Seed data already present (>= 80 auctions). Use --reset to reseed.',
        );
        return;
      }
    }

    const defaultPasswordHash = await bcrypt.hash('Password123!', 12);
    const now = Date.now();
    const verifiedDate = new Date(now - 30 * 24 * 3600 * 1000); // 30 days ago

    // ==========================================
    // 1. ADMIN USER (1)
    // ==========================================
    const admin = await User.create({
      name: 'Nilami Superadmin',
      email: 'admin@nilami.local',
      passwordHash: defaultPasswordHash,
      roles: ['admin', 'seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: verifiedDate,
    });

    // ==========================================
    // 2. SELLERS (8)
    // ==========================================
    const sellersData = [
      { name: 'Apex Electronics', email: 'seller1@nilami.local' },
      { name: 'Heritage Antiques & Art', email: 'seller2@nilami.local' },
      { name: 'Luxe Horology & Watches', email: 'seller3@nilami.local' },
      { name: 'Vogue Couture Mumbai', email: 'seller4@nilami.local' },
      { name: 'MotorSport Classics Pune', email: 'seller5@nilami.local' },
      { name: 'Malabar Heritage Furniture', email: 'seller6@nilami.local' },
      { name: 'Rare Bibliophiles Kolkata', email: 'seller7@nilami.local' },
      { name: 'Swara Musical Instruments Varanasi', email: 'seller8@nilami.local' },
    ];

    const sellers: mongoose.HydratedDocument<IUser>[] = [];
    for (const s of sellersData) {
      const seller = await User.create({
        name: s.name,
        email: s.email,
        passwordHash: defaultPasswordHash,
        roles: ['seller', 'buyer'],
        status: 'active',
        emailVerifiedAt: verifiedDate,
        ratingAvg: 4.8,
        ratingCount: 10,
        stats: { bidsPlaced: 0, auctionsWon: 0, auctionsSold: 0 },
      });
      sellers.push(seller);
    }

    // ==========================================
    // 3. BUYERS (40)
    // ==========================================
    const buyerNames = [
      'Aarav Sharma', 'Priya Patel', 'Vikram Malhotra', 'Ananya Desai', 'Rohan Gupta',
      'Sneha Verma', 'Karan Johar', 'Meera Nair', 'Aditya Singhania', 'Pooja Hegde',
      'Kabir Mehta', 'Rhea Chakraborty', 'Arjun Kapoor', 'Diya Mirza', 'Siddharth Rao',
      'Tara Sutaria', 'Farhan Akhtar', 'Kriti Sanon', 'Varun Dhawan', 'Alia Bhatt',
      'Ranbir Roy', 'Shraddha Kapoor', 'Devendra Joshi', 'Ishaan Khatter', 'Radhika Madan',
      'Naveen Polishetty', 'Mithila Palkar', 'Amol Parashar', 'Sanya Malhotra', 'Ayushmann Khurrana',
      'Rajkummar Rao', 'Bhumi Pednekar', 'Vicky Kaushal', 'Fatima Sana', 'Dulquer Salmaan',
      'Parvathy Thiruvothu', 'Vijay Deverakonda', 'Rashmika Mandanna', 'Prithviraj Sukumaran', 'Nayanthara Kurian'
    ];

    const buyers: mongoose.HydratedDocument<IUser>[] = [];
    for (let i = 0; i < buyerNames.length; i++) {
      const buyer = await User.create({
        name: buyerNames[i]!,
        email: `buyer${i + 1}@nilami.local`,
        passwordHash: defaultPasswordHash,
        roles: ['buyer'],
        status: 'active',
        emailVerifiedAt: verifiedDate,
        stats: { bidsPlaced: 0, auctionsWon: 0, auctionsSold: 0 },
      });
      buyers.push(buyer);
    }

    logger.info({ admin: admin.email, sellers: sellers.length, buyers: buyers.length }, 'Users generated');

    // ==========================================
    // 4. LOAD MANIFEST & SEED AUCTIONS (85 items)
    // ==========================================
    const manifestPath = fs.existsSync(path.resolve(process.cwd(), 'scripts/seed-manifest.json'))
      ? path.resolve(process.cwd(), 'scripts/seed-manifest.json')
      : path.resolve(process.cwd(), '../scripts/seed-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file missing at ${manifestPath}`);
    }
    const manifest: SeedManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

    // Category to Seller mapping
    const categorySellerMap: Record<string, mongoose.HydratedDocument<IUser>> = {
      electronics: sellers[0]!,
      appliances: sellers[0]!,
      art: sellers[1]!,
      collectibles: sellers[1]!,
      watches: sellers[2]!,
      fashion: sellers[3]!,
      vehicles: sellers[4]!,
      sports: sellers[4]!,
      furniture: sellers[5]!,
      books: sellers[6]!,
      musical: sellers[7]!,
      other: sellers[1]!,
    };

    let totalBidsCreated = 0;
    const completedAuctions: mongoose.HydratedDocument<IAuction>[] = [];
    const paymentPendingAuctions: mongoose.HydratedDocument<IAuction>[] = [];
    const paymentFailedAuctions: mongoose.HydratedDocument<IAuction>[] = [];
    const activeAuctionsList: mongoose.HydratedDocument<IAuction>[] = [];

    for (let i = 0; i < manifest.length; i++) {
      const item = manifest[i]!;
      const seller = categorySellerMap[item.category] || sellers[0]!;

      // Determine local images
      const images = item.images.map((_img, idx) => ({
        url: `/uploads/seed/${item.slug}-${idx + 1}.webp`,
        publicId: `${item.slug}-${idx + 1}.webp`,
      }));

      // Calculate time windows based on target status
      let startsAt: Date;
      let endsAt: Date;
      let originalEndsAt: Date;
      let closedAt: Date | null = null;
      const status = item.targetStatus;
      let extensionCount = 0;

      if (status === 'active') {
        const remainingMinutes = item.endsInMinutes || 120;
        startsAt = new Date(now - 4 * 3600 * 1000); // started 4 hours ago
        endsAt = new Date(now + remainingMinutes * 60 * 1000); // ends relative to NOW
        originalEndsAt = endsAt;
      } else if (status === 'scheduled') {
        const startsInHours = item.startsInHours || 24;
        startsAt = new Date(now + startsInHours * 3600 * 1000);
        endsAt = new Date(now + (startsInHours + 72) * 3600 * 1000);
        originalEndsAt = endsAt;
      } else if (status === 'completed' || status === 'payment_pending' || status === 'payment_failed') {
        startsAt = new Date(now - 72 * 3600 * 1000); // 3 days ago
        endsAt = new Date(now - 12 * 3600 * 1000); // ended 12h ago
        originalEndsAt = new Date(now - 12 * 3600 * 1000 - 60000); // extended once (+60s)
        extensionCount = 1;
        closedAt = endsAt;
      } else if (status === 'unsold') {
        startsAt = new Date(now - 48 * 3600 * 1000);
        endsAt = new Date(now - 6 * 3600 * 1000);
        originalEndsAt = endsAt;
        closedAt = endsAt;
      } else {
        // cancelled
        startsAt = new Date(now - 24 * 3600 * 1000);
        endsAt = new Date(now + 24 * 3600 * 1000);
        originalEndsAt = endsAt;
        closedAt = new Date(now - 4 * 3600 * 1000);
      }

      // Create Auction initial document
      const auction = await Auction.create({
        sellerId: seller._id,
        title: item.title,
        description: item.description,
        category: item.category,
        condition: item.condition,
        images,
        currency: 'INR',
        startingPrice: item.startingPrice,
        reservePrice: item.reservePrice,
        minIncrement: item.minIncrement,
        currentPrice: item.startingPrice,
        minNextBid: item.startingPrice,
        highestBidderId: null,
        outbidUserId: null,
        bidCount: 0,
        startsAt,
        endsAt,
        originalEndsAt,
        extensionCount,
        antiSnipe: {
          enabled: true,
          windowMs: 10000,
          extendMs: 30000,
          maxExtensions: 20,
        },
        status,
        closedAt,
        winnerId: null,
        finalPrice: null,
        paymentDueAt: null,
        watchCount: Math.floor(Math.random() * 25) + 3,
        version: 1,
      });

      // Determine how many bids to simulate for this auction
      let targetBidCount = 0;
      if (status === 'completed') {
        targetBidCount = 6 + (i % 8); // 6 to 13 bids
      } else if (status === 'payment_pending') {
        targetBidCount = 5 + (i % 5); // 5 to 9 bids
      } else if (status === 'payment_failed') {
        targetBidCount = 4 + (i % 4); // 4 to 7 bids
      } else if (status === 'active') {
        // Give active lots varied activity
        targetBidCount = i % 4 === 0 ? 0 : 3 + (i % 6); // 0 or 3 to 8 bids
      } else if (status === 'unsold') {
        targetBidCount = i % 2 === 0 ? 0 : 2; // 0 bids or bids below reserve
      }

      if (targetBidCount > 0) {
        let currentAmount = item.startingPrice;
        let highestBidderId: mongoose.Types.ObjectId | null = null;
        let outbidUserId: mongoose.Types.ObjectId | null = null;

        // Spread bids across the auction duration
        const startTime = startsAt.getTime();
        const endTime = (closedAt ? closedAt.getTime() : Math.min(now, endsAt.getTime())) - 10000;
        const timeStep = Math.max(1000, Math.floor((endTime - startTime) / (targetBidCount + 1)));

        for (let b = 0; b < targetBidCount; b++) {
          const bidderIndex = (i * 3 + b) % buyers.length;
          const bidder = buyers[bidderIndex]!;
          outbidUserId = highestBidderId;
          highestBidderId = bidder._id;

          if (b > 0) {
            currentAmount += item.minIncrement;
          }

          const bidCreatedAt = new Date(startTime + (b + 1) * timeStep);
          const isLateBid = extensionCount > 0 && b === targetBidCount - 1;

          await Bid.create({
            auctionId: auction._id,
            bidderId: bidder._id,
            amount: currentAmount,
            idempotencyKey: `seed_bid_${auction._id.toString()}_${b}`,
            extended: isLateBid,
            ip: `198.51.100.${(b % 50) + 1}`,
            userAgentHash: crypto.createHash('sha256').update('seed-browser').digest('hex'),
            createdAt: bidCreatedAt,
          });

          // Update buyer stats
          await User.findByIdAndUpdate(bidder._id, { $inc: { 'stats.bidsPlaced': 1 } });
          totalBidsCreated++;
        }

        auction.currentPrice = currentAmount;
        auction.minNextBid = currentAmount + item.minIncrement;
        auction.highestBidderId = highestBidderId;
        auction.outbidUserId = outbidUserId;
        auction.bidCount = targetBidCount;

        if (status === 'completed' || status === 'payment_pending' || status === 'payment_failed') {
          auction.winnerId = highestBidderId;
          auction.finalPrice = currentAmount;
          if (status === 'payment_pending') {
            auction.paymentDueAt = new Date(now + 48 * 3600 * 1000);
          }
          await User.findByIdAndUpdate(highestBidderId, { $inc: { 'stats.auctionsWon': 1 } });
          await User.findByIdAndUpdate(seller._id, { $inc: { 'stats.auctionsSold': 1 } });
        }

        await auction.save();
      }

      if (status === 'completed') completedAuctions.push(auction);
      else if (status === 'payment_pending') paymentPendingAuctions.push(auction);
      else if (status === 'payment_failed') paymentFailedAuctions.push(auction);
      else if (status === 'active') activeAuctionsList.push(auction);
    }

    logger.info({ totalAuctions: manifest.length, totalBidsCreated }, 'Auctions and bids seeded');

    // ==========================================
    // 5. PAYMENTS GENERATION
    // ==========================================
    logger.info('Generating payments...');
    for (const a of completedAuctions) {
      await Payment.create({
        auctionId: a._id,
        buyerId: a.winnerId!,
        sellerId: a.sellerId,
        amount: a.finalPrice!,
        currency: 'INR',
        status: 'succeeded',
        method: 'checkout',
        stripeCustomerId: `cus_seed_${a.winnerId!.toString().slice(-8)}`,
        stripeCheckoutSessionId: `cs_test_seed_${a._id.toString().slice(-8)}`,
        stripePaymentIntentId: `pi_test_seed_${a._id.toString().slice(-8)}`,
        attempts: [
          {
            at: a.closedAt!,
            method: 'checkout',
            outcome: 'succeeded',
          },
        ],
        dueAt: new Date(a.closedAt!.getTime() + 48 * 3600 * 1000),
        paidAt: a.closedAt,
      });
    }

    for (const a of paymentPendingAuctions) {
      await Payment.create({
        auctionId: a._id,
        buyerId: a.winnerId!,
        sellerId: a.sellerId,
        amount: a.finalPrice!,
        currency: 'INR',
        status: 'pending',
        method: 'checkout',
        attempts: [],
        dueAt: a.paymentDueAt || new Date(now + 48 * 3600 * 1000),
      });
    }

    for (const a of paymentFailedAuctions) {
      await Payment.create({
        auctionId: a._id,
        buyerId: a.winnerId!,
        sellerId: a.sellerId,
        amount: a.finalPrice!,
        currency: 'INR',
        status: 'failed',
        method: 'checkout',
        attempts: [
          {
            at: a.closedAt!,
            method: 'checkout',
            outcome: 'failed',
            errorCode: 'card_declined',
          },
        ],
        dueAt: a.closedAt!,
      });
    }

    // ==========================================
    // 6. REVIEWS & SELLER RATING RECALCULATION
    // ==========================================
    logger.info('Generating verified buyer reviews...');
    const authenticComments = [
      'Item arrived in immaculate museum condition. Double boxed with security seals intact. Excellent seller communication!',
      'Authentic provenance certified. The timepiece keeps exact COSC accuracy. Will gladly bid again.',
      'Exquisite craftsmanship and fast dispatch. The artwork looks even more mesmerizing in person.',
      'Flawless transaction. Seller assisted with White Glove logistics and tracking updates throughout.',
      'Verified authentic vintage lot. Described with extreme accuracy. Highly recommended seller!',
    ];

    const reviewsCreated: mongoose.HydratedDocument<IReview>[] = [];
    for (let r = 0; r < Math.min(25, completedAuctions.length); r++) {
      const a = completedAuctions[r]!;
      const rating = r % 5 === 0 ? 4 : 5; // mix of 4 and 5 stars
      const review = await Review.create({
        auctionId: a._id,
        reviewerId: a.winnerId!,
        sellerId: a.sellerId,
        rating,
        comment: authenticComments[r % authenticComments.length],
      });
      reviewsCreated.push(review);
    }

    // Recalculate seller ratings mathematically from reviews
    for (const seller of sellers) {
      const sellerReviews = await Review.find({ sellerId: seller._id });
      if (sellerReviews.length > 0) {
        const sum = sellerReviews.reduce((acc, rev) => acc + rev.rating, 0);
        const avg = Math.round((sum / sellerReviews.length) * 10) / 10;
        await User.findByIdAndUpdate(seller._id, {
          ratingAvg: avg,
          ratingCount: sellerReviews.length,
        });
      }
    }

    // ==========================================
    // 7. WATCHLIST GENERATION (60+ entries)
    // ==========================================
    logger.info('Generating watchlist bookmarks...');
    for (let w = 0; w < 60; w++) {
      const buyer = buyers[w % buyers.length]!;
      const auction = activeAuctionsList[w % activeAuctionsList.length]!;
      try {
        await Watchlist.create({
          userId: buyer._id,
          auctionId: auction._id,
          remindMinutesBefore: 15,
        });
      } catch {
        // ignore unique index duplicates
      }
    }

    // ==========================================
    // 8. NOTIFICATIONS (Every single NotificationType)
    // ==========================================
    logger.info('Generating notifications of all system types...');
    const sampleAuction = activeAuctionsList[0] || completedAuctions[0]!;
    const sampleBid = await Bid.findOne({ auctionId: sampleAuction._id });

    const notificationTemplates: Array<{ type: NotificationType; title: string; body: string }> = [
      { type: 'OUTBID', title: 'You have been outbid!', body: `Another collector placed a higher bid on ${sampleAuction.title}. Bid now to regain the lead.` },
      { type: 'WON', title: 'Congratulations! You won the auction', body: `Your bid on ${sampleAuction.title} was accepted. Complete payment within 48 hours.` },
      { type: 'LOST', title: 'Auction concluded', body: `The bidding on ${sampleAuction.title} has closed and another bidder won.` },
      { type: 'PAYMENT_DUE', title: 'Payment Reminder (48h Window)', body: `Your payment of ₹${((sampleAuction.currentPrice || 100000) / 100).toLocaleString('en-IN')} for ${sampleAuction.title} is due.` },
      { type: 'PAYMENT_SUCCEEDED', title: 'Payment Confirmed via Escrow', body: `Your payment was verified by Stripe Webhook. Your lot is being prepared for dispatch.` },
      { type: 'PAYMENT_FAILED', title: 'Payment Attempt Declined', body: `Your payment method was declined. Please try an alternative card or UPI to avoid forfeiture.` },
      { type: 'AUCTION_ENDING', title: 'Ending Soon Alert', body: `${sampleAuction.title} has entered its final 15 minutes of bidding!` },
      { type: 'AUCTION_EXTENDED', title: 'Anti-Snipe Window Extended (+30s)', body: `A late bid was registered within 10 seconds of expiry. The timer has extended by +30 seconds.` },
      { type: 'SOLD', title: 'Your lot has been sold!', body: `Bidding concluded for ${sampleAuction.title}. Winner notified for escrow checkout.` },
      { type: 'UNSOLD', title: 'Auction Closed (Reserve Unmet)', body: `The reserve price was not reached for ${sampleAuction.title}. You may relist with revised terms.` },
      { type: 'WATCH_REMINDER', title: 'Watchlist Reminder', body: `${sampleAuction.title} is ending soon. Do not miss your chance to bid.` },
      { type: 'FRAUD_ALERT', title: 'Security Advisory', body: `Unusual bidding pattern detected and flagged for administrative compliance.` },
      { type: 'REVIEW_RECEIVED', title: 'New 5-Star Seller Review Received', body: `A buyer has submitted a 5-star rating for your authentic lot fulfillment.` },
    ];

    for (let n = 0; n < notificationTemplates.length; n++) {
      const template = notificationTemplates[n]!;
      const user = buyers[n % buyers.length]!;
      await Notification.create({
        userId: user._id,
        type: template.type,
        title: template.title,
        body: template.body,
        data: {
          auctionId: sampleAuction._id,
          bidId: sampleBid?._id,
        },
        readAt: n % 2 === 0 ? new Date() : null,
      });
    }

    // ==========================================
    // 9. FRAUD FLAGS FOR ADMIN QUEUE
    // ==========================================
    logger.info('Generating fraud detection queue flags...');
    const suspiciousBuyer = buyers[0]!;
    const fraudFlagsData: Partial<IFraudFlag>[] = [
      {
        type: 'BID_BURST',
        score: 88,
        subjectUserId: suspiciousBuyer._id,
        auctionId: sampleAuction._id,
        bidIds: sampleBid ? [sampleBid._id] : [],
        evidence: { bidsInTenSeconds: 7, averageIntervalMs: 1240, clientAgent: 'Python-urllib/3.10' },
        status: 'open',
      },
      {
        type: 'SELLER_LINKED_BIDDER',
        score: 94,
        subjectUserId: buyers[1]!._id,
        auctionId: sampleAuction._id,
        bidIds: [],
        evidence: { sellerId: sellers[0]!._id.toString(), sharedIpSubnet: '203.0.113.0/24', accountCreationDeltaDays: 2 },
        status: 'open',
      },
      {
        type: 'SHILL_PATTERN',
        score: 79,
        subjectUserId: buyers[2]!._id,
        auctionId: sampleAuction._id,
        bidIds: [],
        evidence: { outbidReboundTimeSeconds: 4, sellerListingOverlapPercent: 92 },
        status: 'open',
      },
      {
        type: 'LAST_SECOND_SNIPER',
        score: 42,
        subjectUserId: buyers[3]!._id,
        auctionId: sampleAuction._id,
        bidIds: [],
        evidence: { submittedAtDeltaMs: 380, browserAutomationConfidence: 0.25 },
        status: 'dismissed',
        reviewedBy: admin._id,
        reviewedAt: new Date(now - 3600 * 1000),
      },
      {
        type: 'PAYMENT_ABANDONER',
        score: 91,
        subjectUserId: buyers[4]!._id,
        bidIds: [],
        evidence: { unpaidLotsCount: 3, totalUnpaidAmountPaise: 54000000, delinquencyDays: 6 },
        status: 'confirmed',
        reviewedBy: admin._id,
        reviewedAt: new Date(now - 1800 * 1000),
      },
    ];

    for (const flag of fraudFlagsData) {
      await FraudFlag.create(flag);
    }

    logger.info('Database seeding completed successfully!');
    logger.info({
      users: 1 + sellers.length + buyers.length,
      auctions: manifest.length,
      bids: totalBidsCreated,
      payments: completedAuctions.length + paymentPendingAuctions.length + paymentFailedAuctions.length,
      reviews: reviewsCreated.length,
      notifications: notificationTemplates.length,
      fraudFlags: fraudFlagsData.length,
    }, 'Seed summary statistics');
  } catch (error: unknown) {
    const err = error as Error;
    logger.fatal({ err: err?.message, stack: err?.stack }, 'Database seeding encountered fatal error');
    throw error;
  } finally {
    await disconnectDB();
  }
}

// Allow direct execution from CLI
if (process.argv[1]?.endsWith('seed.ts')) {
  const reset = process.argv.includes('--reset');
  runSeed(reset)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
