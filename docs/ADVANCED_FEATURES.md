# ADVANCED_FEATURES.md

## 1. Anti-sniping
Implemented in the bid update (`BIDDING_ENGINE.md` §5). UI: a banner "Auction extended +30 s" with a short animation; extension counter on the detail page. Config: global defaults in env, snapshotted per auction.

## 2. Auction analytics

Computed with aggregation pipelines over `bids` and `auctions`; cache results in Redis for 15–30 s.

| Metric | Source |
|---|---|
| Unique bidders | `$group` by `bidderId` count on `bids` |
| Price progression | bids sorted by time → `[ {t, amount} ]` line chart |
| Bid frequency | `$dateTrunc` per minute (or per 10 s for short auctions) → bar chart |
| Extension count / sniping heat | `auctions.extensionCount`, `bids.extended` |
| Final / starting price ratio | closed auctions |
| Sell-through rate | `(payment_pending + completed) / closed` per seller |
| Revenue | sum of `payments.amount` where `succeeded`, per day |
| Trending | score = `bidsLast24h*3 + watchCount*2 + viewers` |
| Admin | GMV, bids/min, active auctions, open fraud flags, payment failure rate |

Frontend: Recharts `LineChart`, `BarChart`, `AreaChart`; seller dashboard and a public mini-chart on each auction page.

## 3. Watchlist and reminders
- Watch/unwatch toggles; `watchCount` maintained with `$inc` in the same transaction as the watchlist write.
- Reminder job `remind_<auctionId>_<userId>` at `endsAt − remindMinutesBefore`. The job re-checks `endsAt` (anti-sniping) and whether the user still watches; if the auction was extended it re-delays.
- Also notify watchers on `AUCTION_EXTENDED` (throttled to once per 5 min) and on start.
- Delivery: persisted notification + socket + email.

## 4. Fraud detection (rule-based, explainable)

Runs asynchronously in the `fraud` queue after each accepted bid, and nightly for pattern rules. Produces `fraud_flags` with a score. Rules (tune thresholds in `fraud/rules.ts`):

| Rule | Signal | Score |
|---|---|---|
| `SELLER_LINKED_BIDDER` | Bidder shares IP or `userAgentHash` with the seller within 30 days | 60 |
| `SHILL_PATTERN` | ≥3 auctions from the same seller where the same bidder is the top non-winning bidder and bumps price ≥3 times | 70 |
| `BID_BURST` | >10 bids by one user on one auction in 60 s | 40 |
| `PING_PONG` | Two accounts alternate ≥6 consecutive bids | 65 |
| `LAST_SECOND_SNIPER` | >80% of a user's bids land inside the anti-snipe window (min 10 bids) | 25 |
| `PAYMENT_ABANDONER` | ≥2 `payment_failed` as winner in 30 days | 50 |
| `MULTI_ACCOUNT_IP` | ≥3 accounts from one IP bidding on the same auction | 55 |
| `NEW_ACCOUNT_HIGH_BID` | Account <1 h old bids >₹50,000 | 30 |

Actions by cumulative score per user per auction: <40 log only; 40–69 open flag + admin alert (`fraud-alert` socket); ≥70 flag + temporarily block further bids by that user pending review. Admin queue shows evidence (bid IDs, IPs hashed, timeline) with Dismiss / Confirm (confirm → suspend user, cancel affected auctions). Always provide an appeal note field. Never auto-ban on a single rule.

Privacy: store hashed IP (HMAC with server secret) for correlation, raw IP only in short-retention logs.

## 5. Seller ratings and reputation
- After `payment.succeeded`, winner may review once (`reviews` unique per auction).
- On review create, transactionally update seller `ratingAvg`/`ratingCount` (`ratingAvg = (ratingAvg*count + new)/(count+1)`).
- Reputation badge tiers (computed): New (<3 sales), Trusted (≥10 sales and ≥4.5 avg), Top Seller (≥50 sales and ≥4.7 avg). "Verified seller" badge = email verified + admin-verified flag.
- Show rating on listing cards and auction pages; sellers can't review themselves; admin can remove abusive reviews (recompute aggregates).
- Buyer reliability: show "payment success rate" to sellers on bidders' masked profile (optional).
