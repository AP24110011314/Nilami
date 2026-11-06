# DEPLOYMENT.md

Local development never uses Docker. For production use managed services. **Verify current free-tier limits and pricing before choosing — they change.**

## 1. Topology
| Component | Suggested host | Notes |
|---|---|---|
| React client | Vercel | Static build, `VITE_*` env vars |
| API + Socket.IO | Render Web Service (or Railway/Fly) | Must keep WebSockets and stay awake |
| Worker | Second process (Render Background Worker or same service) | **Always on** |
| MongoDB | MongoDB Atlas | Atlas clusters are replica sets, so transactions work |
| Redis | Redis Cloud (or similar) | Must allow BullMQ: persistent, `noeviction` — check plan settings |
| Images | Cloudinary (`STORAGE_DRIVER=cloudinary`) | Local disk is ephemeral on most hosts |
| Email | Resend/SendGrid/Brevo SMTP | Replace Mailpit |
| Payments | Stripe test mode (live needs an eligible account) | |

## 2. The always-on requirement
A web service that sleeps after inactivity cannot run delayed jobs or hold sockets. Options:
1. Use a plan that does not sleep for the API and worker (recommended for a live demo).
2. Run the worker inside the API process (`RUN_WORKER_IN_API=true`) to use a single instance. Acceptable for demos, not for scale.
3. If the service sleeps, bids are still rejected correctly (DB clock) and the reconciler closes auctions on wake — but winners will be notified late. Document this honestly.

## 3. Environment (production deltas)
`NODE_ENV=production`, `CLIENT_URL=https://<vercel-domain>`, `MONGODB_URI=<atlas srv uri with retryWrites=true&w=majority>`, `REDIS_URL=rediss://…`, strong random JWT/IP secrets, `STORAGE_DRIVER=cloudinary`, SMTP provider vars, `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET` (from the Dashboard endpoint, not the CLI), `PAYMENT_WINDOW_MINUTES=2880`.

## 4. Cookies and CORS across domains
Vercel and Render domains are different sites, so the refresh cookie is cross-site: set `SameSite=None; Secure`, `credentials: true` in CORS with the exact client origin, and require a custom header (e.g. `X-Requested-With`) on `/auth/refresh`. Cleaner: put both under one parent domain (`app.example.com`, `api.example.com`) and use `SameSite=Lax`. Add `app.set('trust proxy', 1)` behind the host's proxy.

## 5. Stripe webhook in production
Dashboard → Developers → Webhooks → add `https://<api>/api/payments/webhook`; select events from `PAYMENTS.md` §5; copy the signing secret. Test with a real test-mode checkout.

## 6. Socket scaling
Single instance needs nothing extra. Multiple API instances require the Redis adapter (already used) and sticky sessions only if you allow long-polling fallback — prefer `transports: ['websocket']` in production.

## 7. Release checklist
- [ ] `npm run check` green on CI
- [ ] Atlas IP/network access configured, user with least privilege
- [ ] Redis `noeviction` verified (`CONFIG GET maxmemory-policy`)
- [ ] `/api/health` monitored (UptimeRobot or similar)
- [ ] Worker logs show reconcile every 30 s
- [ ] Webhook delivery succeeds (Stripe dashboard shows 200)
- [ ] Graceful shutdown on deploy (SIGTERM handled)
- [ ] Seed/dev endpoints disabled (`/payments/dev/*`, `/admin/queues` protected)
- [ ] Backups enabled for Atlas

## 8. Smoke test script
Register → verify → create 5-minute auction → two bidders → wait for close → pay with `4242…` → assert `completed`. Run via Playwright against the deployed URL.
