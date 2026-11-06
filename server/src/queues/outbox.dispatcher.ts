import { Outbox, type OutboxDocument } from '../modules/outbox/outbox.model.js';
import { Auction } from '../modules/auctions/auction.model.js';
import { User } from '../modules/users/user.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { paymentsQueue } from './queues.js';
import {
  emitAuctionEnded,
  emitNotification,
  maskName,
} from '../realtime/events.js';
import { formatINR } from '../lib/money.js';
import { logger } from '../config/logger.js';

export async function processOutboxBatch(batchSize = 10): Promise<number> {
  let processedCount = 0;

  for (let i = 0; i < batchSize; i++) {
    const now = new Date();

    // Atomically claim one pending event
    const event = await Outbox.findOneAndUpdate(
      {
        status: { $in: ['pending', 'failed'] },
        attempts: { $lt: 10 },
        availableAt: { $lte: now },
        $or: [
          { lockedUntil: null },
          { lockedUntil: { $lte: now } },
        ],
      },
      {
        $set: {
          status: 'processing',
          lockedUntil: new Date(now.getTime() + 30000), // 30s lease
        },
        $inc: { attempts: 1 },
      },
      { new: true },
    );

    if (!event) {
      break; // No more pending outbox events
    }

    try {
      await handleOutboxEvent(event);

      await Outbox.updateOne(
        { _id: event._id },
        {
          $set: {
            status: 'done',
            lockedUntil: null,
            lastError: null,
          },
        },
      );
      processedCount++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.error({ err, outboxId: event._id, type: event.type }, 'Error processing outbox event');

      const nextAttempt = event.attempts;
      const backoffMs = Math.min(300000, 2000 * Math.pow(2, nextAttempt - 1));

      await Outbox.updateOne(
        { _id: event._id },
        {
          $set: {
            status: nextAttempt >= 10 ? 'failed' : 'pending',
            lockedUntil: null,
            availableAt: new Date(Date.now() + backoffMs),
            lastError: errorMsg,
          },
        },
      );
    }
  }

  return processedCount;
}

async function handleOutboxEvent(event: OutboxDocument): Promise<void> {
  const auctionId = String(event.payload.auctionId);
  const serverTime = new Date().toISOString();

  switch (event.type) {
    case 'auction.won': {
      const auction = await Auction.findById(auctionId);
      if (!auction || !auction.winnerId) return;

      const winner = await User.findById(auction.winnerId);
      const winnerMasked = maskName(winner?.name);

      // 1. Emit auction-ended to auction room
      emitAuctionEnded({
        auctionId,
        status: 'sold',
        winnerMasked,
        finalPrice: auction.finalPrice ?? auction.currentPrice,
        serverTime,
      });

      // 2. Persist & emit WON notification to buyer
      const buyerNotif = await Notification.findOneAndUpdate(
        { dedupeKey: `won_${auctionId}` },
        {
          $setOnInsert: {
            userId: auction.winnerId,
            type: 'WON',
            title: 'Congratulations! You won the auction',
            body: `You placed the winning bid of ${formatINR(auction.finalPrice ?? auction.currentPrice)} on "${auction.title}". Please complete payment.`,
            data: { auctionId: auction._id },
            dedupeKey: `won_${auctionId}`,
          },
        },
        { upsert: true, new: true },
      );

      if (buyerNotif) {
        emitNotification(auction.winnerId.toString(), {
          _id: buyerNotif._id.toString(),
          userId: buyerNotif.userId.toString(),
          type: buyerNotif.type,
          title: buyerNotif.title,
          message: buyerNotif.body,
          data: buyerNotif.data as Record<string, unknown>,
          read: Boolean(buyerNotif.readAt),
          createdAt: buyerNotif.createdAt.toISOString(),
        });
      }

      // 3. Persist & emit SOLD notification to seller
      const sellerNotif = await Notification.findOneAndUpdate(
        { dedupeKey: `sold_${auctionId}` },
        {
          $setOnInsert: {
            userId: auction.sellerId,
            type: 'SOLD',
            title: 'Your item has been sold!',
            body: `Your auction for "${auction.title}" ended with a winning bid of ${formatINR(auction.finalPrice ?? auction.currentPrice)}.`,
            data: { auctionId: auction._id },
            dedupeKey: `sold_${auctionId}`,
          },
        },
        { upsert: true, new: true },
      );

      if (sellerNotif) {
        emitNotification(auction.sellerId.toString(), {
          _id: sellerNotif._id.toString(),
          userId: sellerNotif.userId.toString(),
          type: sellerNotif.type,
          title: sellerNotif.title,
          message: sellerNotif.body,
          data: sellerNotif.data as Record<string, unknown>,
          read: Boolean(sellerNotif.readAt),
          createdAt: sellerNotif.createdAt.toISOString(),
        });
      }

      // 4. Enqueue payment-expiry job in paymentsQueue (Job ID without colons!)
      if (auction.paymentDueAt) {
        const paymentDueDelay = Math.max(0, auction.paymentDueAt.getTime() - Date.now());
        await paymentsQueue.add(
          'payment-expiry',
          { auctionId },
          { jobId: `payexp_${auctionId}`, delay: paymentDueDelay },
        );
      }
      break;
    }

    case 'auction.unsold': {
      const auction = await Auction.findById(auctionId);
      if (!auction) return;

      // 1. Emit auction-ended to auction room
      emitAuctionEnded({
        auctionId,
        status: 'unsold',
        serverTime,
      });

      // 2. Persist & emit UNSOLD notification to seller
      const sellerNotif = await Notification.findOneAndUpdate(
        { dedupeKey: `unsold_${auctionId}` },
        {
          $setOnInsert: {
            userId: auction.sellerId,
            type: 'UNSOLD',
            title: 'Auction ended unsold',
            body: `Your auction for "${auction.title}" ended without meeting the reserve price or receiving qualifying bids.`,
            data: { auctionId: auction._id },
            dedupeKey: `unsold_${auctionId}`,
          },
        },
        { upsert: true, new: true },
      );

      if (sellerNotif) {
        emitNotification(auction.sellerId.toString(), {
          _id: sellerNotif._id.toString(),
          userId: sellerNotif.userId.toString(),
          type: sellerNotif.type,
          title: sellerNotif.title,
          message: sellerNotif.body,
          data: sellerNotif.data as Record<string, unknown>,
          read: Boolean(sellerNotif.readAt),
          createdAt: sellerNotif.createdAt.toISOString(),
        });
      }
      break;
    }

    default:
      logger.warn({ type: event.type, outboxId: event._id }, 'Unknown outbox event type');
  }
}
