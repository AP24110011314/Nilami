# REALTIME.md — Socket.IO

## 1. Server setup
- Socket.IO attached to the same HTTP server as Express (port 4000). CORS origin = `CLIENT_URL`. Transports: `websocket` first, polling fallback.
- `@socket.io/redis-adapter` using two ioredis connections (pub/sub) so multiple API instances share rooms.
- Handshake auth: client sends `auth: { token: <access JWT> }`. Middleware verifies it; anonymous sockets are allowed read-only (`socket.data.userId = null`).
- On connect (authenticated): `socket.join('user:<userId>')`; admins also join `admin`.
- Access tokens expire in 15 min: client reconnects with a fresh token after each refresh (`socket.auth = {...}; socket.disconnect().connect()`), or emits `auth-refresh`.

## 2. Rooms
| Room | Members | Used for |
|---|---|---|
| `auction:<id>` | Anyone viewing that auction | price, countdown, ending, ended |
| `user:<id>` | All sockets of that user | outbid, notifications, payment |
| `admin` | Admins | fraud alerts |

## 3. Events

Client → server (always with ack callback):
| Event | Payload | Ack |
|---|---|---|
| `join-auction` | `{ auctionId }` | `{ ok, snapshot, serverTime }` |
| `leave-auction` | `{ auctionId }` | `{ ok }` |
| `time-sync` | none | `{ serverTime }` |

Server → client:
| Event | Room | Payload |
|---|---|---|
| `bid-updated` | auction | `{ auctionId, currentPrice, minNextBid, bidCount, highestBidderMasked, bid:{ id, amountMasked?, amount, at, bidderMasked }, endsAt, serverTime }` |
| `auction-extended` | auction | `{ auctionId, endsAt, extensionCount }` |
| `auction-ending` | auction | `{ auctionId, endsAt, secondsLeft }` |
| `auction-ended` | auction | `{ auctionId, status, winnerMasked?, finalPrice? }` |
| `viewer-count` | auction | `{ auctionId, count }` (throttled, every 3 s) |
| `outbid-notification` | user | `{ auctionId, title, yourLastBid, currentPrice, minNextBid }` |
| `notification` | user | persisted notification document |
| `payment-success` | user | `{ auctionId, paymentId }` |
| `fraud-alert` | admin | flag summary |

Payload rules: never include emails/IDs of other bidders; mask names (`A***n`). Always include `endsAt` and `serverTime` so clients can correct their clock.

## 4. Ordering and staleness
Events carry `auction.version` (and the bid `amount`). The client ignores any `bid-updated` whose `bidCount` is lower than what it already has. This protects against reordering between REST responses and socket events.

## 5. Reconnect and resync
1. On every `connect` (including reconnect), the client calls `join-auction`; the ack returns a full snapshot (price, endsAt, last 20 bids, status) which replaces local state.
2. On `document.visibilitychange → visible`, refetch the auction.
3. Do **not** rely on Socket.IO connection-state recovery (not supported with the standard Redis adapter); the snapshot approach is simpler and always correct.

## 6. Countdown
- REST and ack responses include `serverTime`. Client stores `offset = serverTime − Date.now()` (take the sample with the smallest round-trip time).
- Display: `remaining = endsAt − (Date.now() + offset)`; tick each 250 ms using `requestAnimationFrame` or an interval; clamp at 0 and show "Ending…" until `auction-ended` or a refetch confirms the status.
- The bid button is *not* disabled solely by the countdown — the server decides (avoids false negatives when the clock is slightly off).

## 7. Emission rules
- Emit only after the DB transaction commits.
- Emit from API via `io`, from worker via redis-emitter, using the same event helper (`realtime/events.ts`) so payload shapes live in one place.
- Persist anything the user must not miss (notifications) before emitting.

## 8. Tests
- Two socket clients join the same room; one bid → both receive `bid-updated`.
- A client not in the room receives nothing.
- Outbid event goes only to the previous leader's `user:` room.
- Disconnect, bid happens, reconnect → snapshot is current.
- Worker-emitted `auction-ended` reaches API-connected clients (Redis emitter path).
