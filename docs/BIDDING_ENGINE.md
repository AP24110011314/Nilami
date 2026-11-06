# BIDDING_ENGINE.md

The heart of the project. Everything here must be covered by the concurrency tests in `TESTING.md`.

## 1. Principles
1. One **conditional atomic update** on the auction document decides who wins a race. The filter *is* the validation.
2. The auction update and the bid insert happen in **one transaction**.
3. Time comes from MongoDB (`$$NOW`), not from the app server.
4. Retries are safe via an idempotency key.
5. Sockets are emitted **after commit**.

## 2. Request

`POST /api/auctions/:id/bid` body `{ amount: number /* paise */, idempotencyKey: string /* uuid from client, new per user intent */ }`.

## 3. Algorithm (reference implementation)

```ts
const SNIPE_FALLBACK = { enabled: true, windowMs: 10_000, extendMs: 30_000, maxExtensions: 20 };

export async function placeBid(i: {
  auctionId: ObjectId; bidderId: ObjectId; amount: number;
  idempotencyKey: string; ip: string; userAgentHash: string;
}) {
  // 0. Idempotent replay
  const prior = await Bid.findOne({ bidderId: i.bidderId, idempotencyKey: i.idempotencyKey });
  if (prior) return { replayed: true, auction: await getAuctionSnapshot(prior.auctionId), bid: prior };

  const session = await mongoose.startSession();
  try {
    let committed: { auction: AuctionDoc; bid: BidDoc } | null = null;

    await session.withTransaction(async () => {
      committed = null; // withTransaction may retry the callback

      // 1. Atomic conditional update (pipeline form so we can use $$NOW and compute extension)
      const auction = await Auction.findOneAndUpdate(
        {
          _id: i.auctionId,
          status: { $in: ['scheduled', 'active'] },
          sellerId: { $ne: i.bidderId },
          highestBidderId: { $ne: i.bidderId },
          $expr: { $and: [
            { $lte: ['$startsAt', '$$NOW'] },
            { $gt:  ['$endsAt',   '$$NOW'] },
            { $lte: ['$minNextBid', i.amount] },
          ] },
        },
        [
          { $set: {
              outbidUserId: '$highestBidderId',
              _snipe: { $and: [
                '$antiSnipe.enabled',
                { $lte: [{ $subtract: ['$endsAt', '$$NOW'] }, '$antiSnipe.windowMs'] },
                { $lt: ['$extensionCount', '$antiSnipe.maxExtensions'] },
              ] },
          } },
          { $set: {
              endsAt: { $cond: ['$_snipe', { $add: ['$endsAt', '$antiSnipe.extendMs'] }, '$endsAt'] },
              extensionCount: { $cond: ['$_snipe', { $add: ['$extensionCount', 1] }, '$extensionCount'] },
              currentPrice: i.amount,
              minNextBid: { $add: [i.amount, '$minIncrement'] },
              highestBidderId: { $literal: i.bidderId },
              bidCount: { $add: ['$bidCount', 1] },
              version: { $add: ['$version', 1] },
              status: 'active',
              updatedAt: '$$NOW',
          } },
          { $unset: '_snipe' },
        ],
        { new: true, session },
      );

      if (!auction) return; // rejected; diagnose after the transaction

      // 2. Record the bid (unique indexes guard amount + idempotency)
      const [bid] = await Bid.create([{
        auctionId: i.auctionId, bidderId: i.bidderId, amount: i.amount,
        idempotencyKey: i.idempotencyKey,
        extended: auction.extensionCount > 0 && /* compare with pre-state if needed */ undefined,
        ip: i.ip, userAgentHash: i.userAgentHash,
      }], { session });

      // 3. Persist outbid notification (delivery is best-effort after commit)
      if (auction.outbidUserId) {
        await Notification.create([{
          userId: auction.outbidUserId, type: 'OUTBID',
          title: 'You have been outbid', body: `New highest bid ${formatINR(i.amount)}`,
          data: { auctionId: i.auctionId, bidId: bid._id },
          dedupeKey: `outbid_${bid._id}`,
        }], { session });
      }
      committed = { auction, bid };
    });

    if (!committed) throw await diagnoseRejection(i.auctionId, i.bidderId, i.amount);

    // 4. After commit: realtime + async side effects (never inside the transaction)
    await publishBidAccepted(committed);          // io.to(`auction:${id}`).emit('bid-updated', ...)
    await enqueueBidSideEffects(committed);       // outbid email, fraud evaluation, extension reschedule
    return { replayed: false, ...committed };
  } finally {
    await session.endSession();
  }
}
```

