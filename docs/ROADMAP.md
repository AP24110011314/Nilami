# ROADMAP.md — Phases, tasks, acceptance criteria

Estimated total: **6–7 weeks** part-time (about 4–5 full-time). Each phase includes its backend and its frontend slice. Tick boxes as you go. Do not begin a phase until the previous acceptance gate passes.

## Phase 0 — Foundation (2–3 days)
- [x] Monorepo with npm workspaces, TS strict, ESLint, Prettier, Vitest, `concurrently`
- [x] `scripts/infra-up.sh` / `infra-down.sh`, `.env.example`, `env.ts` (Zod, rejects ports 5000/7000)
- [x] Express app skeleton: helmet, cors, pino-http, error middleware, `/api/health`
- [x] Mongo connection (replica set), Redis connection, graceful shutdown, `worker.ts` skeleton
- [x] Vite + Tailwind client shell, router, layout, API client
- **Gate:** `npm run infra:up && npm run dev` boots api/worker/web; `/api/health` shows mongo+redis ok; nothing listens on 5000.

## Phase 1 — Auth and users (FR-A1–A5) (3–4 days)
- [x] User model, register/login, bcrypt, JWT access + rotating refresh cookie, reuse detection
- [x] Email verification + password reset via Mailpit
- [x] Roles, `requireAuth`/`requireRole`/`requireVerified`, become-seller
- [x] Auth pages, protected routes, token refresh interceptor
- **Gate:** tests T26, T27, T30 pass; verification email visible in Mailpit.

## Phase 2 — Auction management (FR-B1–B4) (4–5 days)
- [x] Auction model + indexes, create/edit/cancel, validation rules
- [x] Image upload (local driver + Cloudinary driver interface), sharp re-encode
- [x] List/search/filter/sort, detail endpoint with `serverTime`
- [x] Seller create/edit forms, browse page, auction detail (static)
- [x] Seed script
- **Gate:** seller creates an auction with images; buyers browse and filter; reserve price never leaks.

## Phase 3 — Bidding engine (FR-C1–C5, FR-G1 backend) (5–6 days)
- [x] Bid model + unique indexes, `placeBid` per `BIDDING_ENGINE.md`, rejection diagnosis
- [x] Idempotency, rate limit, anti-sniping inside the pipeline update
- [x] Bid history endpoint (masked), my-bids, my-wins
- [x] Bid form + history UI (polling refresh for now)
- **Gate:** T1–T10 pass; concurrency suite stable across 20 runs.

## Phase 4 — Real time (FR-D1–D7) (3–4 days)
- [x] Socket.IO server, JWT handshake, Redis adapter, rooms, event helpers
- [x] `useAuctionSocket`, `useServerClock`, `useCountdown`, live price/bid list, viewer count
- [x] Outbid notification events, extension banner, reconnect resync
- **Gate:** T22–T24 pass; four windows update within ~200 ms; countdown stays accurate with a deliberately wrong system clock.

## Phase 5 — Background processing (FR-E1, E2, E7) (4–5 days)
- [x] BullMQ queues, schedule on create, `activate`/`ending-soon`/`close` jobs
- [x] Idempotent `closeAuction`, outbox + dispatcher, redis-emitter in worker
- [x] Reconciliation scheduler + boot recovery, payment row creation
- [x] Winner/ended UI states, "You won" banner
- **Gate:** T11–T15, T25 pass; kill-worker chaos test passes.

## Phase 6 — Payments (FR-E3–E6) (5–6 days)
- [ ] Stripe customer + Checkout Session, mock provider
- [ ] Webhook with raw body, `stripe_events` idempotency, state machine, amount verification
- [ ] Payment expiry job, strikes
- [ ] Save card + consent, `autocharge` job + fallback
- [ ] Pay Now UI, success polling page, payment settings page
- **Gate:** T16–T21 pass with Stripe CLI; auto-charge fallback demonstrated.

## Phase 7 — Notifications and watchlist (FR-F1–F3, FR-G3) (3–4 days)
- [ ] Notification persistence + bell UI + socket push + email worker templates
- [ ] Watchlist API/UI, reminder jobs that re-check `endsAt`
- **Gate:** T29 passes; every event type in `DATABASE.md` notifications has a template.

## Phase 8 — Advanced: analytics, fraud, reviews, admin (FR-G2, G4, G5) (5–6 days)
- [ ] Aggregation endpoints + Recharts dashboards (seller, public, admin)
- [ ] Fraud rules + queue + admin review UI + bid block
- [ ] Reviews, rating aggregates, badges
- [ ] Admin audit log
- **Gate:** T28 passes; seller dashboard charts render real data.

## Phase 9 — Hardening and polish (3–4 days)
- [ ] Security checklist in `SECURITY.md`, rate limits, upload tests
- [ ] Accessibility pass, mobile layout, empty/error states
- [ ] Playwright multi-window E2E, load check, chaos checks
- [ ] Logging/metrics, README with GIF
- **Gate:** all T1–T30 green; `npm run check` clean.

## Phase 10 — Deployment and demo (2–3 days)
- [ ] Follow `DEPLOYMENT.md`; register the production webhook
- [ ] Record demo using `TESTING.md` §6; finish `INTERVIEW_GUIDE.md` with real numbers
- **Gate:** public URL works end-to-end in Stripe test mode.

## Cut-line if time runs short
Keep: Phases 0–7 and Phase 9 basics. Trim within Phase 8: fraud rules to 3 (`SELLER_LINKED_BIDDER`, `BID_BURST`, `PAYMENT_ABANDONER`), analytics to the seller dashboard. Auto-charge can ship last since it needs the checkout fallback anyway.
