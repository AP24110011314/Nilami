# FRONTEND.md — React 19 + Vite + TypeScript + Tailwind

## 1. Routes
| Route | Page | Access |
|---|---|---|
| `/` | Home: ending soon, trending, categories | public |
| `/auctions` | Browse/search/filter | public |
| `/auctions/:id` | **Live auction page** | public (bid requires login) |
| `/login` `/register` `/verify-email` `/forgot-password` `/reset-password` | Auth | public |
| `/dashboard` | Buyer: active bids (leading/outbid), watchlist, wins + Pay Now | user |
| `/dashboard/notifications` | Notification list | user |
| `/seller` | Seller overview + analytics | seller |
| `/seller/new` `/seller/auctions/:id/edit` | Create/edit auction | seller |
| `/seller/auctions/:id` | Live monitor (bids, bidders count, chart) | owner |
| `/payments/success` | Polls payment status | user |
| `/settings/payments` | Save card + auto-charge consent | user |
| `/users/:id` | Public seller profile + reviews | public |
| `/admin` | Fraud queue, users, auctions, analytics | admin |

## 2. State strategy
- **Server state:** TanStack Query (`auctions`, `auction/:id`, `bids/:id`, `notifications`, ...).
- **Socket → cache:** one `useAuctionSocket(auctionId)` hook patches the query cache (`queryClient.setQueryData`) on `bid-updated`, `auction-extended`, `auction-ended`. Reject stale events by `bidCount`.
- **Client state:** Zustand for auth (access token in memory), socket instance, toasts, server clock offset.
- Axios/fetch wrapper: attaches token, on 401 calls `/auth/refresh` once then retries.

## 3. Live auction page layout
1. Image gallery · title · seller card with rating/badge.
2. Price panel: current price (large, `aria-live="polite"`), next minimum, bid count, viewer count, reserve met/not met chip.
3. Countdown (`useCountdown(endsAt)`), turns amber under 60 s, red under 10 s; "Extended +30 s" flash.
4. Bid form: amount input prefilled with `minNextBid`, quick buttons `+min`, `+2×min`, `+5×min`; confirm dialog if > 2× current; submit disabled while pending; on `BID_TOO_LOW` show fresh minimum and prefill it.
5. Bid history list (virtualised if long), newest first, with highlight animation on new bid.
6. Mini price-progression chart.
7. Status states: scheduled (countdown to start), active, ended (winner banner / "You won — Pay now"), unsold, cancelled.
8. Watch button (bell) with reminder selector.

## 4. Hooks
- `useServerClock()` — maintains `offset`; `now()` = `Date.now() + offset`.
- `useCountdown(endsAt)` — returns `{ms, label, phase}`; ticks every 250 ms; pauses when tab hidden and recomputes on show.
- `usePlaceBid(auctionId)` — generates `crypto.randomUUID()` per user intent, retains it across automatic retries, maps error codes to messages.
- `useNotifications()` — list + unread count + socket `notification` push → toast + cache update.
- `useAuctionSocket(auctionId)` — join on mount, leave on unmount, resync on reconnect/visibility.

## 5. UX rules
- Never optimistically show a bid as accepted; show "Placing bid…" until the server replies.
- Outbid: toast + persistent banner "You're outbid — current ₹X" with one-click rebid at minNext.
- Format money only through `lib/money.ts` (`formatINR(paise)`, `rupeesToPaise(string)` with integer math).
- Masked bidder names, localised time in user timezone, relative times ("12 s ago").
- Accessible: focus management in dialogs, visible focus rings, color-contrast AA, `prefers-reduced-motion` disables flashes, all actions keyboard reachable.
- Responsive: single column ≤ 768 px with sticky bottom bid bar on mobile.
- Loading skeletons; error boundaries per route; offline banner when socket disconnected (with auto-retry).

## 6. Design tokens (Tailwind)
Primary indigo, accent amber (countdown urgency), success green (leading), danger red (outbid/ending). Rounded-2xl cards, soft shadows, Inter font. Dark mode via `class` strategy.

## 7. Client tests
Vitest + Testing Library: countdown phases with fake timers, money utils, bid form error mapping, socket cache patching with a mocked socket. Playwright E2E: multi-context bidding (see `TESTING.md`).