Notes for the implementer:
- Mongoose may not auto-cast pipeline updates or apply timestamps; if casting is problematic use `Auction.collection.findOneAndUpdate` (native driver) with `{ returnDocument: 'after', session }` and convert ObjectIds yourself. Always set `updatedAt` explicitly in the pipeline.
- Track whether this bid extended the auction by returning `extensionCount` before/after (read it in the same transaction before the update, or store `lastBidExtended` in the pipeline). Persist it as `bids.extended`.
- If the transaction callback throws a duplicate-key error on `bids`, map it: idempotency key duplicate ⇒ replay; `{auctionId, amount}` duplicate ⇒ `BID_TOO_LOW`.
- Do not wrap `findOne` pre-checks around the update to "optimise" — the filter already validates everything.

## 4. Diagnosing a rejection

After the transaction (outside it), read the auction once and return the first matching code:

| Order | Condition | HTTP | Code |
|---|---|---|---|
| 1 | not found | 404 | `AUCTION_NOT_FOUND` |
| 2 | status cancelled/unsold/closed or `endsAt <= now` | 409 | `AUCTION_ENDED` |
| 3 | `startsAt > now` | 409 | `AUCTION_NOT_STARTED` |
| 4 | `sellerId == bidder` | 403 | `SELLER_CANNOT_BID` |
| 5 | `highestBidderId == bidder` | 409 | `ALREADY_HIGHEST_BIDDER` |
| 6 | `amount < minNextBid` | 409 | `BID_TOO_LOW` with `{ currentPrice, minNextBid }` |
| 7 | otherwise (a race was lost) | 409 | `OUTBID_DURING_REQUEST` with fresh snapshot |

Pre-checks before the transaction (cheap, return early): unverified email (403 `EMAIL_NOT_VERIFIED`), suspended user (403), rate limit (429), invalid body (400), amount not a safe integer.

## 5. Anti-sniping

- Trigger: accepted bid when `endsAt − $$NOW ≤ windowMs` and `extensionCount < maxExtensions`.
- Effect: `endsAt += extendMs` inside the same atomic update; `extensionCount++`.
- Emit `auction-extended { auctionId, endsAt, extensionCount }` and persist an `AUCTION_EXTENDED` notification for watchers/bidders (batch via job).
- The close job may already be scheduled for the old time. It fires, sees `endsAt > now`, and **re-delays itself** (see `BACKGROUND_JOBS.md`). Optionally best-effort `changeDelay` on the existing job.

## 6. Concurrency reasoning (for interviews)

Two bids A=₹90,000 and B=₹95,000 hit simultaneously with `minNextBid=₹89,000`:
- Both enter transactions; both attempt to write the same auction document. MongoDB serialises writers; the loser gets a write conflict and `withTransaction` retries it.
- If B wins first: `minNextBid` becomes ₹96,000. A's retry now fails the filter (`minNextBid <= 90,000` false) → `BID_TOO_LOW` with the fresh minimum.
- If A wins first: B's retry passes (`95,000 ≥ 91,000`) and becomes the leader; A receives an outbid notification.
- Either order, final state is consistent and the bids collection holds strictly increasing amounts.

## 7. Idempotency

Client generates `idempotencyKey = crypto.randomUUID()` when the user clicks Bid and reuses it on network retries. Unique index `{bidderId, idempotencyKey}` makes the second insert fail; the handler returns the original result.

## 8. Performance notes
- Keep the transaction short: one update, two inserts.
- Do not run analytics or email inside it.
- Retry limit: let driver defaults handle transient errors (up to 120 s); set `maxCommitTimeMS` ≈ 2000 and respond `503 RETRY_LATER` on timeout.
