# API.md — REST + Socket contract

Base URL (dev): `http://localhost:4000/api`. JSON only. Auth: `Authorization: Bearer <accessToken>`; refresh token is an httpOnly cookie `rt` (path `/api/auth`).

## Conventions
- Money: integer paise. Dates: ISO-8601 UTC. IDs: strings.
- Every auction response includes `serverTime`.
- Pagination: `?page=1&limit=20` → `{ items, page, limit, total }`.
- Error shape: `{ "error": { "code": "BID_TOO_LOW", "message": "...", "details": {} } }`.
- Standard codes: `VALIDATION_ERROR 400`, `UNAUTHENTICATED 401`, `FORBIDDEN 403`, `NOT_FOUND 404`, `CONFLICT 409`, `RATE_LIMITED 429`, `INTERNAL 500`.
- Rate limits: auth 10/min/IP, bid 5/10 s/user/auction, general 120/min/IP.

## Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /auth/register | – | `{name,email,password,role?}` → sends verification email |
| POST | /auth/verify-email | – | `{token}` |
| POST | /auth/login | – | → `{accessToken,user}` + sets `rt` cookie |
| POST | /auth/refresh | cookie | rotates refresh, returns new access token |
| POST | /auth/logout | cookie | revokes token family |
| POST | /auth/forgot-password | – | `{email}` (always 200) |
| POST | /auth/reset-password | – | `{token,password}` |
| GET | /users/me | user | profile + stats |
| PATCH | /users/me | user | name, avatar |
| POST | /users/me/become-seller | verified | adds `seller` role |
| GET | /users/:id/public | – | name, rating, review count, auctions sold |

## Auctions
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /auctions | – | list. Query: `q, category, status, minPrice, maxPrice, sort (endingSoon\|newest\|priceAsc\|priceDesc\|mostBids), endingWithinMinutes` |
| POST | /auctions | seller | create (multipart or JSON with uploaded image refs) |
| GET | /auctions/:id | – | detail snapshot (`reserveMet`, never `reservePrice`) |
| PATCH | /auctions/:id | owner | only before first bid |
| POST | /auctions/:id/cancel | owner/admin | owner only before first bid |
| POST | /auctions/:id/bid | verified | place bid (see below) |
| GET | /auctions/:id/bids | – | bid history (masked bidders), paginated |
| GET | /auctions/:id/analytics | – | price progression, bid frequency (public part) |
| POST | /uploads/images | seller | multipart, ≤6 files, ≤5 MB each, jpeg/png/webp → `[{url,publicId}]` |

### POST /auctions
```json
{ "title":"MacBook Pro M4","description":"…","category":"electronics","condition":"like_new",
  "images":[{"url":"…"}],"startingPrice":8000000,"reservePrice":9000000,"minIncrement":100000,
  "startsAt":"2026-11-07T09:00:00Z","endsAt":"2026-11-07T09:10:00Z" }
```
Validation: `startsAt ≥ now − 1 min`, duration 5 min–7 days, `minIncrement ≥ 100` paise, `reservePrice ≥ startingPrice`.

### POST /auctions/:id/bid
Request `{ "amount": 8700000, "idempotencyKey": "uuid" }`
Success `201`:
```json
{ "bid": {"id":"…","amount":8700000,"at":"…"},
  "auction": {"id":"…","currentPrice":8700000,"minNextBid":8800000,"bidCount":4,"endsAt":"…","status":"active","extended":false},
  "serverTime":"…" }
```
Errors (see `BIDDING_ENGINE.md` §4): `AUCTION_NOT_FOUND, AUCTION_ENDED, AUCTION_NOT_STARTED, SELLER_CANNOT_BID, ALREADY_HIGHEST_BIDDER, BID_TOO_LOW, OUTBID_DURING_REQUEST, EMAIL_NOT_VERIFIED, RATE_LIMITED`. `BID_TOO_LOW` and `OUTBID_DURING_REQUEST` include `details: { currentPrice, minNextBid }`.

## Users' activity
| Method | Path | Purpose |
|---|---|---|
| GET | /users/my-bids | auctions I bid on, with `leading: boolean` |
| GET | /users/my-wins | won auctions with payment status |
| GET | /users/my-auctions | seller's listings with stats |
| GET | /users/my-watchlist | watched auctions |

## Watchlist
`PUT /auctions/:id/watch` `{ remindMinutesBefore? }` · `DELETE /auctions/:id/watch`.

## Payments
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /payments/checkout/:auctionId | winner | create/reuse Checkout Session → `{url}` |
| GET | /payments/status/:auctionId | buyer/seller | current payment status (used after redirect) |
| POST | /payments/setup-session | user | save card for auto-charge (`{consent:true}`) |
| DELETE | /payments/saved-method | user | remove card + consent |
| POST | /payments/webhook | Stripe signature | raw body; no JSON parser |
| POST | /payments/dev/mock-pay/:auctionId | dev only | mock provider |
| POST | /admin/payments/:id/refund | admin | refund |

## Notifications
`GET /notifications?unread=true` · `GET /notifications/unread-count` · `PATCH /notifications/:id/read` · `POST /notifications/read-all`.

## Reviews
`POST /auctions/:id/review` `{rating,comment}` (winner after paid) · `GET /users/:id/reviews`.

## Analytics
| Path | Auth | Purpose |
|---|---|---|
| GET /analytics/seller/overview | seller | revenue, sell-through rate, avg bids per auction, avg final/starting ratio |
| GET /analytics/seller/auctions/:id | owner | bid timeline, unique bidders, extension count |
| GET /analytics/trending | – | popular auctions (bids + watchers in last 24 h) |
| GET /analytics/admin/overview | admin | GMV, active auctions, bids/min, fraud flags |

## Admin
`GET /admin/fraud-flags?status=open` · `PATCH /admin/fraud-flags/:id` `{status}` · `POST /admin/users/:id/suspend` · `POST /admin/auctions/:id/cancel` · `GET /admin/queues` (dev).

## Health
`GET /health` → `{ ok, mongo, redis, uptime, serverTime }`.

## Socket events
See `REALTIME.md` §3 (authoritative list and payloads).
