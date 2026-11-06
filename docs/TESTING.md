# TESTING.md

Tools: Vitest, Supertest, `socket.io-client`, Playwright (multi-window E2E), `autocannon` for load. Tests use DB `nilami_test` on the same replica set (transactions need it) and Redis DB index 1 with a `test` prefix. Reset collections between tests.

## 1. Pyramid
- **Unit:** money utils, bid-validation helpers, fraud rules, countdown math, state-machine transitions.
- **Integration:** REST via Supertest against real Mongo/Redis; webhook handler with signed payloads (`stripe.webhooks.generateTestHeaderString`).
- **Concurrency:** many parallel `POST /bid` calls.
- **Realtime:** socket.io-client against a booted server.
- **E2E:** Playwright with 3–4 browser contexts.

## 2. Mandatory scenarios

| # | Scenario | Expected |
|---|---|---|
| T1 | 2 users bid simultaneously (₹90k and ₹95k) | Final price is the max accepted; bids strictly increasing; loser gets `BID_TOO_LOW` or is outbid; no gaps in invariants |
| T2 | 50 parallel bids with random amounts | `currentPrice == max(bids.amount)`, `bidCount == bids.count`, no duplicate amounts |
| T3 | Bid below current/minimum | 409 `BID_TOO_LOW` with `minNextBid` |
| T4 | Bid below increment | 409 `BID_TOO_LOW` |
| T5 | Bid after `endsAt` (DB clock) | 409 `AUCTION_ENDED` even if client clock is wrong |
| T6 | Bid before `startsAt` | 409 `AUCTION_NOT_STARTED` |
| T7 | Seller bids on own auction | 403 `SELLER_CANNOT_BID` |
| T8 | Highest bidder re-bids | 409 `ALREADY_HIGHEST_BIDDER` |
| T9 | Same `idempotencyKey` sent 5× concurrently | One bid row, identical responses |
| T10 | Bid in last 10 s | `endsAt` +30 s, `extensionCount` +1; 21st extension doesn't extend |
| T11 | Close job runs twice concurrently | One winner, one payment row, one outbox event |
| T12 | Close job fires before extended `endsAt` | Re-delays, auction stays active |
| T13 | Kill worker before `endsAt`, restart after | Auction closes within one reconcile interval |
| T14 | Reserve not met | `unsold`, no payment row |
| T15 | No bids | `unsold` |
| T16 | Duplicate Stripe webhook | One payment transition, one notification |
| T17 | Webhook with bad signature | 400, no DB change |
| T18 | `payment_failed` after `succeeded` (out of order) | Stays `succeeded` |
| T19 | Webhook amount mismatch | Rejected, security log |
| T20 | Auto-charge needs authentication | Fallback notification with checkout link |
| T21 | Payment window expires | Payment `expired`, auction `payment_failed`, seller notified |
| T22 | Socket: two clients in room, one bid | Both receive `bid-updated` |
| T23 | Socket: previous leader gets `outbid-notification`, others don't | ✔ |
| T24 | Disconnect during bidding, reconnect | Snapshot current |
| T25 | Worker-emitted event reaches API sockets | ✔ via Redis emitter |
| T26 | IDOR: user B reads user A's payment | 403/404 |
| T27 | Refresh token reuse | Family revoked |
| T28 | Fraud rule: seller-linked bidder | Flag created, score ≥60 |
| T29 | Watch reminder after extension | Re-delayed, sent at correct time |
| T30 | Non-admin hits admin route | 403 |

## 3. Concurrency test skeleton
```ts
it('T2: 50 parallel bids keep invariants', async () => {
  const auction = await seedActiveAuction({ startingPrice: 1_000_000, minIncrement: 10_000 });
  const bidders = await seedVerifiedUsers(50);
  const amounts = bidders.map((_, i) => 1_000_000 + (i + 1) * 10_000);
  const results = await Promise.allSettled(bidders.map((b, i) =>
    api(b).post(`/auctions/${auction.id}/bid`).send({ amount: amounts[i], idempotencyKey: crypto.randomUUID() })));
  const bids = await Bid.find({ auctionId: auction.id }).sort({ createdAt: 1 });
  const a = await Auction.findById(auction.id);
  expect(a.currentPrice).toBe(Math.max(...bids.map(b => b.amount)));
  expect(a.bidCount).toBe(bids.length);
  expect(new Set(bids.map(b => b.amount)).size).toBe(bids.length);
  for (let i = 1; i < bids.length; i++) expect(bids[i].amount).toBeGreaterThan(bids[i - 1].amount);
});
```
Run the concurrency suite 20× in CI loop to catch flakiness (`for i in {1..20}; do npx vitest run concurrency; done`).

## 4. Load check (optional)
`npx autocannon -c 100 -d 15 -m POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -b '{"amount":...}' ...` — use unique idempotency keys via a script; report p95 and invariant check afterwards.

## 5. Chaos checks
1. `kill -9` API during bidding → restart; no corrupted state.
2. `redis-cli -p 6380 shutdown nosave` mid-auction → bids still work; restart Redis → jobs/sockets recover.
3. Stop worker for 2 min across `endsAt` → reconciler closes on boot.
4. Replay all Stripe events for an auction → no changes.

## 6. Recruiter demo script (≈3 minutes)
1. `npm run seed`, open 4 windows (2 normal, 1 incognito, 1 mobile viewport) on the same 10-minute auction.
2. Fire bids from all four at once → all windows converge on the same price; show outbid toast.
3. Bid in the last 10 s → "+30 s" extension shown everywhere.
4. Show Mailpit email for outbid.
5. In terminal: `kill -9` the worker, let the auction end, restart worker → auction closes.
6. Winner pays with `4242…` → `payment-success` appears live; replay webhook with `stripe events resend` → nothing changes.
7. Show admin fraud queue and seller analytics.

## 7. Quality gates
Coverage targets: bids/jobs/payments modules ≥ 85% lines; overall ≥ 70%. CI runs `npm run check` on every push (GitHub Actions with Mongo/Redis service via `apt`/setup actions — still no Docker locally).
