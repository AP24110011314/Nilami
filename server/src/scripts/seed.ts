import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, type IUser } from '../modules/users/user.model.js';
import { Auction, type IAuction } from '../modules/auctions/auction.model.js';

async function runSeed() {
  if (env.NODE_ENV === 'production') {
    logger.error('CRITICAL: Cannot run seed script in production!');
    process.exit(1);
  }

  logger.info('Starting Nilami database seed script...');
  await connectDB();

  try {
    // Clean existing seed data
    await User.deleteMany({ email: /@(nilami\.local|test\.nilami\.local)$/ });
    await Auction.deleteMany({});

    logger.info('Previous seed data purged. Generating users...');

    const defaultPasswordHash = await bcrypt.hash('Password123!', 12);
    const verifiedDate = new Date();

    // 1 Admin
    const admin = await User.create({
      name: 'Nilami Superadmin',
      email: 'admin@nilami.local',
      passwordHash: defaultPasswordHash,
      roles: ['admin', 'seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: verifiedDate,
    });

    // 3 Sellers
    const seller1 = await User.create({
      name: 'Apex Electronics',
      email: 'seller1@nilami.local',
      passwordHash: defaultPasswordHash,
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: verifiedDate,
      ratingAvg: 4.8,
      ratingCount: 24,
    });

    const seller2 = await User.create({
      name: 'Heritage Antiques',
      email: 'seller2@nilami.local',
      passwordHash: defaultPasswordHash,
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: verifiedDate,
      ratingAvg: 4.9,
      ratingCount: 39,
    });

    const seller3 = await User.create({
      name: 'Luxe Horology',
      email: 'seller3@nilami.local',
      passwordHash: defaultPasswordHash,
      roles: ['seller', 'buyer'],
      status: 'active',
      emailVerifiedAt: verifiedDate,
      ratingAvg: 4.7,
      ratingCount: 15,
    });

    // 8 Buyers
    const buyerNames = [
      'Aarav Sharma',
      'Priya Patel',
      'Vikram Malhotra',
      'Ananya Desai',
      'Rohan Gupta',
      'Sneha Verma',
      'Karan Johar',
      'Meera Nair',
    ];

    const buyers: mongoose.HydratedDocument<IUser>[] = [];
    for (let i = 0; i < buyerNames.length; i++) {
      const buyer = await User.create({
        name: buyerNames[i],
        email: `buyer${i + 1}@nilami.local`,
        passwordHash: defaultPasswordHash,
        roles: ['buyer'],
        status: 'active',
        emailVerifiedAt: verifiedDate,
      });
      buyers.push(buyer);
    }

    logger.info({ admin: admin.email, sellers: 3, buyers: buyers.length }, 'Users seeded successfully');

    // 20 Auctions
    const now = Date.now();
    const auctionsData: Partial<IAuction>[] = [
      // Demo preset: Active auctions ending in 2-10 minutes
      {
        sellerId: seller1._id,
        title: 'Apple MacBook Pro M4 Max (16-inch, 64GB, 2TB SSD)',
        description:
          'Flagship Apple Silicon laptop in pristine Space Black finish. Battery health 100%, 14 cycles. Includes MagSafe charger and original retail packaging.',
        category: 'electronics',
        condition: 'like_new',
        images: [
          { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800' },
          { url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800' },
        ],
        startingPrice: 18000000, // ₹1,80,000
        reservePrice: 21000000, // ₹2,10,000
        minIncrement: 200000, // ₹2,000
        currentPrice: 19200000, // ₹1,92,000
        minNextBid: 19400000,
        startsAt: new Date(now - 10 * 60 * 1000),
        endsAt: new Date(now + 4 * 60 * 1000), // Ends in 4 min!
        originalEndsAt: new Date(now + 4 * 60 * 1000),
        status: 'active',
        bidCount: 6,
      },
      {
        sellerId: seller3._id,
        title: 'Rolex Submariner Date "Kermit" 41mm Ref. 126610LV',
        description:
          'Cerachrom green bezel with black dial. Full set with box, papers, green tags, and warranty booklet dated October 2024. Factory protective stickers intact.',
        category: 'collectibles',
        condition: 'new',
        images: [
          { url: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=800' },
          { url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800' },
        ],
        startingPrice: 115000000, // ₹11,50,000
        reservePrice: 125000000, // ₹12,50,000
        minIncrement: 500000, // ₹5,000
        currentPrice: 118000000,
        minNextBid: 118500000,
        startsAt: new Date(now - 15 * 60 * 1000),
        endsAt: new Date(now + 8 * 60 * 1000), // Ends in 8 min!
        originalEndsAt: new Date(now + 8 * 60 * 1000),
        status: 'active',
        bidCount: 4,
      },
      {
        sellerId: seller2._id,
        title: '19th Century Tanjore Painting — Krishna with Butter Pot',
        description:
          'Authentic Thanjavur art with 22-carat gold leaf embellishment and semi-precious Jaipur stones. Encased in reclaimed seasoned teakwood frame.',
        category: 'art',
        condition: 'used_good',
        images: [
          { url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
          { url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=800' },
        ],
        startingPrice: 7500000, // ₹75,000
        reservePrice: 8500000,
        minIncrement: 100000,
        currentPrice: 8100000,
        minNextBid: 8200000,
        startsAt: new Date(now - 20 * 60 * 1000),
        endsAt: new Date(now + 9 * 60 * 1000), // Ends in 9 min!
        originalEndsAt: new Date(now + 9 * 60 * 1000),
        status: 'active',
        bidCount: 3,
      },
      // Active auctions ending in hours/days
      {
        sellerId: seller1._id,
        title: 'Sony Alpha A1 Mirrorless Camera Body (50.1 MP, 8K 30p)',
        description: 'Professional cinema & still hybrid camera. Shutter count under 1,200.',
        category: 'electronics',
        condition: 'like_new',
        images: [
          { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800' },
        ],
        startingPrice: 42000000, // ₹4,20,000
        reservePrice: 45000000,
        minIncrement: 500000,
        currentPrice: 42000000,
        minNextBid: 42000000,
        startsAt: new Date(now - 2 * 3600 * 1000),
        endsAt: new Date(now + 24 * 3600 * 1000),
        originalEndsAt: new Date(now + 24 * 3600 * 1000),
        status: 'active',
        bidCount: 0,
      },
      {
        sellerId: seller3._id,
        title: 'Cartier Santos de Cartier Large Model Two-Tone',
        description: 'Stainless steel and 18K yellow gold, manufacture mechanical movement.',
        category: 'collectibles',
        condition: 'like_new',
        images: [
          { url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800' },
        ],
        startingPrice: 65000000,
        reservePrice: 72000000,
        minIncrement: 500000,
        currentPrice: 65000000,
        minNextBid: 65000000,
        startsAt: new Date(now - 1 * 3600 * 1000),
        endsAt: new Date(now + 36 * 3600 * 1000),
        originalEndsAt: new Date(now + 36 * 3600 * 1000),
        status: 'active',
        bidCount: 0,
      },
      {
        sellerId: seller1._id,
        title: 'Bose QuietComfort Ultra Headphones Limited White Smoke',
        description: 'Brand new, sealed in original box with worldwide manufacturer warranty.',
        category: 'electronics',
        condition: 'new',
        images: [
          { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' },
        ],
        startingPrice: 2800000,
        minIncrement: 50000,
        currentPrice: 2950000,
        minNextBid: 3000000,
        startsAt: new Date(now - 4 * 3600 * 1000),
        endsAt: new Date(now + 48 * 3600 * 1000),
        originalEndsAt: new Date(now + 48 * 3600 * 1000),
        status: 'active',
        bidCount: 2,
      },
      {
        sellerId: seller2._id,
        title: 'Vintage Royal Enfield 1968 Brass Carburetor Assembly',
        description: 'Original Amal Monobloc carburetor thoroughly serviced and ultrasound cleaned.',
        category: 'vehicles',
        condition: 'used_good',
        images: [
          { url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800' },
        ],
        startingPrice: 1500000,
        minIncrement: 50000,
        currentPrice: 1650000,
        minNextBid: 1700000,
        startsAt: new Date(now - 12 * 3600 * 1000),
        endsAt: new Date(now + 60 * 3600 * 1000),
        originalEndsAt: new Date(now + 60 * 3600 * 1000),
        status: 'active',
        bidCount: 1,
      },
      {
        sellerId: seller2._id,
        title: 'Rare 1947 Indian Independence First Day Stamp Cover',
        description: 'Postmarked on 15 August 1947, New Delhi GPO. Certified authentic.',
        category: 'collectibles',
        condition: 'used_good',
        images: [
          { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800' },
        ],
        startingPrice: 3500000,
        minIncrement: 100000,
        currentPrice: 3800000,
        minNextBid: 3900000,
        startsAt: new Date(now - 8 * 3600 * 1000),
        endsAt: new Date(now + 72 * 3600 * 1000),
        originalEndsAt: new Date(now + 72 * 3600 * 1000),
        status: 'active',
        bidCount: 2,
      },

      // Scheduled Auctions (starts in future)
      {
        sellerId: seller1._id,
        title: 'Nvidia RTX 5090 Founders Edition 32GB GDDR7',
        description: 'Next-gen desktop GPU, factory sealed. Bidding opens tomorrow.',
        category: 'electronics',
        condition: 'new',
        images: [
          { url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800' },
        ],
        startingPrice: 19500000,
        minIncrement: 200000,
        currentPrice: 19500000,
        minNextBid: 19500000,
        startsAt: new Date(now + 24 * 3600 * 1000),
        endsAt: new Date(now + 96 * 3600 * 1000),
        originalEndsAt: new Date(now + 96 * 3600 * 1000),
        status: 'scheduled',
        bidCount: 0,
      },
      {
        sellerId: seller3._id,
        title: 'Patek Philippe Calatrava Ref. 5227R Rose Gold',
        description: 'Officer-style case with hinged dust cover. Complete documentation.',
        category: 'collectibles',
        condition: 'like_new',
        images: [
          { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800' },
        ],
        startingPrice: 280000000,
        reservePrice: 310000000,
        minIncrement: 1000000,
        currentPrice: 280000000,
        minNextBid: 280000000,
        startsAt: new Date(now + 12 * 3600 * 1000),
        endsAt: new Date(now + 84 * 3600 * 1000),
        originalEndsAt: new Date(now + 84 * 3600 * 1000),
        status: 'scheduled',
        bidCount: 0,
      },
      {
        sellerId: seller2._id,
        title: 'Original M.F. Husain Oil on Canvas — Horses Series (1988)',
        description: 'Signed lower right. Includes provenance certificate from Vadehra Art Gallery.',
        category: 'art',
        condition: 'used_good',
        images: [
          { url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800' },
          { url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=800' },
        ],
        startingPrice: 450000000,
        minIncrement: 2500000,
        currentPrice: 450000000,
        minNextBid: 450000000,
        startsAt: new Date(now + 6 * 3600 * 1000),
        endsAt: new Date(now + 78 * 3600 * 1000),
        originalEndsAt: new Date(now + 78 * 3600 * 1000),
        status: 'scheduled',
        bidCount: 0,
      },
      {
        sellerId: seller1._id,
        title: 'Hasselblad 907X 50C Medium Format Camera Kit',
        description: 'CFV II 50C digital back and 907X body. Pristine condition with 45mm lens.',
        category: 'electronics',
        condition: 'like_new',
        images: [
          { url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800' },
        ],
        startingPrice: 52000000,
        minIncrement: 500000,
        currentPrice: 52000000,
        minNextBid: 52000000,
        startsAt: new Date(now + 18 * 3600 * 1000),
        endsAt: new Date(now + 90 * 3600 * 1000),
        originalEndsAt: new Date(now + 90 * 3600 * 1000),
        status: 'scheduled',
        bidCount: 0,
      },

      // Completed / Ended Auctions
      {
        sellerId: seller1._id,
        title: 'iPad Pro 13-inch M4 (1TB, Nano-texture Glass)',
        description: 'Auction concluded successfully.',
        category: 'electronics',
        condition: 'like_new',
        images: [
          { url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800' },
        ],
        startingPrice: 12000000,
        minIncrement: 200000,
        currentPrice: 14400000,
        finalPrice: 14400000,
        minNextBid: 14600000,
        startsAt: new Date(now - 72 * 3600 * 1000),
        endsAt: new Date(now - 24 * 3600 * 1000),
        originalEndsAt: new Date(now - 24 * 3600 * 1000),
        status: 'completed',
        closedAt: new Date(now - 24 * 3600 * 1000),
        winnerId: buyers[0]!._id,
        bidCount: 8,
      },
      {
        sellerId: seller3._id,
        title: 'Omega Speedmaster Professional Moonwatch Sapphire Sandwich',
        description: 'Calibre 3861 master chronometer.',
        category: 'collectibles',
        condition: 'like_new',
        images: [
          { url: 'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800' },
        ],
        startingPrice: 58000000,
        minIncrement: 500000,
        currentPrice: 63500000,
        finalPrice: 63500000,
        minNextBid: 64000000,
        startsAt: new Date(now - 48 * 3600 * 1000),
        endsAt: new Date(now - 12 * 3600 * 1000),
        originalEndsAt: new Date(now - 12 * 3600 * 1000),
        status: 'completed',
        closedAt: new Date(now - 12 * 3600 * 1000),
        winnerId: buyers[1]!._id,
        bidCount: 7,
      },
      {
        sellerId: seller2._id,
        title: 'Handcrafted Kashmiri Walnut Wood Carved Chest',
        description: 'Exquisite Chinar leaf relief carvings throughout.',
        category: 'collectibles',
        condition: 'used_good',
        images: [
          { url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800' },
        ],
        startingPrice: 4200000,
        minIncrement: 100000,
        currentPrice: 4900000,
        finalPrice: 4900000,
        minNextBid: 5000000,
        startsAt: new Date(now - 60 * 3600 * 1000),
        endsAt: new Date(now - 18 * 3600 * 1000),
        originalEndsAt: new Date(now - 18 * 3600 * 1000),
        status: 'completed',
        closedAt: new Date(now - 18 * 3600 * 1000),
        winnerId: buyers[2]!._id,
        bidCount: 5,
      },
      {
        sellerId: seller1._id,
        title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
        description: 'Complete set with case.',
        category: 'electronics',
        condition: 'like_new',
        images: [
          { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' },
        ],
        startingPrice: 2200000,
        minIncrement: 50000,
        currentPrice: 2650000,
        finalPrice: 2650000,
        minNextBid: 2700000,
        startsAt: new Date(now - 36 * 3600 * 1000),
        endsAt: new Date(now - 6 * 3600 * 1000),
        originalEndsAt: new Date(now - 6 * 3600 * 1000),
        status: 'completed',
        closedAt: new Date(now - 6 * 3600 * 1000),
        winnerId: buyers[3]!._id,
        bidCount: 4,
      },

      // Unsold Auctions (Reserve Unmet or 0 bids)
      {
        sellerId: seller3._id,
        title: 'Audemars Piguet Royal Oak Offshore Chronograph 42mm',
        description: 'Ended with reserve price unmet.',
        category: 'collectibles',
        condition: 'used_good',
        images: [
          { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800' },
        ],
        startingPrice: 180000000,
        reservePrice: 220000000,
        minIncrement: 1000000,
        currentPrice: 195000000,
        minNextBid: 196000000,
        startsAt: new Date(now - 48 * 3600 * 1000),
        endsAt: new Date(now - 8 * 3600 * 1000),
        originalEndsAt: new Date(now - 8 * 3600 * 1000),
        status: 'unsold',
        closedAt: new Date(now - 8 * 3600 * 1000),
        bidCount: 3,
      },
      {
        sellerId: seller2._id,
        title: 'Antique 1880 Victorian Silver Teapot Set',
        description: 'No bids received during auction window.',
        category: 'collectibles',
        condition: 'used_good',
        images: [
          { url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800' },
        ],
        startingPrice: 9500000,
        minIncrement: 200000,
        currentPrice: 9500000,
        minNextBid: 9500000,
        startsAt: new Date(now - 30 * 3600 * 1000),
        endsAt: new Date(now - 4 * 3600 * 1000),
        originalEndsAt: new Date(now - 4 * 3600 * 1000),
        status: 'unsold',
        closedAt: new Date(now - 4 * 3600 * 1000),
        bidCount: 0,
      },

      // Cancelled Auctions
      {
        sellerId: seller1._id,
        title: 'Custom Liquid-Cooled Gaming Rig Intel i9 / RTX 4090',
        description: 'Withdrawn by seller before commencement.',
        category: 'electronics',
        condition: 'new',
        images: [
          { url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800' },
        ],
        startingPrice: 32000000,
        minIncrement: 500000,
        currentPrice: 32000000,
        minNextBid: 32000000,
        startsAt: new Date(now - 12 * 3600 * 1000),
        endsAt: new Date(now + 12 * 3600 * 1000),
        originalEndsAt: new Date(now + 12 * 3600 * 1000),
        status: 'cancelled',
        closedAt: new Date(now - 10 * 3600 * 1000),
        bidCount: 0,
      },
      {
        sellerId: seller2._id,
        title: 'Rare First Edition Rabindranath Tagore Gitanjali (1912)',
        description: 'Auction cancelled due to archival verification.',
        category: 'collectibles',
        condition: 'used_good',
        images: [
          { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800' },
        ],
        startingPrice: 12500000,
        minIncrement: 250000,
        currentPrice: 12500000,
        minNextBid: 12500000,
        startsAt: new Date(now - 6 * 3600 * 1000),
        endsAt: new Date(now + 18 * 3600 * 1000),
        originalEndsAt: new Date(now + 18 * 3600 * 1000),
        status: 'cancelled',
        closedAt: new Date(now - 2 * 3600 * 1000),
        bidCount: 0,
      },
    ];

    for (const item of auctionsData) {
      await Auction.create({
        ...item,
        currency: 'INR',
        antiSnipe: {
          enabled: true,
          windowMs: 10000,
          extendMs: 30000,
          maxExtensions: 20,
        },
      });
    }

    logger.info({ totalAuctions: auctionsData.length }, 'Auctions seeded successfully!');
    logger.info('Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.fatal({ error }, 'Database seeding failed');
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

void runSeed();
