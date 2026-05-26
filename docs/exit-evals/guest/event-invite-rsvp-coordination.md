# Exit Eval: Guest / EVENT INVITE & RSVP COORDINATION

> Wave 4 | 7 scenarios | Status: NEEDS-DEVELOPER-REVIEW
> Evaluated: 2026-05-25 | Mode: Solo (batch)

---

## Scenario #8: Find the invitation link again

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why guest leaves:** Guest received invitation via email/SMS/group chat. Time passes, they cannot locate the original message. They search email inbox, scroll chat history, or check calendar for the link. The operational need is re-accessing a tokenized portal they already have permission to visit.

**Context ChefFlow has:**

- The guest's email address (if provided during RSVP)
- The guest token and portal URL
- The event share token
- Event date, occasion, chef name
- Cookie-based session (`guest_token_{eventId}`)

**Data source?** No external data source needed. ChefFlow owns the token and guest record entirely.

**Client-collaborative angle:** Host could forward the link again, but ChefFlow can eliminate this ask entirely. The `GuestResendLink` component (`components/sharing/guest-resend-link.tsx`) already allows email-based recovery from the share page. The `resendGuestPortalLink` action (`lib/sharing/guest-resend-actions.ts`) sends the portal link to the email on file.

**Physical reality:** Screen-based. Guest is likely on phone searching old messages. Recovery should be fast and mobile-friendly.

**Compounding:** Medium. The pattern repeats for every event the guest attends. A universal "find my events" lookup by email would compound across multiple dinners.

**Solution design:**

- Already built: `GuestResendLink` on share page, `resendGuestPortalLink` server action with rate limiting and anti-enumeration
- Already built: Cookie persistence (`guest_token_{eventId}`) for same-browser return
- Gap: No standalone recovery page (guest must know the share token URL to reach the resend form)
- Gap: No "find all my events by email" global lookup
- Build: A `/recover` public page that accepts email and sends all active portal links

**Where it appears:**

- `/share/[token]` page (GuestResendLink component already present)
- `/event/[eventId]/guest/[secureToken]` portal (expired state, but no resend from there)
- Email subject lines (already searchable: "Your event portal link")

**What remains as permanent exit:**
Guest may still search email/SMS if they do not know any ChefFlow URL to start from. The first link always arrives externally.

**Priority:** High frequency (every guest who loses a link) x Low effort (recovery page is simple) = P1
**Spec needed?** No (mostly built; gap is a standalone `/recover` page)

---

## Scenario #9: Ask the host whether they should attend

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The RSVP decision is social, not informational. The guest wants to confirm with the host: "Is this still happening?", "Should I come?", "Will Sarah be there?", "Is it formal?" These are relationship-level questions that happen in existing social channels (text, phone, in-person).

**Context ChefFlow has:**

- Event status (confirmed, upcoming)
- Guest list with RSVP statuses (visible on share page when enabled)
- Host message field (displayed on guest portal)
- Event details (date, time, occasion, dress code via notes)
- Dinner Circle chat (if event has one)

**Data source?** No. This is human judgment and social context.

**Client-collaborative angle:** The host/client can set a rich host message (`hostMessage` field in portal), publish pre-event content, and the guest list with statuses is visible. Dinner Circle chat could serve as the conversation venue, but adoption requires both parties to use it.

**Physical reality:** Text/phone is the natural channel. Voice is primary for this type of social coordination.

**Compounding:** Low. Each event is a unique social decision.

**Solution design:**

- Already built: Host message displayed in guest portal
- Already built: Guest list with RSVP status badges on share page
- Already built: Dinner Circle chat for event participants
- Marginal improvement: Richer host notes (dress code, vibe, "who else is coming" preview)
- Keep the exit clean: RSVP status stays visible after the social conversation concludes

**Where it appears:**

- `/share/[token]` guest list card
- `/event/[eventId]/guest/[secureToken]` host message section
- Dinner Circle group chat

**What remains as permanent exit:**
The social negotiation ("should I come?") will always happen in the guest's existing relationship channel. ChefFlow cannot replace text/phone for intimate social coordination.

**Priority:** High frequency x Zero effort (permanent exit) = No build needed
**Spec needed?** No

---

