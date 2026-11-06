# DATABASE.md — MongoDB (replica set `rs0`, port 27018)

URI: `mongodb://127.0.0.1:27018/nilami?replicaSet=rs0`. Test DB: `nilami_test`. Transactions require the replica set; `scripts/infra-up.sh` initialises it.

All money fields are **integer paise**. All `_id` are ObjectId. All collections have `createdAt`/`updatedAt` (Mongoose timestamps) unless noted.

## users
| Field | Type | Notes |
|---|---|---|
| name | string | 2–60 chars |
| email | string | unique, lowercase |
| passwordHash | string | bcrypt cost 12 |
| roles | `('buyer'\|'seller'\|'admin')[]` | default `['buyer']` |
| emailVerifiedAt | Date? | required to bid/sell |
| status | `'active'\|'suspended'` | |
| stripeCustomerId | string? | created lazily |
| defaultPaymentMethodId | string? | saved via Checkout `mode: setup` |
| offSessionConsent | `{at, ip, textVersion}`? | required for auto-charge |
| ratingAvg / ratingCount | number | updated when review is created |
| stats | `{bidsPlaced, auctionsWon, auctionsSold}` | `$inc` counters |
Indexes: `{email:1}` unique.

## refresh_tokens
`userId, tokenHash, familyId, expiresAt, revokedAt?, replacedByHash?, ip, userAgent`. Indexes: `{tokenHash:1}` unique, `{expiresAt:1}` TTL (`expireAfterSeconds: 0`), `{familyId:1}`. Reuse of a revoked token revokes the entire family.

## auctions (most important)
| Field | Type | Notes |
|---|---|---|
| sellerId | ObjectId | |
| title, description | string | description rendered as plain text |
| category, condition | enum | |
| images | `{url, publicId?}[]` | 1–6 |
| currency | `'INR'` | |
| startingPrice | int | |
| reservePrice | int? | hidden from public API; expose `reserveMet` boolean |
| minIncrement | int | |
| currentPrice | int | = startingPrice until first bid |
| minNextBid | int | = startingPrice initially; = amount + minIncrement after each bid |
| highestBidderId | ObjectId? | |
| outbidUserId | ObjectId? | set by the last bid update (previous leader) |
| bidCount | int | |
| startsAt, endsAt | Date | `endsAt` moves with anti-sniping |
| originalEndsAt | Date | |
| extensionCount | int | |
| antiSnipe | `{enabled, windowMs, extendMs, maxExtensions}` | snapshotted at creation (defaults 10000/30000/20) |
| status | `scheduled\|active\|payment_pending\|completed\|payment_failed\|unsold\|cancelled` | |
| closedAt | Date? | |
| winnerId, finalPrice | ObjectId?, int? | set at close |
| paymentDueAt | Date? | |
| watchCount | int | |
| version | int | `$inc` on every write that matters (guard for close) |

Indexes:
- `{status:1, endsAt:1}` — reconciler and "ending soon".
- `{status:1, startsAt:1}`.
- `{sellerId:1, createdAt:-1}`.
- `{category:1, status:1, endsAt:1}`.
- text index on `{title, description}`.
- `{highestBidderId:1, status:1}`, `{winnerId:1}`.

## bids (accepted bids only)
`auctionId, bidderId, amount, idempotencyKey, extended (bool), ip, userAgentHash, createdAt`.
Indexes:
- `{auctionId:1, amount:-1}` **unique** — DB-level invariant: no two bids with the same amount on one auction.
- `{bidderId:1, idempotencyKey:1}` **unique** — retry protection.
- `{auctionId:1, createdAt:-1}`, `{bidderId:1, createdAt:-1}`.

## payments
| Field | Notes |
|---|---|
| auctionId | **unique** — one payment per auction |
| buyerId, sellerId | |
| amount, currency | amount = auction.finalPrice |
| status | `pending\|processing\|succeeded\|failed\|expired\|refunded` |
| method | `checkout\|off_session` |
| stripeCustomerId, stripeCheckoutSessionId, stripePaymentIntentId | sparse unique on the two Stripe IDs |
| attempts | `[{at, method, outcome, errorCode?}]` |
| dueAt, paidAt?, refundedAmount? | |

## stripe_events
`eventId` (unique), `type`, `status (processing|done|failed)`, `error?`, `receivedAt`, `processedAt?`. Insert-first idempotency: duplicate key ⇒ already handled.

## notifications
`userId, type, title, body, data{auctionId?, bidId?, paymentId?}, readAt?, dedupeKey? (unique sparse)`. Types: `OUTBID, WON, LOST, PAYMENT_DUE, PAYMENT_SUCCEEDED, PAYMENT_FAILED, AUCTION_ENDING, AUCTION_EXTENDED, SOLD, UNSOLD, WATCH_REMINDER, FRAUD_ALERT, REVIEW_RECEIVED`. Indexes `{userId:1, createdAt:-1}`, `{userId:1, readAt:1}`.

## watchlist
`userId, auctionId, remindMinutesBefore (default 15), remindedAt?`. Unique `{userId:1, auctionId:1}`; index `{auctionId:1}`.

## reviews
`auctionId, reviewerId (winner), sellerId, rating (1–5), comment?`. Unique `{auctionId:1, reviewerId:1}`. Allowed only when payment `succeeded`.

## fraud_flags
`type, score (0–100), subjectUserId, auctionId?, bidIds[], evidence{}, status (open|dismissed|confirmed), reviewedBy?, reviewedAt?`. Index `{status:1, score:-1}`.

## outbox
`type, payload, status (pending|done|failed), attempts, availableAt, lastError?`. Index `{status:1, availableAt:1}`. Written inside the same transaction as the state change.

## Invariants (tested)
1. `auction.currentPrice` equals the max `bids.amount` for that auction (or `startingPrice` when none).
2. `bids` for an auction have strictly increasing amounts in time order.
3. At most one `payments` row per auction; at most one `winnerId` set, only once.
4. `status ∈ {payment_pending, completed, payment_failed}` ⇒ `winnerId` and `finalPrice` set.
5. No bid exists with `createdAt` after the auction's final `endsAt`.
