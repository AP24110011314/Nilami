# AGENT_PROMPTS.md — Copy-paste prompts for OpenCode / Claude Code

Start every session with the preamble, then paste the phase prompt. Keep `AGENTS.md` at the repo root so the agent loads it automatically.

## Preamble (every session)
```
Read AGENTS.md, README.md and the docs listed below for this phase. Follow the hard rules exactly:
no Docker, never port 5000/7000, money in integer paise, server-authoritative time (Mongo $$NOW),
atomic bidding, idempotent jobs/webhooks. Work only on the current phase. Write tests as you go.
When done, run `npm run check`, tick the boxes in docs/ROADMAP.md, and summarise what changed.
```

## Phase 0
```
Phase 0 (docs/ROADMAP.md, docs/ARCHITECTURE.md, docs/LOCAL_SETUP.md): scaffold the npm-workspaces monorepo
(server + client, TypeScript strict), env.ts with Zod that rejects PORT 5000/7000, Express app with
helmet/cors/pino, /api/health, Mongo+Redis connections, worker.ts skeleton with graceful shutdown,
and a Vite+Tailwind client shell. Use the scripts in /scripts. Do not add dependencies outside ARCHITECTURE.md §6.
```
## Phase 1
```
Phase 1 (docs/PRD.md FR-A*, docs/DATABASE.md users/refresh_tokens, docs/SECURITY.md, docs/API.md Auth):
implement registration, login, email verification and password reset (Mailpit), JWT access + rotating
httpOnly refresh cookie with reuse detection, roles middleware, and the client auth pages with a refresh interceptor.
Write tests T26, T27, T30.
```
## Phase 2
```
Phase 2 (docs/DATABASE.md auctions, docs/API.md Auctions, docs/PRD.md §3): implement auction create/edit/cancel,
image upload with a StorageProvider interface (local + cloudinary drivers, sharp re-encode), list/search/filter/sort,
detail endpoint including serverTime, seed script, and the seller/browse/detail pages. Never expose reservePrice.
```
## Phase 3
```
Phase 3 (docs/BIDDING_ENGINE.md, docs/DATABASE.md bids): implement placeBid exactly as specified: pipeline
findOneAndUpdate with $$NOW inside a transaction + bid insert + outbid notification, idempotency, rate limit,
rejection diagnosis, anti-sniping. Add bid history, my-bids, my-wins and the bid form. Write tests T1–T10 including
the 50-parallel-bids invariant test and run it 20 times.
```
## Phase 4
```
Phase 4 (docs/REALTIME.md, docs/FRONTEND.md): Socket.IO with JWT handshake, Redis adapter, rooms, typed event helpers
in realtime/events.ts, emit after commit. Client: useAuctionSocket, useServerClock, useCountdown, live price and bid list,
viewer count, outbid banner, reconnect resync. Tests T22–T24.
```
## Phase 5
```
Phase 5 (docs/BACKGROUND_JOBS.md): BullMQ queues, schedule activate/ending-soon/close on auction creation (job IDs
without colons), idempotent closeAuction with version guard and outbox, outbox dispatcher, redis-emitter in the worker,
reconcile scheduler + run-on-boot. Winner/ended UI. Tests T11–T15, T25 and the kill-worker chaos check.
```
## Phase 6
```
Phase 6 (docs/PAYMENTS.md): Stripe Checkout in INR paise, webhook with raw body + stripe_events idempotency + state machine +
amount verification, payment expiry job, save-card + consent, autocharge job with checkout fallback, PAYMENT_PROVIDER=mock driver,
Pay Now UI and success polling page. Tests T16–T21. Document the India off-session limitation in the README.
```
## Phase 7
```
Phase 7 (docs/ADVANCED_FEATURES.md §3, docs/DATABASE.md notifications/watchlist): persistent notifications, bell UI, socket push,
email worker with templates for every notification type, watchlist with reminder jobs that re-check endsAt. Test T29.
```
## Phase 8
```
Phase 8 (docs/ADVANCED_FEATURES.md): analytics aggregations + Recharts dashboards, fraud rules + admin queue + temporary bid block,
reviews with rating aggregates and badges, admin audit log. Test T28.
```
## Phase 9
```
Phase 9 (docs/SECURITY.md, docs/TESTING.md): run the security checklist, add missing tests, accessibility and mobile pass,
Playwright multi-window E2E, chaos checks, README demo section. Fix any invariant failures.
```
## Phase 10
```
Phase 10 (docs/DEPLOYMENT.md): prepare production config, health checks, CORS/cookie settings for the chosen hosts,
registration of the Stripe webhook, and a smoke-test script. Do not change business logic.
```

## Handy one-liners
- "Show me every place that uses Date.now() for validity decisions and replace with DB time."
- "Audit the codebase against AGENTS.md hard rules and list violations."
- "Add a test proving closeAuction is idempotent under two concurrent calls."
