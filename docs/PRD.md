# PRD.md — Product Requirements

## 1. Goal
A trustworthy live-auction marketplace where many users compete for an item, prices update instantly for everyone, and auctions close and bill automatically without any browser being open.

## 2. Personas
- **Buyer** — browses, watches, bids, pays.
- **Seller** — lists items, monitors bidding, sees analytics, receives ratings.
- **Admin** — reviews fraud flags, suspends users, cancels auctions.

## 3. Business rules (defaults, configurable by env)

| Rule | Default |
|---|---|
| Currency | INR, stored in paise |
| Minimum increment | ≥ ₹1 (default ₹1,000 in forms) |
| Duration | 5 minutes – 7 days (demo preset: 10 minutes) |
| First bid | ≥ starting price. Later bids ≥ current price + increment |
| Seller bidding | Forbidden on own auction |
| Highest bidder re-bidding | Rejected (`ALREADY_HIGHEST_BIDDER`) |
| Anti-sniping | Bid with ≤10 s left extends by 30 s, max 20 extensions |
| Reserve price | Optional. If unmet at close → `unsold` |
| Payment window | 48 h (`PAYMENT_WINDOW_MINUTES`, use 10 for demos) |
| Bid rate limit | 5 bids / 10 s per user per auction |
| Fat-finger guard | UI asks confirmation if bid > 2× current price |
| Edit/cancel | Only before first bid; after that admin-only cancel |

## 4. Auction state machine

```
scheduled ──(startsAt passes)──► active ──(endsAt passes, closing job)──► payment_pending ──► completed
    │                               │                                          │
    └──── cancelled ◄───────────────┤                                          └──► payment_failed
                                    └──(no bids / reserve unmet)──► unsold
```

## 5. Functional requirements

IDs are referenced from `ROADMAP.md` and tests.

**Accounts**
- FR-A1 Register/login with email + password (bcrypt). FR-A2 JWT access (15 min) + rotating refresh token in httpOnly cookie. FR-A3 Email verification required to sell and bid. FR-A4 Password reset by email. FR-A5 Roles buyer/seller/admin; any verified user may enable seller mode.

**Auctions**
- FR-B1 Create with title, description, category, condition, 1–6 images, start/end time, starting price, increment, optional reserve. FR-B2 Edit/cancel before first bid. FR-B3 Browse, search (text), filter (category, status, price range, ending soon), sort. FR-B4 Auction detail with images, bids, seller reputation.

**Bidding**
- FR-C1 Place bid with server validation. FR-C2 Immediate accept/reject response with reason and current minimum. FR-C3 Idempotent retries. FR-C4 Full bid history (bidder names masked, e.g. `A***n`). FR-C5 My bids, my wins.

**Real time**
- FR-D1 Live price/bidder count/bid list. FR-D2 Server-synced countdown. FR-D3 Outbid alert to previous leader. FR-D4 "Ending soon" and "Extended" broadcasts. FR-D5 Winner announcement. FR-D6 Viewer count. FR-D7 Reconnect shows correct state.

**Closing & payment**
- FR-E1 Auction closes automatically at `endsAt` even if API restarts. FR-E2 Winner determined once. FR-E3 Winner notified with Pay Now. FR-E4 Stripe Checkout payment, status from webhooks only. FR-E5 Optional automatic charge using saved card + consent, fallback to checkout. FR-E6 Payment expiry → `payment_failed`, seller notified. FR-E7 No duplicate payment/winner under retries.

**Notifications**
- FR-F1 Persistent in-app notifications (bell, unread count, mark read). FR-F2 Email for outbid, won, payment received/failed, watchlist reminder. FR-F3 Socket push to online users.

**Advanced**
- FR-G1 Anti-sniping. FR-G2 Auction analytics (seller & public). FR-G3 Watchlist + reminders (15 min before end). FR-G4 Fraud rules + admin review queue. FR-G5 Reviews/ratings after completed payment, seller reputation badge.

## 6. Non-functional requirements
- Bid acceptance p95 < 150 ms locally at 50 concurrent bids on one auction; broadcast latency < 200 ms on LAN.
- Zero lost or duplicated bids under concurrency (tested).
- Auction closes within 5 s of `endsAt` in normal operation, within 60 s after a crash (reconciler).
- Server restarts do not lose scheduled closes.
- Accessible UI (keyboard, ARIA live region for price changes), responsive from 360 px.

## 7. Out of scope
Seller payouts/Connect, shipping, disputes/refund workflow beyond admin refund endpoint, proxy (auto) bidding, mobile apps.

## 8. Success metrics (for the portfolio demo)
1. 4 browser windows bidding concurrently stay consistent.
2. Kill the API mid-auction → auction still closes and winner is billed.
3. Replay a Stripe webhook twice → one payment record.
4. README demo GIF plus test report showing the 10 scenarios in `TESTING.md` passing.
