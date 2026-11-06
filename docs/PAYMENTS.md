# PAYMENTS.md — Stripe

## 1. Ground rules
- Amounts in **paise** (`unit_amount` for INR is in paise; ₹80,000 → `8000000`). Never convert through floats.
- Use **test mode** keys (`sk_test_…`). Stripe India live accounts are invite-only for new signups, so the project must run fully in test mode.
- Payment truth = verified webhook events. The success redirect page only *polls* `GET /api/payments/status/:auctionId`.
- Provide `PAYMENT_PROVIDER=stripe|mock`. The `mock` driver completes payments through an admin/dev endpoint and uses the same internal state machine, so demos never depend on Stripe being reachable.

## 2. Payment state machine

```
pending ──checkout created──► pending (session stored)
pending ──auto-charge started──► processing ──succeeded──► succeeded
pending/processing ──failed──► failed ──(retry checkout)──► pending
pending/failed ──dueAt passes──► expired   (auction → payment_failed)
succeeded ──admin refund──► refunded
```
Auction mirrors it: `payment_pending → completed` on `succeeded`; `→ payment_failed` on `expired`.

## 3. Option A — Stripe Checkout (always available)

`POST /api/payments/checkout/:auctionId` (winner only, auction `payment_pending`, payment not `succeeded`):

```ts
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer: await ensureStripeCustomer(user),
  line_items: [{ quantity: 1, price_data: {
    currency: 'inr', unit_amount: payment.amount,
    product_data: { name: auction.title } } }],
  payment_intent_data: {
    metadata: { auctionId, paymentId },
    ...(user.wantsSavedCard ? { setup_future_usage: 'off_session' } : {}),
  },
  metadata: { auctionId, paymentId },
  success_url: `${env.CLIENT_URL}/payments/success?auction=${auctionId}`,
  cancel_url:  `${env.CLIENT_URL}/auctions/${auctionId}`,
}, { idempotencyKey: `checkout_${paymentId}_${payment.attempts.length}` });
```
Store `stripeCheckoutSessionId`, return `session.url`. Re-clicking Pay reuses an unexpired open session.

## 4. Option B — automatic off-session charge (optional)

Eligibility (all required): user has `stripeCustomerId`, `defaultPaymentMethodId`, `offSessionConsent`, and `PAYMENT_PROVIDER=stripe`.

Saving a card: `POST /api/payments/setup-session` → Checkout `mode: 'setup'`, `payment_method_types: ['card']`, with a consent checkbox in our UI that records `{at, ip, textVersion}`; webhook `checkout.session.completed` (mode setup) stores the PaymentMethod ID.

Worker job `autocharge_<auctionId>`:
```ts
try {
  const pi = await stripe.paymentIntents.create({
    amount: payment.amount, currency: 'inr',
    customer: user.stripeCustomerId, payment_method: user.defaultPaymentMethodId,
    off_session: true, confirm: true,
    metadata: { auctionId, paymentId },
  }, { idempotencyKey: `autocharge_${paymentId}` });
  // do NOT mark paid here; webhook decides. Set payment.status='processing', store PI id.
} catch (e) {
  // card_error: authentication_required / card_declined → record attempt, notify winner with Pay Now link (fallback)
}
```
Webhook outcomes: `payment_intent.succeeded` ⇒ succeeded; `payment_intent.payment_failed` ⇒ failed + fallback notification (`PAYMENT_DUE` with checkout CTA).

### India caveat (important, document in the README)
Off-session charges on India-issued cards need an RBI e-mandate; Stripe documents e-mandates for Subscriptions only, charges above ₹15,000 need the customer back on-session with authentication every time, and collection is delayed by about 26 hours after the pre-debit notice. Most auctions exceed ₹15,000, so **expect auto-charge to fall back to checkout for Indian cards**. The feature is still implemented and demonstrable with Stripe test cards; the fallback path is mandatory and tested. Sandbox off-session PaymentIntents can remain `processing` for ~15 minutes.

## 5. Webhook handler

Route `POST /api/payments/webhook` registered **before** `express.json()` with `express.raw({ type: 'application/json' })`.

```ts
const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature']!, env.STRIPE_WEBHOOK_SECRET); // 400 on failure
try { await StripeEvent.create({ eventId: event.id, type: event.type, status: 'processing' }); }
catch (e) { if (isDuplicateKey(e)) return res.sendStatus(200); throw e; }   // already handled
await handleEvent(event);      // transactional; idempotent by state machine
await StripeEvent.updateOne({ eventId: event.id }, { status: 'done', processedAt: new Date() });
res.sendStatus(200);
```
If `handleEvent` throws, set status `failed`, return 500 so Stripe retries; on retry the existing `failed` row must be re-processable (treat `failed` like new: `findOneAndUpdate({eventId, status:'failed'} → processing)`).

Events handled:
| Event | Action |
|---|---|
| `checkout.session.completed` (mode payment) | If `payment_status === 'paid'` → mark succeeded. If `unpaid` (async methods) → wait |
| `checkout.session.async_payment_succeeded` | succeeded |
| `checkout.session.async_payment_failed` | failed |
| `checkout.session.expired` | clear stored session so a new one can be created |
| `checkout.session.completed` (mode setup) | save PaymentMethod + consent |
| `payment_intent.succeeded` | succeeded (verify `amount_received === payment.amount` and currency) |
| `payment_intent.payment_failed` | failed + fallback notification |
| `charge.refunded` | `refunded` |

`markPaymentSucceeded(paymentId)` — transaction: `Payment.updateOne({_id, status: {$ne:'succeeded'}}, {status:'succeeded', paidAt})`; if `modifiedCount===1` → `Auction.updateOne({_id, status:'payment_pending'}, {status:'completed'})` + outbox `payment.succeeded`. Second call changes nothing.

Always verify the PaymentIntent/session metadata `paymentId` matches an existing payment and the amount equals `payment.amount`; otherwise log a security event and do not mark paid.

## 6. Expiry
Job `payexp_<auctionId>` at `paymentDueAt` (plus reconciler): if payment not `succeeded`/`processing` → payment `expired`, auction `payment_failed`, notify seller + buyer, count a strike on the buyer (3 strikes → suspended from bidding; feeds fraud score).

## 7. Local testing (no Docker)
```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:4000/api/payments/webhook   # prints whsec_… → STRIPE_WEBHOOK_SECRET
```
Test cards: `4242 4242 4242 4242` (success), `4000 0025 0000 3155` (3-D Secure required), `4000 0000 0000 9995` (declined). Any future expiry, any CVC.
Replay test: `stripe events resend <evt_id>` and assert nothing changes.

## 8. Tests
Signature rejected; duplicate event ignored; out-of-order events (failed after succeeded) don't downgrade; wrong amount rejected; autocharge failure falls back; expiry flips auction; checkout idempotency key reuse; mock driver parity.