## Scenario #10: Coordinate plus-one permission

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why guest leaves:** Guest wants to bring someone but needs social approval from the host first. They text the host "Can I bring my partner?" and wait for a response before submitting plus-one details in the RSVP form.

**Context ChefFlow has:**

- Plus-one fields in RSVP schema (`plus_one`, `plus_one_name`, `plus_one_allergies`, `plus_one_dietary`)
- Event capacity settings (`max_capacity`, `enforce_capacity`, `waitlist_enabled`)
- Guest count tracking (`syncGuestCountFromRSVPs` function)
- Host-controlled visibility settings
- Dinner Circle for event communication

**Data source?** No. This is a host approval workflow.

**Client-collaborative angle:** Strong. The host/client sets event capacity and plus-one policy. ChefFlow could make plus-one a request that the host approves (similar to the existing `require_join_approval` pattern for viewer join requests in `UpdateEventShareAdvancedSettingsSchema`). The Circle already supports host approval patterns.

**Physical reality:** Screen-based. Guest fills form, host gets notification, approves/denies.

**Compounding:** Medium. Once a host sets a plus-one policy for their events, it applies to all future events.

**Solution design:**

- Already built: Plus-one data capture in RSVP form (name, allergies, dietary)
- Already built: Capacity enforcement and waitlist logic
- Already built: Join approval workflow pattern (`require_join_approval` on event shares)
- Gap: No explicit plus-one approval state (currently binary: allowed or not)
- Build: Add `plus_one_policy` to event share settings: `open` (anyone can), `request` (host approves), `closed` (no plus-ones)
- Build: Notification to host when plus-one requested, approval/denial flow
- Build: Guest sees "plus-one pending approval" state in portal

**Where it appears:**

- `/share/[token]` RSVP form (plus-one section)
- Chef event management (plus-one policy setting)
- Guest portal (approval status)

**What remains as permanent exit:**
If policy is "request," the guest may still text the host for a faster answer. But the formal state lives in ChefFlow.

**Priority:** Medium frequency x Medium effort = P2
**Spec needed?** Yes (plus-one approval workflow)

---

## Scenario #11: Share the event with someone else

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why guest leaves:** Guest wants to tell a friend about the dinner or invite someone. They copy the link, open their native share sheet, text, or email it. The recipient is not yet in ChefFlow, so the guest uses external channels to reach them.

**Context ChefFlow has:**

- `GuestNetworkShare` component (`components/sharing/guest-network-share.tsx`) already built
- `createViewerInviteFromGuest` action: creates viewer-only link with optional name/email
- `createGuestInviteFromGuest` action: directly adds someone as a guest with portal access
- Rate limiting (20 invites/hour per guest)
- Invite tracking (`event_share_invites` table)
- URL shortening for generated links

**Data source?** No. ChefFlow generates the shareable link; only the delivery channel (SMS/email/chat) is external.

**Client-collaborative angle:** Host controls whether guests can invite others (via share settings). The `single_use` and `allow_join_request` flags gate distribution.

**Physical reality:** Native share sheet is the expected mobile UX. Copy-to-clipboard is the minimum viable.

**Compounding:** Low per event, but the sharing infrastructure compounds (invite tracking, conversion attribution).

**Solution design:**

- Already built: `GuestNetworkShare` with viewer and guest invite modes
- Already built: Copy-to-clipboard for generated links
- Already built: Rate limiting and invite expiry
- Already built: Invite tracking in `event_share_invites`
- Gap: No native share sheet integration (Web Share API)
- Gap: No pre-composed message text for SMS/email
- Build: Add `navigator.share()` button with event title, date, and link
- Build: Pre-composed shareable message: "You're invited to [occasion] on [date]. Details: [link]"

**Where it appears:**

- `/share/[token]` page (GuestNetworkShare section, shown after RSVP)
- `/event/[eventId]/guest/[secureToken]` portal (invite controls)

**What remains as permanent exit:**
The delivery channel (SMS, WhatsApp, email) is always external. ChefFlow generates the payload; the guest delivers it through their own social channels.

**Priority:** Medium frequency x Low effort (Web Share API is trivial) = P2
**Spec needed?** No (incremental improvement to existing component)

---

