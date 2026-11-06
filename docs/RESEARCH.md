# RESEARCH.md — Findings and Design Decisions

## 1. Assessment of the original brief

The brief is a strong outline. These are the gaps I closed in this plan.

| Gap in the brief | Risk | Decision in Nilami |
|---|---|---|
| Prices shown as rupee numbers, no storage rule | Float rounding, Stripe mismatch | Integer **paise** everywhere |
| Bid validity checked with app clock | Clock skew across instances | Use MongoDB `$$NOW` inside the update filter |
| Atomic update stores bid separately | Update succeeds, insert fails → ghost price | Update + insert in one **transaction** |
| Client retries / double-click | Duplicate bids | Per-bid `idempotencyKey`, unique index |
| Nothing stops equal amounts | Two bids same price | Unique index `{auctionId, amount}` as DB-level invariant |
| Anti-sniping extends `endsAt` | Pre-scheduled close job fires early | Worker **re-checks `endsAt`** and re-delays; reconciler is the backstop |
| Worker is a separate process | It cannot reach Socket.IO rooms | `@socket.io/redis-emitter` from the worker |
| Closure + payment + notifications | Partial failure after commit | Transactional close + **outbox** table dispatched by a worker |
| BullMQ job IDs like `close:123` | BullMQ rejects `:` in custom IDs | Use `close_<id>` |
| Auto-charge presented as generic | Largely fails for Indian cards (see §3) | Implement it, but **always** ship checkout fallback |
| Hosting list | Free tiers sleep → delayed jobs stall | Deployment doc flags worker always-on requirement |

## 2. Verified facts (sources)

- **BullMQ delayed jobs** are held in Redis until their time arrives and can be changed or removed while still delayed; recurring work uses job schedulers (`upsertJobScheduler`), which are safe to re-register on every deploy. Sources: BullMQ docs (https://docs.bullmq.io) and 2026 tutorials on delayed jobs and schedulers.
- **Stripe India accounts:** new accounts are by invitation (https://support.stripe.com/questions/details-needed-to-create-an-account-with-stripe-in-india). Domestic payments are INR; export payments need extra customer address data and purpose codes (https://docs.stripe.com/india-exports). **Test mode needs no live account** — develop in test mode.
- **RBI e-mandate rules for off-session card payments** (https://docs.stripe.com/india-recurring-payments, https://support.stripe.com/questions/impact-assessment-guide-for-rbi-regulations):
  - Off-session payments on India-issued cards need a mandate; the customer gets a pre-debit notice and Stripe delays collection by about 26 hours.
  - Stripe documents e-mandates for **Subscriptions**, not for plain PaymentIntents/SetupIntents.
  - Off-session payments **above ₹15,000** must bring the customer back on-session with additional authentication every time.
  - In sandbox an off-session PaymentIntent can sit in `processing` for ~15 minutes.
- **Consequence:** an auction item typically costs more than ₹15,000, so automatic charging will usually fail for Indian cards and always needs a fallback. Treat auto-charge as a best-effort feature, demonstrate it with test cards, and document the limitation honestly.

## 3. Knowledge-based decisions (verify against official docs while building)

- **MongoDB:** transactions require a replica set; a single-node replica set works locally. Single-document updates are atomic; aggregation-pipeline updates may use `$$NOW`. Unique indexes are enforced even inside transactions. `withTransaction` retries transient errors such as write conflicts.
- **Socket.IO:** rooms for scoping; Redis adapter for multi-instance fan-out; Redis emitter for non-socket processes. Do not rely on connection-state recovery with the standard Redis adapter — resync from a REST snapshot instead.
- **Redis for BullMQ:** set `maxmemory-policy noeviction`; ioredis connection needs `maxRetriesPerRequest: null` for workers.
- **macOS:** AirPlay Receiver (Control Center) occupies ports 5000 and 7000 on recent macOS. Disabling it is optional — we simply avoid both ports.
- **Stripe webhooks:** the raw request body is required for signature verification; mount the webhook route before `express.json()`. Stripe delivers at-least-once, so handlers must be idempotent. Use `stripe listen --forward-to` locally.

## 4. Alternatives considered

| Question | Chosen | Rejected | Why |
|---|---|---|---|
| Bid transport | REST `POST` + socket broadcast | Bids over socket | REST gives auth, rate limits, simple ack, easy tests |
| Expiry | BullMQ + reconciler | `setTimeout`, MongoDB TTL | Timers die with the process; TTL is minute-granular and deletes docs |
| Consistency | Mongo transaction | Redis Lua lock | One datastore of truth, fewer failure modes |
| Email in dev | Mailpit | Docker MailHog | No Docker |
| Language | TypeScript | JavaScript | Money/event contracts benefit from types |
| Styling | Tailwind | Material UI | Lighter, faster to theme |
| Payouts to sellers | Out of scope | Stripe Connect | Availability/compliance for India needs separate verification |

## 5. Risks

1. Stripe India onboarding is invite-only → stay in test mode; offer a `PAYMENT_PROVIDER=mock` fallback driver so the demo never depends on Stripe availability.
2. Off-session limitation → fallback always present.
3. Cold-start hosting → documented in `DEPLOYMENT.md`.
4. Scope size (Complete) → strict phase gating in `ROADMAP.md`.
