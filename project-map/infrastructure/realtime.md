# Real-Time (SSE)

**What:** Server-Sent Events for live updates. In-memory EventEmitter bus, broadcast helpers, client hook.

**Key files:** `lib/realtime/sse-server.ts`, `lib/realtime/sse-client.ts`, `lib/realtime/broadcast.ts`, `app/api/realtime/[channel]/route.ts`
**Status:** FUNCTIONAL (authenticated, tenant-scoped)

## What's Here

- Server bus: in-memory EventEmitter
- Broadcast helpers: broadcastInsert/Update/Delete/Typing plus tenant and user live mutation fan-out
- Client hook: `useSSE()`, `useSSEPresence()`
- Channels: user, tenant, inquiry, event, client, message, activity
- Presence tracking: real-time user count and active clients
- Shell sync: `components/realtime/live-system-sync.tsx` subscribes once per authenticated portal and reconciles server-rendered state when scoped live mutation events arrive
- Transparency: the shell shows when a live update is being applied, when it reconnects, and when visible state has been updated

## Security Model

SSE endpoints ARE authenticated. `app/api/realtime/[channel]/route.ts` requires a valid session and calls `validateRealtimeChannelAccess()` which tenant-scopes every channel type. Unknown prefixes are denied. Fails closed.

Tenant channels require `tenant:{tenantId}` to match the authenticated tenant. User channels require `user:{userId}` to match the authenticated auth user. Legacy `chef-{tenantId}` alert streams are explicitly tenant-scoped.

Minor known gaps (not critical): no rate limiting on connection attempts, typing/presence inner-channel validation uses recursive channel access checks, and some legacy mutation paths still need complete fan-out migration.

## Open Items

- Rate limiting on SSE connection attempts (low priority)
- Convert remaining local-only `router.refresh()` handlers into fine-grained client state patches where the owning component can reconcile without a server component refresh
