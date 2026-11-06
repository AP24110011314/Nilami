# INTERVIEW_GUIDE.md — Explaining Nilami

Thirty-second pitch: "A live auction platform where concurrent bids are resolved by a single atomic MongoDB update inside a transaction, the server is the only clock, auctions close through BullMQ with a reconciliation safety net, and payments are confirmed only by verified Stripe webhooks."

## Core questions

1. **How do you prevent race conditions when users bid simultaneously?**
   Validation lives inside the update filter (`minNextBid <= amount`, status, time via `$$NOW`, not-seller, not-already-leader). MongoDB serialises writers on the auction document; the loser retries and fails the new condition. Unique indexes `{auctionId, amount}` and `{bidderId, idempotencyKey}` back this at the database level.
2. **Why is the atomic update better than read-then-save?** Read-then-save has a gap between read and write where another bid can land; the second write overwrites based on stale state. The conditional update removes the gap.
3. **Why should the backend control the countdown?** Browser clocks are wrong and manipulable. We ship `endsAt` + `serverTime`; the client displays, the database decides with `$$NOW`.
4. **Why BullMQ instead of `setTimeout`?** Timers vanish on restart, don't coordinate across instances, and drift. BullMQ persists delayed jobs in Redis with retries; the reconciler guarantees closure even if Redis jobs are lost.
5. **How does Socket.IO broadcast to many users?** Each auction is a room; after the transaction commits we emit to `auction:<id>`; the Redis adapter fans out across instances; workers use the Redis emitter.
6. **What if the worker crashes?** Auctions can't accept late bids (DB clock). On restart the reconcile job closes expired auctions; `closeAuction` is idempotent via a version guard and a unique payment index.
7. **How do you prevent duplicate payments?** Unique `payments.auctionId`, Stripe idempotency keys, `stripe_events` insert-first dedupe, and state-machine guards (`status != succeeded`).
8. **Why do webhooks decide payment success?** The redirect can be forged, skipped or interrupted; the signed webhook is Stripe's authoritative statement and arrives even if the user closes the tab.

## Follow-ups to prepare
- Anti-sniping with already-scheduled close jobs → the job re-checks `endsAt` and re-delays.
- Why integer paise → exactness, matches Stripe's smallest unit.
- Transactions vs Redis locks → one source of truth; fewer failure modes.
- Outbox pattern → state change and event are committed atomically; dispatcher retries.
- Scaling → Redis adapter, stateless API, workers scale independently, hot-auction contention bounded by single-document writes (explain limits honestly).
- Auto-charge in India → RBI e-mandate rules and the ₹15,000 threshold make fallback essential.
- What you would do next: Stripe Connect payouts, proxy bidding, sharded Socket.IO adapter, OpenTelemetry tracing.

## Numbers to measure and quote
Bids/second sustained on one auction, p95 bid latency, event fan-out latency to 4/50 clients, time-to-close after `endsAt`, time-to-recover after killing the worker. Record them in the README after Phase 9.
