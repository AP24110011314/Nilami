import crypto from 'node:crypto';
import { connectDB, disconnectDB } from '../config/db.js';
import { Auction } from '../modules/auctions/auction.model.js';
import { User } from '../modules/users/user.model.js';
import { FraudFlag } from '../modules/fraud/fraud.model.js';
import { BidService } from '../modules/bids/bid.service.js';

let isRunning = true;

process.on('SIGINT', () => {
  console.log('\n[BOT ENGINE] Received SIGINT (Ctrl+C). Gracefully shutting down bidding bots...');
  isRunning = false;
});

process.on('SIGTERM', () => {
  console.log('\n[BOT ENGINE] Received SIGTERM. Gracefully shutting down bidding bots...');
  isRunning = false;
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runBiddingBots() {
  console.log('--- Starting Nilami Live Bidding Bot Simulation Engine ---');
  console.log('Press Ctrl+C at any time to safely stop simulated bidders.\n');

  await connectDB();

  try {
    const buyers = await User.find({ email: /^buyer\d+@nilami\.local$/ }).lean();
    if (buyers.length === 0) {
      console.error('No seed buyers found! Please run `npm run seed` first.');
      return;
    }

    // Exclude users with open fraud flags
    const flaggedUserIds = await FraudFlag.distinct('subjectUserId', { status: 'open' });
    const flaggedSet = new Set(flaggedUserIds.map((id) => id.toString()));

    const eligiblePool = buyers.filter((b) => !flaggedSet.has(b._id.toString()));
    console.log(`Loaded ${buyers.length} buyers (${eligiblePool.length} unflagged for bidding).`);

    let bidCount = 0;
    const botUserAgentHash = crypto.createHash('sha256').update('Nilami-Bot-Simulator/1.0').digest('hex');

    while (isRunning) {
      // Find currently active auctions ending in the future
      const activeAuctions = await Auction.find({
        status: 'active',
        endsAt: { $gt: new Date() },
      }).lean();

      if (activeAuctions.length === 0) {
        console.log('[BOT ENGINE] No active live auctions found. Waiting 5s...');
        await sleep(5000);
        continue;
      }

      // Pick random active auction
      const auction = activeAuctions[Math.floor(Math.random() * activeAuctions.length)]!;

      // Filter eligible buyers (not the seller and not already the highest bidder)
      const eligibleBuyers = eligiblePool.filter(
        (b) =>
          b._id.toString() !== auction.sellerId.toString() &&
          (!auction.highestBidderId || b._id.toString() !== auction.highestBidderId.toString()),
      );

      if (eligibleBuyers.length === 0) {
        await sleep(2000);
        continue;
      }

      const buyer = eligibleBuyers[Math.floor(Math.random() * eligibleBuyers.length)]!;

      // Calculate next bid amount (either 1x or 2x minIncrement)
      const incrementMultiplier = Math.random() > 0.8 ? 2 : 1;
      const bidAmount = auction.currentPrice + auction.minIncrement * incrementMultiplier;
      const idempotencyKey = `bot_${auction._id.toString()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      try {
        const result = await BidService.placeBid({
          auctionId: auction._id.toString(),
          bidderId: buyer._id.toString(),
          amount: bidAmount,
          idempotencyKey,
          ip: `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
          userAgentHash: botUserAgentHash,
        });

        bidCount++;
        const inrPrice = (bidAmount / 100).toLocaleString('en-IN');
        const inrInc = ((auction.minIncrement * incrementMultiplier) / 100).toLocaleString('en-IN');

        console.log(
          `[BOT #${bidCount}] 🔨 ${buyer.name} placed bid ₹${inrPrice} (+₹${inrInc}) on "${auction.title.slice(0, 36)}..."`,
        );

        if (result.auction.extensionCount > 0) {
          console.log(`       ⚡ ANTI-SNIPE ACTIVE: Auction extended by +30 seconds! (extensions: ${result.auction.extensionCount})`);
        }
      } catch (err: unknown) {
        const errorObj = err as { code?: string; message?: string };
        // Silently skip if auction closed or race condition occurred
        if (errorObj?.code !== 'AUCTION_NOT_ACTIVE' && errorObj?.code !== 'OUTBID_ALREADY') {
          console.warn(`[BOT NOTICE] ${errorObj?.message || String(err)}`);
        }
      }

      // Jitter delay between 2500ms and 4500ms
      const delay = Math.floor(Math.random() * 2000) + 2500;
      await sleep(delay);
    }
  } finally {
    await disconnectDB();
    console.log('[BOT ENGINE] Cleanly disconnected from MongoDB. Bots stopped.');
  }
}

if (process.argv[1]?.endsWith('seed-bots.ts')) {
  runBiddingBots()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal bot error:', err);
      process.exit(1);
    });
}
