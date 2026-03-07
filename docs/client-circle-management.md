# Client Circle Management - Implementation

**Date:** 2026-03-06
**Branch:** `feature/risk-gap-closure`

## Problem

Clients inside a dinner circle had zero admin controls, even when they were the group owner. They could chat, post, and participate, but couldn't manage members, change settings, or leave the group.

## What Was Built

### Server Actions (lib/hub/group-actions.ts)

4 new actions + 1 helper:

| Action                      | What it does                                          | Who can call it                             |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| `requireGroupAdmin()`       | Internal helper: verifies profileToken is owner/admin | (internal)                                  |
| `updateMemberRole()`        | Change member to admin/member/viewer                  | Owner/admin (admins can't promote to admin) |
| `updateMemberPermissions()` | Toggle can_post, can_invite, can_pin                  | Owner/admin (can't change owner/chef)       |
| `removeMember()`            | Kick a member from the group                          | Owner/admin (admins can't remove admins)    |
| `leaveGroup()`              | Voluntarily leave a group                             | Any member (sole owner blocked)             |
| `toggleMuteCircle()`        | Mute/unmute circle notifications                      | Any member                                  |
| `updateHubGroup()`          | Updated to accept `allow_anonymous_posts`             | Owner/admin                                 |

### Settings Tab (components/hub/hub-group-settings.tsx)

New tab visible only to owners/admins. Lets them edit:

- Group name, emoji (picker with 12 options), description
- Theme (via existing ThemePicker)
- Toggle: allow member invites
- Toggle: allow anonymous posts
- Copyable invite link
- Error/success feedback with rollback

### Member Management (components/hub/hub-member-list.tsx)

Enhanced from read-only list to management UI:

- **3-dot menu** on each manageable member (appears on hover)
  - Role change: Make Admin / Member / Viewer
  - Permission toggles: Post, Invite, Pin (green = enabled, grey = disabled)
  - Remove from circle (with confirmation)
- **Leave button** on current user's row (non-owners only, with confirm dialog)
- **Copy invite link** button in header
- Optimistic state updates with error rollback
- Respects role hierarchy (admins can't manage admins, nobody can change owner/chef)

### HubGroupView Wiring (app/(public)/hub/g/[groupToken]/hub-group-view.tsx)

- Added 8th "Settings" tab (gear icon), conditionally shown for owner/admin/chef
- Passes groupId, profileToken, isOwnerOrAdmin to HubMemberList
- Mute/unmute toggle in header
- Settings changes reflect in header (name, emoji, description via localGroup state)

## Permission Model

| Caller Role | Can change roles?            | Can change permissions?       | Can remove members?       |
| ----------- | ---------------------------- | ----------------------------- | ------------------------- |
| Owner       | Yes (to admin/member/viewer) | Yes (on non-owner/chef)       | Yes (not self, not owner) |
| Admin       | Yes (to member/viewer only)  | Yes (on non-owner/chef/admin) | Yes (not admins)          |
| Chef        | Can view settings tab        | No                            | No                        |
| Member      | No management controls       | No                            | No (can leave)            |
| Viewer      | No management controls       | No                            | No (can leave)            |

## Files Changed

- `lib/hub/group-actions.ts` - 5 new exports, 1 updated type
- `components/hub/hub-group-settings.tsx` - New component (settings panel)
- `components/hub/hub-member-list.tsx` - Rewritten with management controls
- `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` - Settings tab + mute toggle wired in
