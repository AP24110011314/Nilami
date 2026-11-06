# Nilami — Real-Time Bidding / Auction Platform

An eBay-style live auction marketplace built to demonstrate real-time systems engineering: safe concurrent bidding, server-authoritative countdowns, crash-proof auction closure, and webhook-verified payments.

**Stack:** React 19 + Vite + TypeScript + Tailwind CSS · Node.js + Express 5 + TypeScript · MongoDB (replica set) + Mongoose · Socket.IO · Redis + BullMQ · Stripe · Mailpit (dev email)

**Scope: Complete** — every feature below is in scope and has a phase in `docs/ROADMAP.md`.

## Feature list

| Area | Features |
|---|---|
| Accounts | Register/login, JWT access + rotating refresh cookie, email verification, password reset, buyer/seller/admin roles |
| Auctions | Create/edit/cancel, up to 6 images, scheduled start, reserve price, categories, search + filters |
| Bidding | Atomic conditional bidding, min increment, idempotent retries, seller self-bid block, bid history |
| Real time | Socket.IO rooms, live price, live countdown, outbid alerts, viewer count, reconnect resync |
| Automation | BullMQ delayed close jobs, idempotent closing, reconciliation worker, outbox dispatcher |
| Payments | Stripe Checkout, webhook-verified status, optional automatic off-session charge with checkout fallback |
| Notifications | Persistent in-app + Socket.IO + email (outbid, won, payment, reminders) |
| Advanced | Anti-sniping, analytics dashboards, watchlist + reminders, rule-based fraud detection, seller ratings |

## Hard constraints (read these first)

1. **No Docker.** Everything runs natively on macOS via Homebrew (`mongod`, `redis-server`, `mailpit`, `stripe` CLI).
2. **Never use port 5000** (or 7000). macOS Control Center's AirPlay Receiver listens there. The server refuses to boot if `PORT=5000`.
3. **Money is stored as integer paise** (₹80,000 = `8000000`). No floats anywhere.

## Ports

| Service | Port |
|---|---|
| API + Socket.IO | **4000** |
| React (Vite) | **5173** |
| MongoDB (replica set `rs0`) | **27018** |
| Redis | **6380** |
| Mailpit SMTP / UI | **1025 / 8025** |

## Quick start

```bash
brew install mongodb-community mongosh redis mailpit stripe/stripe-cli/stripe
npm install
cp server/.env.example server/.env   # fill Stripe keys
npm run infra:up                     # mongod + redis + mailpit, no Docker
npm run dev                          # api + worker + client
```

Details: `docs/LOCAL_SETUP.md`.

## Documentation map

| File | Purpose |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | Rules for OpenCode / Claude Code — read first |
| `docs/RESEARCH.md` | Research findings and what changed vs the original brief |
| `docs/PRD.md` | Product requirements, rules, user stories |
| `docs/ARCHITECTURE.md` | Processes, flows, failure modes, decisions |
| `docs/DATABASE.md` | Collections, fields, indexes, invariants |
| `docs/BIDDING_ENGINE.md` | Atomic bid algorithm, anti-sniping, errors |
| `docs/BACKGROUND_JOBS.md` | BullMQ queues, closing, reconciliation, outbox |
| `docs/REALTIME.md` | Socket.IO design |
| `docs/PAYMENTS.md` | Stripe Checkout, webhooks, auto-charge, India caveats |
| `docs/API.md` | REST + socket contract |
| `docs/ADVANCED_FEATURES.md` | Analytics, watchlist, fraud, ratings |
| `docs/SECURITY.md` | Threat model and controls |
| `docs/FRONTEND.md` | Pages, state, countdown, UX |
| `docs/LOCAL_SETUP.md` | No-Docker macOS setup, scripts, env |
| `docs/TESTING.md` | Test plan, concurrency tests, demo script |
| `docs/ROADMAP.md` | Phase-by-phase tasks with acceptance criteria |
| `docs/AGENT_PROMPTS.md` | Copy-paste prompts per phase |
| `docs/DEPLOYMENT.md` | Vercel / Render / Atlas / Redis Cloud |
| `docs/INTERVIEW_GUIDE.md` | How to explain the project to recruiters |

## Payments & India Off-Session Regulations (RBI)

Nilami supports verified Stripe Checkout and automatic off-session settlement:
- **Integer Paise Accounting**: All monetary values are integer paise (₹80,000 = `8000000` paise). Floats are strictly prohibited.
- **Webhook Authority**: Payment success is confirmed only through signed Stripe webhook events (`stripe_events` idempotency table), never client redirect query parameters.
- **India RBI E-Mandate Limitation**: Under Reserve Bank of India (RBI) e-mandate guidelines, off-session recurring / deferred auto-debit without OTP is restricted for transactions exceeding ₹15,000. In such scenarios or when a bank requires customer interaction (`authentication_required`), Nilami automatically cascades to on-session 3-D Secure Stripe Checkout via immediate fallback notifications (`PAYMENT_DUE` with direct Pay Now links).
- **Dual Provider Architecture**: `PAYMENT_PROVIDER=stripe|mock` allows full offline test execution and recruiter demos without live network credentials.

## Recruiter Demo Walkthrough (≈3 Minutes)

Follow this sequence to demonstrate real-time distributed systems engineering:

1. **Seed & Boot**:
   ```bash
   npm run infra:up
   npm run seed
   npm run dev
   ```
2. **Concurrent Multi-Client Bidding**:
   Open 3 browser windows on `http://localhost:5173/auctions/`:
   - Buyer 1, Buyer 2, and an unauthenticated spectator.
   - Fire bids concurrently from both buyers: watch live Socket.IO price updates and outbid toast notifications propagate instantly across all viewports without page refresh.
3. **Anti-Sniping Engine**:
   - Place a bid in the final 10 seconds of an auction.
   - Watch the anti-snipe banner trigger and countdown clock extend by +30 seconds dynamically across all clients.
4. **Crash-Proof Worker & Outbox Reconciliation**:
   - Kill the background worker (`pkill -f "worker.ts"`).
   - Let an active auction expire.
   - Restart the worker (`npm run dev:worker`): watch the reconciliation engine safely claim expired auctions, transition them to `payment_pending`, write to the outbox, and notify the winner.
5. **Stripe Checkout & Realtime Settlement**:
   - The winner logs in, views their dashboard won lots, and clicks **Pay Now**.
   - Complete checkout via Stripe (`4242...` test card): webhook verification triggers instant real-time `payment-success` socket events and marks the lot `completed`.
6. **Admin Security & Analytics**:
   - Log in as `admin@nilami.local` and visit `/admin` to review the explainable fraud detection queue (`SELLER_LINKED_BIDDER`, `BID_BURST`, `PING_PONG`) and audit log trail.
   - Visit `/dashboard` to view seller analytics charts powered by Recharts with 14-day revenue breakdowns and sell-through rates.

