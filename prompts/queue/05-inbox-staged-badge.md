# Task: Inbox - STAGED Badge + Confirm/Dismiss Actions

## Description

Build inbox surface showing staged clients and inquiries with confirm/dismiss workflow. Chef can accept the auto-match or trash it.

## UI Surface

**New section in chef inbox / inquiries page:**

- Badge: "STAGED" (yellow/amber) next to client name
- Display: sender email, subject, preview of first message
- Actions:
  - "Confirm" - move staged client+inquiry to active, archive communication_event
  - "Dismiss" - delete staged client+inquiry, mark communication_event as archived
  - "Edit" - open modal to manually adjust matched client name/phone before confirming

## Components

- `components/inbox/staged-inquiry-card.tsx` (single staged item display + actions)
- `components/inbox/staged-inquiries-section.tsx` (collection view)
- Page integration: `app/(chef)/inquiries/page.tsx` or new tab in existing inquiries

## Server Actions

- `confirmStagedInquiry(inboxItemId)` - convert staged to active
- `dismissStagedInquiry(inboxItemId)` - delete staged client + inquiry
- `updateStagedClientData(stagedClientId, { firstName, lastName, phone })` - pre-confirmation edits

## UI Behavior

- Auto-refresh when new staged inquiries arrive (SSE from email webhook)
- Count badge on inbox/inquiries nav item (number of staged)
- Desktop only initially (no mobile version required yet)

## Files

- `components/inbox/staged-inquiry-card.tsx`
- `components/inbox/staged-inquiries-section.tsx`
- `app/(chef)/inquiries/page.tsx` (integrate new section)
- `lib/email/inbox-actions.ts` (server actions)

## Dependencies

- Staging columns in `communication_events`
- Staged inquiry display data (joined with client + communication_event)
