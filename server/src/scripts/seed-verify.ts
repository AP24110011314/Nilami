import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../modules/users/user.model.js';
import { Auction } from '../modules/auctions/auction.model.js';
import { Bid } from '../modules/bids/bid.model.js';
import { Payment } from '../modules/payments/payment.model.js';
import { Review } from '../modules/reviews/review.model.js';
import { Watchlist } from '../modules/watchlist/watchlist.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { FraudFlag } from '../modules/fraud/fraud.model.js';

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
}

export async function verifySeed(): Promise<boolean> {
  console.log('--- Verifying Nilami Database Invariants & Seed Data ---');
  await connectDB();

  const results: CheckResult[] = [];

  try {
    // 1. Users Volume & Roles
    const totalUsers = await User.countDocuments();
    const admins = await User.countDocuments({ roles: 'admin' });
    const sellers = await User.countDocuments({ roles: 'seller', email: /^seller\d+@nilami\.local$/ });
    const buyers = await User.countDocuments({ roles: 'buyer', email: /^buyer\d+@nilami\.local$/ });

    results.push({
      name: 'Users Volume (1 admin, >=8 sellers, >=40 buyers)',
      passed: admins >= 1 && sellers >= 8 && buyers >= 40,
      details: `Total: ${totalUsers} (Admins: ${admins}, Sellers: ${sellers}, Buyers: ${buyers})`,
    });

    // 2. Auctions Volume & Categories
    const totalAuctions = await Auction.countDocuments();
    const categories = await Auction.distinct('category');
    results.push({
      name: 'Auctions Volume & Diversity (>=80 auctions, >=10 categories)',
      passed: totalAuctions >= 80 && categories.length >= 10,
      details: `Total Auctions: ${totalAuctions}, Categories: ${categories.length} (${categories.join(', ')})`,
    });

    // 3. State Mix
    const statusCounts = await Auction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusMap = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
    const hasLive = (statusMap['active'] || 0) >= 10;
    const hasScheduled = (statusMap['scheduled'] || 0) >= 5;
    const hasCompleted = (statusMap['completed'] || 0) >= 20;
    const hasPending = (statusMap['payment_pending'] || 0) >= 5;
    const hasFailed = (statusMap['payment_failed'] || 0) >= 3;
    const hasUnsold = (statusMap['unsold'] || 0) >= 5;

    results.push({
      name: 'Auction State Mix (Active, Scheduled, Completed, Pending, Failed, Unsold)',
      passed: hasLive && hasScheduled && hasCompleted && hasPending && hasFailed && hasUnsold,
      details: `Active: ${statusMap['active'] || 0}, Scheduled: ${statusMap['scheduled'] || 0}, Completed: ${statusMap['completed'] || 0}, Pending: ${statusMap['payment_pending'] || 0}, Failed: ${statusMap['payment_failed'] || 0}, Unsold: ${statusMap['unsold'] || 0}`,
    });

    // 4. Bids Volume
    const totalBids = await Bid.countDocuments();
    results.push({
      name: 'Bids Volume (>=400 bids)',
      passed: totalBids >= 400,
      details: `Total Bids Placed: ${totalBids}`,
    });

    // 5. Invariant 1: auction.currentPrice equals max bid amount (or startingPrice if none)
    const allAuctions = await Auction.find().lean();
    let invariant1Passed = true;
    let inv1Failure = '';

    for (const a of allAuctions) {
      const highestBid = await Bid.findOne({ auctionId: a._id }).sort({ amount: -1 }).lean();
      const expectedPrice = highestBid ? highestBid.amount : a.startingPrice;
      if (a.currentPrice !== expectedPrice) {
        invariant1Passed = false;
        inv1Failure = `Auction ${a._id} (${a.title}): currentPrice=${a.currentPrice} vs expected=${expectedPrice}`;
        break;
      }
    }
    results.push({
      name: 'Invariant 1: auction.currentPrice == max(bids.amount) || startingPrice',
      passed: invariant1Passed,
      details: invariant1Passed ? 'All auctions match max bid amount or startingPrice' : inv1Failure,
    });

    // 6. Invariant 2: bids for an auction have strictly increasing amounts in time order
    let invariant2Passed = true;
    let inv2Failure = '';

    for (const a of allAuctions) {
      const bids = await Bid.find({ auctionId: a._id }).sort({ createdAt: 1 }).lean();
      for (let i = 1; i < bids.length; i++) {
        if (bids[i]!.amount <= bids[i - 1]!.amount) {
          invariant2Passed = false;
          inv2Failure = `Auction ${a._id}: bid[${i}].amount (${bids[i]!.amount}) <= bid[${i - 1}].amount (${bids[i - 1]!.amount})`;
          break;
        }
        if (bids[i]!.createdAt.getTime() <= bids[i - 1]!.createdAt.getTime()) {
          invariant2Passed = false;
          inv2Failure = `Auction ${a._id}: bid[${i}].createdAt <= bid[${i - 1}].createdAt`;
          break;
        }
      }
      if (!invariant2Passed) break;
    }
    results.push({
      name: 'Invariant 2: Bids strictly increasing in amount and timestamp',
      passed: invariant2Passed,
      details: invariant2Passed ? 'All auction bid sequences strictly monotonically increase' : inv2Failure,
    });

    // 7. Invariant 3: At most one payments row per auction; at most one winnerId set
    const duplicatePayments = await Payment.aggregate([
      { $group: { _id: '$auctionId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]);
    const inv3Passed = duplicatePayments.length === 0;
    results.push({
      name: 'Invariant 3: At most one payments document per auction',
      passed: inv3Passed,
      details: inv3Passed ? 'Zero duplicate payments' : `${duplicatePayments.length} duplicates found`,
    });

    // 8. Invariant 4: status in {payment_pending, completed, payment_failed} => winnerId & finalPrice set
    let invariant4Passed = true;
    let inv4Failure = '';
    const wonAuctions = allAuctions.filter((a) =>
      ['payment_pending', 'completed', 'payment_failed'].includes(a.status),
    );
    for (const a of wonAuctions) {
      if (!a.winnerId || !a.finalPrice || a.finalPrice <= 0) {
        invariant4Passed = false;
        inv4Failure = `Auction ${a._id} (${a.status}): winnerId=${a.winnerId}, finalPrice=${a.finalPrice}`;
        break;
      }
    }
    results.push({
      name: 'Invariant 4: Won auctions have winnerId & finalPrice set',
      passed: invariant4Passed,
      details: invariant4Passed ? `All ${wonAuctions.length} won auctions have valid winnerId and positive finalPrice` : inv4Failure,
    });

    // 9. Invariant 5: No bid exists with createdAt after auction's final endsAt
    let invariant5Passed = true;
    let inv5Failure = '';
    for (const a of allAuctions) {
      if (a.closedAt) {
        const lateBid = await Bid.findOne({
          auctionId: a._id,
          createdAt: { $gt: a.endsAt },
        }).lean();
        if (lateBid) {
          invariant5Passed = false;
          inv5Failure = `Auction ${a._id}: bid ${lateBid._id} created at ${lateBid.createdAt.toISOString()} > endsAt ${a.endsAt.toISOString()}`;
          break;
        }
      }
    }
    results.push({
      name: 'Invariant 5: No bid exists with createdAt > endsAt',
      passed: invariant5Passed,
      details: invariant5Passed ? 'All bids were placed strictly within auction lifetime' : inv5Failure,
    });

    // 10. Secondary Entities (Payments, Reviews, Watchlist, Notifications, Fraud)
    const paymentsCount = await Payment.countDocuments();
    const reviewsCount = await Review.countDocuments();
    const watchlistCount = await Watchlist.countDocuments();
    const notificationsCount = await Notification.countDocuments();
    const fraudFlagsCount = await FraudFlag.countDocuments();

    results.push({
      name: 'Connected Marketplace Collections (Payments, Reviews, Watchlist, Notifications, Fraud)',
      passed:
        paymentsCount >= 30 &&
        reviewsCount >= 15 &&
        watchlistCount >= 30 &&
        notificationsCount >= 10 &&
        fraudFlagsCount >= 4,
      details: `Payments: ${paymentsCount}, Reviews: ${reviewsCount}, Watchlist: ${watchlistCount}, Notifications: ${notificationsCount}, Fraud Flags: ${fraudFlagsCount}`,
    });

    // Print Report
    console.log('\n================ INVARIANT VERIFICATION REPORT ================');
    let allPassed = true;
    for (const r of results) {
      const statusIcon = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`[${statusIcon}] ${r.name}`);
      console.log(`       → ${r.details}`);
      if (!r.passed) allPassed = false;
    }
    console.log('=================================================================\n');

    if (allPassed) {
      console.log('🎉 ALL DATABASE INVARIANTS SATISFIED & SEED VERIFIED!\n');
    } else {
      console.error('❌ SEED VERIFICATION FAILED: Invariants were violated.\n');
    }

    return allPassed;
  } finally {
    await disconnectDB();
  }
}

if (process.argv[1]?.endsWith('seed-verify.ts')) {
  verifySeed()
    .then((passed) => process.exit(passed ? 0 : 1))
    .catch((err) => {
      console.error('Verification error:', err);
      process.exit(1);
    });
}
