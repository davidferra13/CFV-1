# ECS Gap: Network Collab Space Real-Time Messaging

> Source: ECS Scorecard 2026-04-27 | User Type: Chef Network Peers (86/100) | Dimension: Flow Continuity (17/20)

## Problem
Collab spaces use page refresh only for new messages. No WebSocket/SSE polling. Conversations feel dead.

## Spec
1. Add SSE subscription to collab space detail page (`app/(chef)/network/collabs/[spaceId]/page.tsx`)
2. Use existing `useSSE` hook with a channel like `collab-space-{spaceId}`
3. When chef sends a message, broadcast to the collab space channel
4. Client-side: append new messages to the thread without page refresh
5. Add typing indicator (optional, lower priority)

## Pattern
Read existing SSE usage in the app (search for `useSSE` or `broadcast`). Follow the same pattern.

## Acceptance
- New messages appear without refresh
- Uses existing SSE infrastructure
- Broadcast fires on message send
- No polling; event-driven only
