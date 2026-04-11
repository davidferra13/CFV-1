# Real-Time (SSE)

**What:** Server-Sent Events for live updates. In-memory EventEmitter bus, broadcast helpers, client hook.

**Key files:** `lib/realtime/sse-server.ts`, `lib/realtime/sse-client.ts`, `lib/realtime/broadcast.ts`, `app/api/realtime/[channel]/route.ts`
**Status:** FUNCTIONAL (authenticated, tenant-scoped)

## What's Here

- Server bus: in-memory EventEmitter
- Broadcast helpers: broadcastInsert/Update/Delete/Typing
- Client hook: `useSSE()`, `useSSEPresence()`
- Channels: inquiry, event, client, message, activity
- Presence tracking: real-time user count and active clients

## Security Model

SSE endpoints ARE authenticated. `app/api/realtime/[channel]/route.ts` requires a valid session and calls `validateRealtimeChannelAccess()` which tenant-scopes every channel type. Unknown prefixes are denied. Fails closed.

Minor known gaps (not critical): no rate limiting on connection attempts, typing/presence inner-channel validation uses string prefix matching rather than full DB lookup.

## Open Items

- Rate limiting on SSE connection attempts (low priority)
