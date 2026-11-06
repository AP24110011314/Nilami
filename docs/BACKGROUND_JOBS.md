# BACKGROUND_JOBS.md — Redis + BullMQ

Redis: `redis://127.0.0.1:6380`, started with `--maxmemory-policy noeviction` (BullMQ requires it; evicting keys corrupts queues). Use a shared ioredis config with `maxRetriesPerRequest: null`. Queue prefix: `nilami`.

## 1. Queues and jobs

| Queue | Job name | Job ID | Trigger | Purpose |
|---|---|---|---|---|
| `auction` | `activate` | `activate_<auctionId>` | create (delay to `startsAt`) | Flip `scheduled → active`, broadcast start |
| `auction` | `ending-soon` | `ending_<auctionId>` | create (delay to `endsAt − 60s`) | Broadcast `auction-ending`; re-checks `endsAt` |
| `auction` | `close` | `close_<auctionId>` | create (delay to `endsAt`) | Close auction, pick winner |
| `auction` | `watch-reminder` | `remind_<auctionId>_<userId>` | watch (delay to `endsAt − N min`) | Reminder notification; re-checks `endsAt` |
| `maintenance` | `reconcile` | scheduler `reconcile` | every 30 s (`upsertJobScheduler`) | Safety net (§4) |
| `maintenance` | `outbox-dispatch` | scheduler `outbox` | every 5 s | Deliver outbox events (§5) |
| `payments` | `autocharge` | `autocharge_<auctionId>` | outbox `auction.won` | Off-session PaymentIntent |
| `payments` | `payment-expiry` | `payexp_<auctionId>` | outbox `auction.won` (delay to `paymentDueAt`) | Mark unpaid as failed |
| `notifications` | `email` | `<dedupeKey>` | notifications created | Send email via SMTP |
| `fraud` | `evaluate-bid` | `fraud_<bidId>` | accepted bid | Run fraud rules |

Never use `:` in job IDs. Default job options: `attempts: 5`, `backoff: {type:'exponential', delay: 2000}`, `removeOnComplete: {age: 3600, count: 1000}`, `removeOnFail: {age: 7*24*3600}`.

## 2. Scheduling at creation

```ts
const delay = (d: Date) => Math.max(0, d.getTime() - Date.now());
await auctionQueue.add('activate', { auctionId }, { jobId: `activate_${id}`, delay: delay(startsAt) });
await auctionQueue.add('close',    { auctionId }, { jobId: `close_${id}`,    delay: delay(endsAt) });
await auctionQueue.add('ending-soon', { auctionId }, { jobId: `ending_${id}`, delay: delay(new Date(+endsAt - 60_000)) });
```
Use `Date.now()` here only to compute a *scheduling delay*; correctness never depends on it because workers re-check against the DB clock.

If enqueueing fails after the auction is saved, log and rely on the reconciler (the auction is still valid).

## 3. `closeAuction(auctionId)` — idempotent

