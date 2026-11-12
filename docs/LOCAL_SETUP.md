# LOCAL_SETUP.md — macOS, no Docker

## 1. Why not port 5000
On recent macOS versions, Control Center's **AirPlay Receiver** listens on ports 5000 and 7000. Nilami never uses either. API = **4000**. (If you prefer, you can also switch AirPlay Receiver off in System Settings → General → AirDrop & Handoff, but it's not required.)

| Service | Port | Env |
|---|---|---|
| API + Socket.IO | 4000 | `PORT` |
| Vite client | 5173 | `vite.config.ts` |
| MongoDB rs0 | 27018 | `MONGODB_URI` |
| Redis | 6380 | `REDIS_URL` |
| Mailpit SMTP / UI | 1025 / 8025 | `SMTP_PORT` |

Check conflicts: `lsof -iTCP:4000 -sTCP:LISTEN`.

## 2. Install (Homebrew)
```bash
brew install node            # use Node 22 or 24 LTS; or install via nvm
brew tap mongodb/brew
brew install mongodb-community mongosh redis mailpit
brew install stripe/stripe-cli/stripe
node -v && mongod --version | head -1 && redis-server --version
```
Do **not** run `brew services start mongodb-community` for this project; our script runs a dedicated instance on 27018 with its own data directory, so it never clashes with your other projects' MongoDB/Redis.

## 3. Start infrastructure
`scripts/infra-up.sh` (already in the repo; wired to `npm run infra:up`) starts a single-node replica set, Redis with `noeviction`, and Mailpit. Data lives in `.data/` (git-ignored). Stop with `npm run infra:down`.

Verify:
```bash
mongosh --port 27018 --eval 'rs.status().ok'   # 1
redis-cli -p 6380 ping                         # PONG
redis-cli -p 6380 config get maxmemory-policy  # noeviction
open http://localhost:8025                     # Mailpit
```

## 4. Environment files

Root `.env.example` (shared by `server/` and `client/` via `env.ts` and `vite.config.ts`) and `server/.env.example` / `client/.env.example`:
```
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173
MONGODB_DB_NAME=nilami
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/nilami?retryWrites=true&w=majority
REDIS_URL=redis://127.0.0.1:6380
JWT_ACCESS_SECRET=change-me-32+chars
JWT_REFRESH_SECRET=change-me-too-32+chars
ACCESS_TTL=15m
REFRESH_TTL_DAYS=30
IP_HASH_SECRET=change-me-3
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SERVICE=gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_char_google_app_password
MAIL_FROM="Nilami <your_email@gmail.com>"
STORAGE_DRIVER=s3               # local | cloudinary | s3
UPLOAD_DIR=./uploads
CLOUDINARY_URL=
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your_bucket_name
PAYMENT_PROVIDER=razorpay       # razorpay | stripe | mock
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
PAYMENT_WINDOW_MINUTES=2880     # use 10 for demos
ANTI_SNIPE_WINDOW_MS=10000
ANTI_SNIPE_EXTEND_MS=30000
ANTI_SNIPE_MAX_EXTENSIONS=20
RUN_WORKER_IN_API=false
LOG_LEVEL=debug
```
`client/.env.example`
```
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
VITE_API_PROXY_TARGET=http://localhost:4000
VITE_PAYMENT_PROVIDER=razorpay
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```
`env.ts` validates with Zod and **throws if `PORT` is 5000 or 7000**.

## 5. Root `package.json` scripts
```json
{
  "workspaces": ["server", "client"],
  "scripts": {
    "infra:up": "bash scripts/infra-up.sh",
    "infra:down": "bash scripts/infra-down.sh",
    "dev": "concurrently -n api,worker,web -c blue,magenta,green \"npm run dev -w server\" \"npm run dev:worker -w server\" \"npm run dev -w client\"",
    "stripe:listen": "stripe listen --forward-to localhost:4000/api/payments/webhook",
    "seed": "npm run seed -w server",
    "test": "npm run test -w server && npm run test -w client",
    "check": "npm run typecheck -ws && npm run lint -ws && npm test"
  }
}
```
Server scripts: `dev: tsx watch src/index.ts`, `dev:worker: tsx watch src/worker.ts`, `seed: tsx src/scripts/seed.ts`.

## 6. Run
Terminal 1: `npm run infra:up && npm run dev` · Terminal 2: `npm run stripe:listen` (copy `whsec_…` into `server/.env`, restart API).

## 7. Seed data
`npm run seed` creates: admin, 3 sellers, 8 buyers (all verified, password `Password123!`), 20 auctions in mixed states (some ending in 2–10 min for demos). Never run in production (guard on `NODE_ENV`).

## 8. Troubleshooting
| Symptom | Fix |
|---|---|
| `NotYetInitialized` / transactions error | Replica set not initiated: rerun `npm run infra:up` |
| BullMQ warns about eviction policy | Redis not started by our script; set `maxmemory-policy noeviction` |
| `EADDRINUSE :4000` | `lsof -iTCP:4000 -sTCP:LISTEN` then `kill <pid>` |
| Cannot start mongod (lock) | After a crash: remove `.data/mongo/mongod.lock` and retry |
| Emails not arriving | Open http://localhost:8025; check `SMTP_PORT=1025` |
| Stripe webhook 400 | Wrong `STRIPE_WEBHOOK_SECRET`, or JSON parser mounted before the raw route |
| Socket connects then drops | `CLIENT_URL` mismatch in CORS |
