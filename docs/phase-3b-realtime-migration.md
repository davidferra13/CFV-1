# Phase 3b: SSE Realtime (Replaces Supabase Realtime)

## What Changed

All real-time features (live updates, typing indicators, presence tracking) now use Server-Sent Events (SSE) with an in-memory event bus instead of Supabase Realtime channels.

## Architecture

```
Server Action (after mutation)
  |
  v
broadcast(channel, event, data)  [lib/realtime/sse-server.ts]
  |
  v
In-memory EventEmitter
  |
  v
SSE endpoint streams to connected clients  [/api/realtime/{channel}]
  |
  v
useSSE() hook receives events  [lib/realtime/sse-client.ts]
  |
  v
Component callback updates UI
```

For typing indicators:

```
Client POST /api/realtime/typing  ->  broadcastTyping()  ->  SSE to other clients
```

For presence:

```
Client POST /api/realtime/presence (every 30s)  ->  trackPresence()  ->  SSE sync to admin panel
```

## Files Created

| File                                  | Purpose                                                              |
| ------------------------------------- | -------------------------------------------------------------------- |
| `lib/realtime/sse-server.ts`          | In-memory EventEmitter bus, broadcast(), subscribe(), presence store |
| `lib/realtime/sse-client.ts`          | useSSE() React hook with auto-reconnect, useSSEPresence()            |
| `lib/realtime/broadcast.ts`           | Convenience wrappers: broadcastInsert/Update/Delete/Typing           |
| `app/api/realtime/[channel]/route.ts` | SSE streaming endpoint with heartbeat                                |
| `app/api/realtime/typing/route.ts`    | POST endpoint for typing indicators                                  |
| `app/api/realtime/presence/route.ts`  | POST endpoint for presence heartbeats                                |

## Files Modified (Library)

| File                            | Change                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| `lib/realtime/subscriptions.ts` | 5 hooks rewritten to use useSSE() instead of Supabase channels |
| `lib/hub/realtime.ts`           | 4 functions rewritten to use EventSource + POST endpoints      |
| `lib/chat/realtime.ts`          | 4 functions rewritten (messages, inbox, typing, presence)      |
| `lib/notifications/realtime.ts` | subscribeToNotifications uses EventSource                      |
| `lib/messages/realtime.ts`      | subscribeToMessages uses EventSource                           |

## Files Modified (Components)

| File                                              | Change                                                 |
| ------------------------------------------------- | ------------------------------------------------------ |
| `components/activity/live-presence-panel.tsx`     | useSSE() replaces Supabase channel                     |
| `components/activity/client-presence-monitor.tsx` | useSSE() replaces Supabase channel                     |
| `components/admin/admin-presence-panel.tsx`       | useSSEPresence() replaces Supabase presence            |
| `components/admin/presence-beacon.tsx`            | POST /api/realtime/presence replaces Supabase .track() |
| `components/dashboard/live-inbox-widget.tsx`      | useSSE() replaces @supabase/ssr createBrowserClient    |

## Components Unchanged

These components only call library functions (which were migrated), so they needed no changes:

- `components/hub/hub-feed.tsx` (calls lib/hub/realtime.ts)
- `components/chat/chat-view.tsx` (calls lib/chat/realtime.ts)
- `components/notifications/notification-provider.tsx` (calls lib/notifications/realtime.ts)

## Channel Naming Convention

| Pattern                          | Example                    | Used For                 |
| -------------------------------- | -------------------------- | ------------------------ |
| `events:{id}`                    | `events:abc123`            | Event status changes     |
| `notifications:{tenantId}`       | `notifications:chef_xyz`   | New notifications        |
| `chat_messages:{conversationId}` | `chat_messages:conv_123`   | New chat messages        |
| `conversations:{tenantId}`       | `conversations:chef_xyz`   | Inbox updates            |
| `activity_events:{tenantId}`     | `activity_events:chef_xyz` | Client activity          |
| `hub_messages:{groupId}`         | `hub_messages:grp_abc`     | Hub social feed          |
| `typing:chat:{id}`               | `typing:chat:conv_123`     | Chat typing indicators   |
| `typing:hub:{id}`                | `typing:hub:grp_abc`       | Hub typing indicators    |
| `presence:chat:{id}`             | `presence:chat:conv_123`   | Chat online status       |
| `presence:site`                  | `presence:site`            | Admin site-wide presence |

## How Server Actions Broadcast

After any mutation, server actions should call the broadcast helpers:

```typescript
import { broadcastInsert } from '@/lib/realtime/broadcast'

// In a server action after inserting a notification:
broadcastInsert('notifications', tenantId, newNotification)
```

This is the application-level replacement for Supabase's `postgres_changes`. Instead of the database broadcasting changes, the application code does it explicitly after each mutation.

## Presence Lifecycle

1. Component mounts -> POST `/api/realtime/presence` with session data
2. Every 30 seconds -> POST heartbeat to keep presence alive
3. Component unmounts -> interval stops, no more heartbeats
4. Server-side cleanup (every 30s) -> entries older than 2 minutes are evicted
5. Eviction broadcasts `presence_leave` to SSE listeners

## Limitations vs Supabase Realtime

- **Single process only**: The in-memory EventEmitter doesn't work across multiple Node.js processes. For ChefFlow (single PC deployment), this is fine.
- **No automatic DB change detection**: Server actions must explicitly call `broadcast()` after mutations. If a mutation doesn't broadcast, SSE clients won't see the update.
- **Presence is approximate**: 30-second heartbeat means up to 30 seconds of staleness for online/offline status.

## What Still Uses Supabase SDK

After this phase, the only remaining Supabase SDK usage is in:

- Scripts and tests that import directly from `@supabase/supabase-js`
- The browser client file `lib/supabase/client.ts` (can be deleted in Phase 4)
- Queue providers and cron jobs (Phase 4 cleanup)
