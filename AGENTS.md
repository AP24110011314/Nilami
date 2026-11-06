# AGENTS.md — Nilami

You are building Nilami, a real-time auction platform. Read `README.md`, then the doc relevant to the current phase in `docs/ROADMAP.md`. Do not skip docs; they contain decisions already made.

## Hard rules (never violate)

1. **No Docker, no docker-compose, no containers.** Infra is native Homebrew processes started by `scripts/infra-up.sh`.
2. **Never bind or reference port 5000 or 7000.** API = 4000, client = 5173, Mongo = 27018, Redis = 6380, Mailpit = 1025/8025. `env.ts` must reject `PORT=5000`.
3. **Money = integer paise.** Field names end in nothing special; the type is `number` (safe integer). Convert only at UI edges via `lib/money.ts`. Currency is `INR`.
4. **Server is the only authority** for bid validity, auction state, and time. Use MongoDB's clock (`$$NOW`) inside bid/close queries, never the browser's and never `Date.now()` for validity.
5. **Bids are one conditional atomic update + bid insert inside a transaction.** Never read-then-save. See `docs/BIDDING_ENGINE.md`.
6. **Every job and webhook handler is idempotent.** Closing twice or receiving a Stripe event twice must change nothing the second time.
7. **Payment success comes only from a verified Stripe webhook**, never from the success redirect.
8. **Delayed jobs are a latency optimisation, not the source of truth.** The reconciliation worker must be able to close any expired auction on its own.
9. **BullMQ custom job IDs must not contain `:`** — use `close_<auctionId>`.
10. Validate every request body, query and socket payload with Zod. Never trust client-sent user IDs, prices or times.
11. TypeScript `strict: true`. No `any` without a comment explaining why.
12. Never commit secrets. `.env` is git-ignored; keep `.env.example` current.

## Stack & layout

- npm workspaces: `server/` (Express 5, Mongoose, BullMQ, Socket.IO, Stripe) and `client/` (React 19, Vite, Tailwind, TanStack Query).
- Two server entrypoints: `server/src/index.ts` (HTTP + Socket.IO) and `server/src/worker.ts` (BullMQ workers). Worker pushes socket events through `@socket.io/redis-emitter`.
- Feature modules under `server/src/modules/<name>/` with `routes`, `controller`, `service`, `schema` (Zod), `model`.

## Commands

```bash
npm run infra:up      # start mongod(27018), redis(6380), mailpit
npm run infra:down
npm run dev           # api + worker + client (concurrently)
npm run check         # typecheck + lint + test (must pass before every commit)
npm test
```

## Workflow

1. Work one phase at a time from `docs/ROADMAP.md`. Do not start the next phase until acceptance criteria pass.
2. Write tests alongside code (Vitest + Supertest). Bidding, closing, webhook code requires concurrency/idempotency tests from `docs/TESTING.md`.
3. After each phase: run `npm run check`, update the checkboxes in `docs/ROADMAP.md`, commit with Conventional Commits (`feat(bids): ...`).
4. If a doc and the code disagree, fix the code or update the doc in the same commit — never leave drift.
5. Ask before adding a new dependency not listed in `docs/ARCHITECTURE.md` §Dependencies.

## Do not

- Use `setTimeout` for auction expiry. Use BullMQ + reconciliation.
- Mark auctions paid from the client.
- Use floats for money, or `Date` comparisons on the app server for bid validity.
- Emit sockets from request handlers before the DB transaction commits.
- Put business logic in controllers or React components.
