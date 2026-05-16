# Personal Assistant / Delegate Access

> **Status:** SPEC-READY
> **Priority:** P2
> **Origin:** "Picky Client" persona stress test, edge case: wealthy clients have PAs handling logistics (2026-05-16)
> **Depends On:** Client Portal, Dinner Circle Event Hub

---

## Problem Statement

Wealthy client says: "My assistant Sarah handles all the logistics. Loop her in."

Sarah needs to:

- View event details
- Answer chef's questions about venue, timing, guest count
- Approve menu selections
- Handle payment logistics
- Coordinate with other vendors

Sarah is NOT the client. She doesn't eat the food. She doesn't set the vibe. She doesn't choose the menu style. But she has operational authority to move things forward.

Currently: the portal is single-user (host token). Either the client OR Sarah can access it. Not both with different permissions.

---

## Solution

### 1. Delegate Role

New role in the event access model:

| Role                        | Can Do                                                                                                                      | Cannot Do                                                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Host** (client)           | Everything. Menu approval, style decisions, guest management, payment.                                                      | N/A                                                                                                   |
| **Delegate** (PA/assistant) | View all details, answer logistics questions, approve on host's behalf (if authorized), manage guest list, handle payments. | Cannot change menu style preferences, cannot override host's explicit decisions, cannot delete event. |
| **Guest**                   | View menu, submit dietary, RSVP.                                                                                            | Cannot see pricing, contracts, or operational details.                                                |

### 2. Adding a Delegate

Host can add a delegate from their portal:

- "Add an assistant/delegate" button
- Enter: name, email, phone
- Permission level: "Full delegate" (can approve on my behalf) or "View + coordinate only" (can see everything, but approvals still come to me)
- Delegate gets their own portal token (separate from host's)
- Delegate notifications: CC'd on all event communications

### 3. Chef-Side Visibility

Chef sees who they're talking to:

- Messages from delegate tagged: "[Sarah - Assistant to Mrs. Smith]"
- Chef knows: logistics questions go to Sarah, taste/style questions go to the host
- Inquiry detail shows: "Primary contact: Mrs. Smith. Delegate: Sarah (Full access)."
- Chef can choose who to message: host, delegate, or both

### 4. Delegate in the Circle

Delegate joins the dinner circle with a "coordinator" badge:

- Can see everything the host sees
- Can manage guest list (add/remove guests)
- Can post updates on host's behalf
- Cannot set theme/occasion (that's the host's personal choice)

### 5. Multi-Delegate Support

Some clients have:

- PA for scheduling
- Event planner for logistics
- Spouse as co-decision-maker (different from delegate)

Support multiple delegates with different permission scopes:

- Each delegate gets explicit permissions (view finances, manage guests, approve menus, handle payments)
- No delegate gets permissions the host hasn't explicitly granted

---

## Files Likely Touched

- `lib/client-portal/delegate-actions.ts` (new, delegate CRUD, permission management)
- `lib/client-portal/access-model.ts` (extend with delegate role)
- `app/client/[token]/page.tsx` (extend with delegate view, permission gates)
- `app/client/[token]/delegates/page.tsx` (new, manage delegates)
- `components/client-portal/add-delegate-form.tsx` (new)
- `components/client-portal/delegate-badge.tsx` (new)
- `lib/dinner-circles/circle-hub-actions.ts` (extend with coordinator role)
- `app/(chef)/inquiries/[id]/page.tsx` (show delegate info on inquiry)
- Database: `event_delegates` table (event_id, name, email, phone, token, permission_level, permissions[])

---

## Verification

- [ ] Host can add delegate with name/email
- [ ] Delegate gets separate portal token
- [ ] Delegate can view all event details
- [ ] Full delegate can approve on host's behalf
- [ ] View-only delegate cannot approve
- [ ] Chef sees delegate label on messages
- [ ] Chef can message host and delegate separately
- [ ] Delegate appears in circle with coordinator badge
- [ ] Multiple delegates supported with different permissions
- [ ] Delegate cannot override host's explicit decisions
