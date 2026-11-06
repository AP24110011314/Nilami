# SECURITY.md

| Threat | Control |
|---|---|
| Credential stuffing / brute force | bcrypt cost 12, auth rate limit (Redis store), generic login errors, optional lockout after 10 failures/15 min |
| Token theft | Access JWT 15 min in memory only (not localStorage); refresh token in httpOnly, Secure, SameSite cookie, stored hashed, rotated on use; reuse detection revokes the family |
| XSS | React escaping; descriptions rendered as plain text; CSP via Helmet; no `dangerouslySetInnerHTML` |
| CSRF | Refresh endpoint cookie is SameSite=Lax/Strict (None+Secure only if cross-site hosting, then require a custom header + Origin check) |
| NoSQL injection | Zod schemas with `.strict()`; never pass raw `req.query/body` into Mongo filters; cast IDs with `ObjectId.isValid` |
| Price/time tampering | Server computes everything; client sends only `amount` and an idempotency key |
| Race conditions | Atomic update + unique indexes (see `BIDDING_ENGINE.md`) |
| Bid spam / DoS | Per-user and per-IP rate limits, body size limit (100 kB, uploads separate), socket event rate limits, max rooms per socket (10) |
| Socket abuse | JWT handshake, validate `auctionId` payloads, ignore unknown events, cap payload size, no client-originated broadcasts |
| Shill/fraud bidding | Rules in `ADVANCED_FEATURES.md`, seller self-bid ban, linked-account detection |
| Webhook forgery/replay | Signature verification with raw body, `stripe_events` idempotency, amount/currency/metadata checks |
| Payment tampering | Amount comes from DB, never from the client; Checkout Session created server-side |
| File upload attacks | Mime sniffing (`file-type`), extension allowlist, size cap, re-encode with `sharp`, random filenames, no execution from upload dir |
| Info leakage | Mask other bidders, hide reserve price, never return `passwordHash`/tokens, generic errors in prod, pino redaction of `authorization`, `cookie`, `password` |
| Secrets | `.env` git-ignored; separate dev/prod keys; rotate on leak; startup validation with Zod |
| Account takeover via reset | Single-use hashed reset tokens, 30 min expiry, revoke sessions on password change |
| Dependency risk | `npm audit` in CI, lockfile committed, pin exact versions at least 2 weeks old for new releases |
| Admin abuse | Admin routes behind role check + audit log (`admin_actions` entries on every mutation) |
| CORS | Allow only `CLIENT_URL`; `credentials: true`; no wildcard |

Security tests: unauthorized access to each protected route, IDOR (user B reading user A's payment), oversized/invalid payloads, forged webhook, refresh-token reuse, upload of a script renamed `.png`.
