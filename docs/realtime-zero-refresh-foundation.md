# Real-Time Zero Refresh Foundation

## What Changed

ChefFlow now has shell-level live reconciliation for authenticated chef and client portals.

- `lib/realtime/broadcast.ts` emits scoped live mutation events to `tenant:{tenantId}` or `user:{userId}` alongside existing narrow table channels.
- `lib/realtime/channel-access.ts` authorizes the new live channels and explicitly tenant-scopes legacy `chef-{tenantId}` streams.
- `components/realtime/live-system-sync.tsx` subscribes once per shell, shows sync state, and reconciles server-rendered data when external mutations arrive.
- `app/(chef)/layout.tsx` and `app/(client)/layout.tsx` mount the live sync bridge globally for authenticated users.

## Why

The previous pattern made many pages current only after the current user triggered a local refresh. That does not cover changes from other users, webhooks, ingestion, SMS, calls, background jobs, or server actions running in another browser session.

The new foundation gives all authenticated shells a persistent scoped stream. When the backend emits a mutation, connected users see visible sync progress and the server component tree is refreshed automatically.

## Current Contract

- Tenant-visible changes publish to `tenant:{tenantId}`.
- User-specific changes publish to `user:{userId}`.
- Notification broadcasts fan out to `user:{recipientId}` because the existing helper parameter is the notification recipient, not the tenant.
- Legacy chef alert channels keep working through `chef-{tenantId}`, now covered by centralized authorization.

## Remaining Work

This foundation removes the need for manual reloads for mutation paths that already broadcast. The next pass is to migrate mutation paths that only call `revalidatePath`, `revalidateTag`, or local `router.refresh()` so they also emit a scoped live mutation event with enough payload for fine-grained client patching.