## Scenario #12: Chase another guest's RSVP

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** A guest (often the host's friend or event organizer) wants to nudge someone who has not responded. They text, call, or message the person directly. Social pressure is the mechanism, and it happens in existing relationship channels.

**Context ChefFlow has:**

- Guest list with RSVP statuses visible on share page
- RSVP reminder system (`runRSVPReminderSweep` action, `rsvp_reminder_log` table)
- Reminder scheduling (`reminder_schedule`: 7d, 3d, 24h, deadline)
- Chef-triggered reminders (`SendEventReminderSchema`)
- Guest segment messaging (`draftGuestSegmentMessage` for pending/attending/waitlisted/allergies segments)

**Data source?** No. Social pressure is interpersonal.

**Client-collaborative angle:** The host/chef already has reminder tools. The gap is guest-to-guest nudging. A "remind [name]" button that sends the share link to a specific person via ChefFlow (email) would partially reduce this, but social pressure via text/call will always be more effective.

**Physical reality:** Text message is the natural nudge channel. A copyable "Hey, have you RSVPed?" message with link would help.

**Compounding:** Low. Per-event social coordination.

**Solution design:**

- Already built: RSVP status visibility (guest can see who has not responded)
- Already built: Chef-side reminder sweep and scheduling
- Already built: Guest segment messaging for pending guests
- Gap: No guest-to-guest reminder mechanism
- Build: "Copy reminder link for [name]" button on guest list (generates shareable RSVP nudge)
- Build: Pre-composed nudge message: "Hey! Can you RSVP for [occasion] on [date]? Here's the link: [url]"

**Where it appears:**

- `/share/[token]` guest list card (if guest can see pending statuses)
- Dinner Circle chat (natural place to tag/nudge)

**What remains as permanent exit:**
Social pressure will always happen in text/WhatsApp/phone. ChefFlow can provide the ammunition (link + message) but cannot replace the social channel itself.

**Priority:** Medium frequency x Low effort = P2
**Spec needed?** No (copyable nudge message is a UI addition)

---

## Scenario #13: Recover an expired, revoked, or missing guest token

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why guest leaves:** Guest clicks their portal link and sees an error state (expired, revoked, invalid). They then contact the host or chef via email/text to get a new link. The operational need is re-establishing access to their event portal.

**Context ChefFlow has:**

- Token failure states in `portal-client.tsx`: `cancelled`, `expired`, `revoked`, `invalid` with clear messaging
- `TokenExpiredPage` component for generic token failures
- `resendGuestPortalLink` action for email-based recovery
- `GuestResendLink` component (but only on the share page, not on failure states)
- Guest record persists in database even when token access state changes

**Data source?** No. ChefFlow owns the tokens and can reissue access.

**Client-collaborative angle:** Host/chef can manually resend invitations. But self-service recovery eliminates the need to contact anyone.

**Physical reality:** Screen-based. Guest is on their phone or computer staring at an error page.

**Compounding:** High. Token recovery is a universal pattern across all guest surfaces (`/share`, `/event/.../guest`, `/dietary-confirm`, `/menu-pick`, `/catalog-pick`, `/worksheet`).

**Solution design:**

- Already built: `resendGuestPortalLink` action with rate limiting and anti-enumeration
- Already built: `GuestResendLink` component on share page
- Already built: `PortalFailure` component shows clear error states with "Contact your host" guidance
- Gap: No self-service recovery from the portal failure page itself
- Gap: No recovery flow on `/dietary-confirm`, `/menu-pick`, `/catalog-pick`, `/worksheet` token failure states
- Build: Add email-based recovery form directly on all token failure pages
- Build: "Enter your email to receive a new link" on `PortalFailure` component
- Build: Standardize recovery UI across all token-gated guest surfaces

**Where it appears:**

- `/event/[eventId]/guest/[secureToken]` (PortalFailure states)
- `/share/[token]` (TokenExpiredPage)
- `/dietary-confirm/[token]`, `/menu-pick/[token]`, `/catalog-pick/[token]`, `/worksheet/[token]`

**What remains as permanent exit:**
If the guest never provided an email (name-only RSVP), they cannot self-recover and must contact the host. This is a small but real permanent slice.

**Priority:** High frequency (token loss is common) x Medium effort (standardize across surfaces) = P0
**Spec needed?** Yes (token recovery standardization across all guest surfaces)

---

## Scenario #14: Resolve duplicate RSVP by email

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why guest leaves:** Guest tries to RSVP again (different device, forgot they already did, or uses a different share link for the same event). The system detects the duplicate by email and returns the existing guest token with message "You have already RSVPed. Use the returned token to update your response." But the guest may not understand what to do next and contacts the chef/host for help.

**Context ChefFlow has:**

- Duplicate detection in `submitRSVP` (line 2616-2633): checks all share links for same event by email
- Returns `alreadyExists: true` with existing `guestToken`
- `GuestResendLink` component for "Already RSVPed? Resend my portal link"
- RSVP form handles `existingGuest` state for updates
- Cookie-based return (`guest_token_{eventId}`)

**Data source?** No. ChefFlow owns the deduplication logic entirely.

**Client-collaborative angle:** None needed. This is purely self-service.

**Physical reality:** Screen-based. Guest is filling a form and gets blocked.

**Compounding:** Medium. The pattern applies to every repeat-visit guest.

**Solution design:**

- Already built: Duplicate detection returns existing token
- Already built: "Already RSVPed? Resend my portal link" on share page
- Already built: RSVP form shows "Update Your RSVP" when existing guest detected via cookie
- Gap: When `alreadyExists` is returned, the RSVP form shows an error message but the UX for "use this token" is unclear
- Gap: On a different device (no cookie), guest sees fresh form, submits, gets blocked with no clear next step
- Build: When duplicate detected, auto-offer "Send portal link to [masked email]" button inline
- Build: Show "You already RSVPed as [name]. Want to update?" with one-click portal resend
- Build: Link to `GuestResendLink` prominently when duplicate state is detected

**Where it appears:**

- `/share/[token]` RSVP form (duplicate detection response)
- RSVP form error state
- Guest portal (already handles updates natively)

**What remains as permanent exit:**
If the guest used a different email for each RSVP attempt, deduplication cannot match them automatically. They would need to contact the host to merge records.

**Priority:** Medium frequency x Low effort (UX improvement to existing flow) = P1
**Spec needed?** No (UX polish to existing duplicate detection response)

---

## Batch Summary

| #   | Title                                               | Reclassified To                  | Spec Needed? |
| --- | --------------------------------------------------- | -------------------------------- | ------------ |
| 8   | Find the invitation link again                      | Partially Reducible              | No           |
| 9   | Ask the host whether they should attend             | Permanent                        | No           |
| 10  | Coordinate plus-one permission                      | Reducible + Client-Collaborative | Yes          |
| 11  | Share the event with someone else                   | Reducible                        | No           |
| 12  | Chase another guest's RSVP                          | Bridgeable                       | No           |
| 13  | Recover an expired, revoked, or missing guest token | Reducible                        | Yes          |
| 14  | Resolve duplicate RSVP by email                     | Reducible                        | No           |

---

## Key Findings

**Strongest existing coverage:** Scenarios #11 and #14. The `GuestNetworkShare` component and duplicate RSVP detection are already well-built; only UX polish remains.

**Biggest gap:** Scenario #13. Token recovery is fragmented. The `resendGuestPortalLink` action exists but is only surfaced on the share page, not on the actual failure pages where guests need it most. This is a P0 gap identified in both the exit-points analysis and the never-leaves analysis.

**Architectural pattern:** ChefFlow's token-based guest system is comprehensive (RSVP, portal, dietary, menu-pick, catalog-pick, worksheet, feedback, review, tip). The missing piece is a universal recovery layer that works across all these surfaces, not just `/share`.

**Codebase evidence:**

- `lib/sharing/guest-resend-actions.ts`: Full recovery action, rate-limited, anti-enumeration
- `lib/sharing/actions.ts`: 2900+ line file with complete RSVP, sharing, invitation, and reminder infrastructure
- `components/sharing/guest-network-share.tsx`: Viewer and guest invite creation from guest context
- `components/sharing/guest-resend-link.tsx`: Recovery UI (only on share page)
- `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx`: Portal failure states without recovery
- `components/ui/token-expired-page.tsx`: Generic failure page without recovery