```ts
export async function closeAuction(auctionId: string) {
  const session = await mongoose.startSession();
  try {
    let result: 'closed' | 'noop' | { reschedule: number } = 'noop';
    await session.withTransaction(async () => {
      const [{ now }] = await Auction.aggregate([{ $match: { _id: oid(auctionId) } },
        { $project: { now: '$$NOW', endsAt: 1, status: 1 } }], { session }); // DB clock + doc
      const a = await Auction.findById(auctionId).session(session);
      if (!a || !['scheduled', 'active'].includes(a.status)) { result = 'noop'; return; }
      if (a.endsAt > now) { result = { reschedule: +a.endsAt - +now }; return; } // anti-sniping extended it

      const sold = a.bidCount > 0 && a.currentPrice >= (a.reservePrice ?? 0);
      const paymentDueAt = new Date(+now + env.PAYMENT_WINDOW_MINUTES * 60_000);

      const upd = await Auction.updateOne(
        { _id: a._id, status: { $in: ['scheduled', 'active'] }, version: a.version }, // guard
        { $set: sold
            ? { status: 'payment_pending', winnerId: a.highestBidderId, finalPrice: a.currentPrice, paymentDueAt, closedAt: now }
            : { status: 'unsold', closedAt: now },
          $inc: { version: 1 } },
        { session });
      if (upd.modifiedCount !== 1) throw new TransientTransactionRetry(); // a bid slipped in; retry

      if (sold) {
        await Payment.create([{ auctionId: a._id, buyerId: a.highestBidderId, sellerId: a.sellerId,
          amount: a.currentPrice, currency: 'INR', status: 'pending', dueAt: paymentDueAt }], { session });
      }
      await Outbox.create([{ type: sold ? 'auction.won' : 'auction.unsold', payload: { auctionId }, status: 'pending', availableAt: now }], { session });
      result = 'closed';
    });
    if (typeof result === 'object') await auctionQueue.add('close', { auctionId }, { jobId: `close_${auctionId}_r${Date.now()}`, delay: result.reschedule + 250 });
    return result;
  } finally { await session.endSession(); }
}
```
(Simplify the DB-clock retrieval if you prefer: a single `findOneAndUpdate` with `$expr: {$lte:['$endsAt','$$NOW']}` as the claim is equally valid. The requirement is: **DB clock, version guard, one payment row, outbox in the same transaction.**)

Why the unique `payments.auctionId` index matters: even if two workers somehow race, the second `Payment.create` throws duplicate key, the whole transaction aborts, and nothing is duplicated.

## 4. Reconciliation worker (every 30 s)

1. **Expired but open:** `Auction.find({ status: {$in:['scheduled','active']}, $expr:{$lte:['$endsAt', {$subtract:['$$NOW', 2000]}]} })` → call `closeAuction` for each (or enqueue).
2. **Not yet activated:** `scheduled` with `startsAt <= $$NOW` → set `active`.
3. **Overdue payments:** `payment_pending` with `paymentDueAt <= $$NOW` and payment not `succeeded/processing` → run payment expiry.
4. **Missing jobs:** for auctions ending within the next 10 min, ensure `close_<id>` exists (`queue.getJob`); add if missing.
5. **Stuck outbox:** `pending` older than 1 minute → re-dispatch; `failed` with attempts < 10 → retry.
6. Log counts per run (metrics for the demo).

On worker boot, run `reconcile` once immediately so a crash/deploy recovers right away.

## 5. Outbox dispatcher

Events are written in the same transaction as the state change. The dispatcher:
1. Atomically claims a batch (`findOneAndUpdate` status `pending → processing` with `lockedUntil`).
2. Handles each event type:
   - `auction.won` → notifications (WON to buyer, SOLD to seller), emit `auction-ended` to the auction room, enqueue emails, enqueue `autocharge` (if eligible) and `payment-expiry` (delay to `paymentDueAt`).
   - `auction.unsold` → notify seller (UNSOLD) and bidders (LOST/none), emit `auction-ended`.
   - `payment.succeeded` / `payment.failed` → notifications, emit `payment-success`, update stats.
3. Marks `done`; on error increment `attempts` and back off via `availableAt`.
Handlers must be idempotent (use `dedupeKey` on notifications).

## 6. Worker emit path

Worker has no Socket.IO server. Use the Redis emitter:
```ts
import { Emitter } from '@socket.io/redis-emitter';
export const emitter = new Emitter(redisPub);
emitter.to(`auction:${id}`).emit('auction-ended', payload);
emitter.to(`user:${userId}`).emit('notification', payload);
```
The API process uses `@socket.io/redis-adapter` with the same Redis so rooms span instances.

## 7. Operations
- Graceful shutdown: on `SIGTERM`/`SIGINT`, `await worker.close()` for every worker, then close queues, Redis, Mongo.
- Concurrency: `close` 10, `email` 5, `payments` 5, `maintenance` 1.
- Stalled jobs are retried by BullMQ; handlers' idempotency makes that safe.
- Optional dev dashboard: `bull-board` mounted on `/admin/queues` behind admin auth (not in prod unless protected).
- Kill test: `kill -9` the worker during an active auction, restart after `endsAt`; the auction must close within one reconcile interval.
