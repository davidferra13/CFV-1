# Real-Time (SSE)

**What:** Server-Sent Events for live updates. In-memory EventEmitter bus, broadcast helpers, client hook.

**Key files:** `lib/realtime/sse-server.ts`, `lib/realtime/sse-client.ts`, `lib/realtime/broadcast.ts`, `app/api/realtime/[channel]/route.ts`
**Status:** FUNCTIONAL (zero-auth security gap)

## What's Here

- Server bus: in-memory EventEmitter
- Broadcast helpers: broadcastInsert/Update/Delete/Typing
- Client hook: `useSSE()`, `useSSEPresence()`
- Channels: inquiry, event, client, message, activity
- Presence tracking: real-time user count and active clients

## Open Items

- **CRITICAL:** Zero authentication on SSE endpoints. Any client can connect to any channel.
