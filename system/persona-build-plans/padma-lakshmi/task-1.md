# Build Task: Real-Time Coordination:
**Source Persona:** padma-lakshmi
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build
Implement real-time coordination features for the Chef Chat and Admin Presence pages, allowing chefs and admins to communicate directly with clients and receive updates on visitor activity.

## Files to Modify
- `app/(chef)/chat/page.tsx` -- Add a new component for real-time chat functionality.
- `app/(admin)/admin/presence/page.tsx` -- Update the existing SSE (Server-Sent Events) subscription logic to handle real-time presence updates.

## Files to Create (if any)
- `app/(chef)/chat/realtime-chat-panel.tsx` -- A new component that encapsulates the real-time chat functionality for chefs.
- `app/(admin)/admin/presence/realtime-presence-panel.tsx` -- A new component that encapsulates the real-time presence updates for admins.

## Implementation Notes
- Use WebSocket or a similar technology to establish a persistent, bi-directional communication channel between the client and server.
- Implement a mechanism to authenticate and authorize users before allowing them to participate in real-time coordination.
- Handle edge cases such as network failures, disconnections, and reconnections gracefully by implementing proper reconnection logic.

## Acceptance Criteria
1. Chefs can view and respond to messages from clients in real-time on the Chef Chat page.
2. Admins can see a live feed of visitors on the site through the Admin Presence page, with indicators for anonymous visitors, logged-in chefs, and clients.
3. The real-time coordination features do not introduce any security vulnerabilities or expose sensitive information.
4. `npx tsc --noEmit --skipLibCheck` passes without any new type errors.

## DO NOT
- Modify the existing SSE subscription logic in the Admin Presence page for anything other than updating it to use the new real-time presence panel component.
- Add new npm dependencies or change database schema related to this feature.