# Exit Eval: Client / COMMUNICATION

> Wave 2 | 8 scenarios | Evaluator: Claude (Solo mode)
> Date: 2026-05-25
> Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #27: Text the chef directly

**Original classification:** Permanent exit
**Reclassified to:** Permanent (Bridgeable at margins)

**Why client leaves:** The client wants an immediate, familiar, low-friction way to reach the chef. Texting is muscle memory. The decision behind it: ask a quick question, confirm a detail, share a last-minute change, or express something sensitive that feels too formal for a portal message.

**Context ChefFlow has:**

- Client name, phone, email
- Event date, guest count, menu, location
- Full conversation history in portal chat (`lib/chat/actions.ts`)
- Inquiry and event context linkage
- Communication preferences and channel history (`lib/communication/managed-channels.ts`)

**Data source?** No. SMS is the destination, not a data source.

**Client-collaborative angle:** Limited. The client texts because it is their default channel. A Dinner Circle cannot collect this intent in advance because it is reactive/spontaneous.

**Physical reality:** Phone in hand, quick thumb-type. Portal requires app open, login, navigate to chat. SMS is 0-tap from lock screen reply.

**Compounding:** Medium. Each text thread builds relationship context that ChefFlow loses. If text summaries were captured, client preference patterns compound over time.

**Solution design:**

- Managed SMS via Twilio already exists for outbound (`lib/communication/cadence-scheduler.ts`, `lib/communication/managed-channels.ts`)
- Inbound SMS webhook to route client texts into the unified thread (`lib/communication/unified-actions.ts` already has `getUnifiedThread`)
- Auto-reply with portal deep link for complex topics (menu changes, guest updates)
- Post-conversation summary extraction for CIL signal capture

**Where it appears:**

- Chef communication control plane (`lib/communication/control-plane.ts`)
- Unified thread view (chef side)
- Client notification preferences

**What remains as permanent exit:**
Client will always text. SMS is the most frictionless channel. ChefFlow bridges by capturing inbound texts into the system, not by replacing the channel.

**Priority:** Very high frequency x Medium effort = High priority
**Spec needed?** No (infrastructure exists; needs inbound SMS webhook wiring)

---

## Scenario #28: WhatsApp the chef

**Original classification:** Permanent exit
**Reclassified to:** Permanent (Bridgeable at margins)

**Why client leaves:** International clients or those who prefer media-rich messaging use WhatsApp. They share photos of inspiration, voice notes, and location pins. WhatsApp feels more personal than email and supports group threads.

**Context ChefFlow has:**

- Client profile and contact info
- Event details and menu context
- Communication channel preference tracking (`lib/communication/channel-meta.ts`)
- WhatsApp recognized as a channel in `mapSourceToInquiryChannel` (`lib/communication/actions.ts` line 33)

**Data source?** No. WhatsApp is a communication channel, not a data source.

**Client-collaborative angle:** Minimal. WhatsApp usage is habit-driven. The shared media (inspiration photos, location screenshots) could be captured if ChefFlow offered an easy upload path.

**Physical reality:** Phone-native. WhatsApp has voice messages, photo sharing, location pins, and read receipts built in. Portal chat supports images and files (`lib/chat/actions.ts` allows image/file message types) but requires login.

**Compounding:** Medium. Photos shared via WhatsApp (kitchen layouts, inspiration, dietary labels) have lasting value if captured into event context.

**Solution design:**

- WhatsApp Business API integration for inbound message capture
- Media forwarding to event attachments or chat thread
- "Save to ChefFlow" auto-prompt when inspiration/logistics media detected
- Log WhatsApp exchanges into unified thread as "external channel" entries

**Where it appears:**

- Communication control plane (already tracks WhatsApp as channel)
- Client conversation history
- Event media vault

**What remains as permanent exit:**
WhatsApp will remain the primary channel for many international clients. ChefFlow bridges by logging summaries and media, not replacing the app.

**Priority:** Medium frequency x High effort = Medium priority
**Spec needed?** No (WhatsApp Business API is a later-phase integration; current bridge is manual logging)

---

## Scenario #29: Call the chef

**Original classification:** Permanent exit
**Reclassified to:** Permanent (Bridgeable)

**Why client leaves:** Voice is needed for sensitive topics (budget concerns, complaints), urgent day-of changes, nuanced decisions (menu philosophy, dietary complexity for a large group), or when the client simply prefers talking over typing.

**Context ChefFlow has:**

- Full AI calling system for vendor calls (`lib/calling/twilio-actions.ts`, `lib/calling/voice-helpers.ts`)
- Call audit bridge logging (`lib/communication/call-audit-bridge.ts`)
- Post-call automation engine (`lib/calling/post-call-actions.ts`)
- Voicemail actions (`lib/calling/voicemail-actions.ts`)
- HARD RULE: AI calling system never calls clients (vendor-only, per `twilio-actions.ts` line 14)

**Data source?** No. Voice call is the destination.

**Client-collaborative angle:** None directly. Calls are spontaneous. However, post-call note capture turns ephemeral decisions into persistent data.

**Physical reality:** Voice is the most natural human interface for complex emotional or nuanced exchanges. No screen needed. Can happen while driving, cooking, or managing an event.

**Compounding:** High. Call decisions (budget agreed, menu direction chosen, date confirmed) are high-value signals. Without capture, they exist only in memory.

**Solution design:**

- Post-call note prompt for chef (already have `lib/calls/actions.ts`)
- Auto-generated call summary from transcript if Twilio recording enabled
- Decision extraction: tag outcomes (budget confirmed, date changed, menu approved)
- Link call outcomes to event timeline and client passport
- Client-visible "call summary" in portal (transparency)

**Where it appears:**

- Chef communication control plane
- Event timeline (decision logged)
- Client portal activity feed

**What remains as permanent exit:**
Voice calls will always happen. ChefFlow captures decisions afterward, never replaces the call.

**Priority:** High frequency x Low effort (post-call notes) = High priority
**Spec needed?** No (post-call capture exists; needs client-visible summary surface)

---

## Scenario #30: Email outside the portal

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Client replies to a ChefFlow email notification directly in Gmail/Outlook instead of clicking through to portal. Or client initiates new email thread from their address book. The email notification itself pulls them into external email.

**Context ChefFlow has:**

- Full Gmail sync engine with multi-platform parsers (`lib/gmail/sync.ts`)
- Inbound email webhook (`app/api/webhooks/email/inbound/route.ts`)
- Managed email channels with Cloudflare worker routing (`lib/communication/managed-channels.ts`)
- Portal introduction strategy (`lib/email/portal-strategy.ts`)
- Quick reply from chef side (`lib/communication/quick-reply-actions.ts`)
- Communication classification rules and pipeline (`lib/communication/actions.ts`)
- Historical scan for past email import (`lib/gmail/historical-scan.ts`)

**Data source?** Yes. Gmail/email is a data source ChefFlow already drinks from via the sync engine.

**Client-collaborative angle:** High. If email replies automatically appear in portal context, the client gradually learns the portal IS the conversation. Portal strategy already implements progressive introduction (Version A/B).

**Physical reality:** Email reply is 1-tap from notification. Portal click-through requires authentication and navigation. Email wins on friction for quick replies.

**Compounding:** High. Every email captured builds the unified thread. Past email history compounds into relationship context.

**Solution design:**

- Inbound email webhook already routes replies to managed addresses (BUILT)
- Gmail sync captures all inbound email to the chef's address (BUILT)
- Portal strategy introduces clients to portal after 2+ exchanges (BUILT)
- Missing: client-side "reply here" that works like email (in-portal quick reply box)
- Missing: email notification "reply to this email" that routes back into ChefFlow thread

**Where it appears:**

- `app/api/webhooks/email/inbound/route.ts` (inbound routing)
- `lib/gmail/sync.ts` (Gmail sync engine)
- `lib/email/portal-strategy.ts` (portal introduction)
- `lib/communication/managed-channels.ts` (managed email addresses)
- Client chat inbox (`app/(client)/my-chat/page.tsx`)

**What remains as permanent exit:**
Once reply-routing is fully wired, very little. Some clients will always compose new emails from their inbox rather than the portal, but all replies will flow back in.

**Priority:** Very high frequency x Low effort (mostly built) = Critical priority
**Spec needed?** No (infrastructure is built; needs "reply-to" header wiring in outbound notifications)

---

## Scenario #31: Coordinate through an assistant or planner

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable (Reducible + Client-Collaborative)

**Why client leaves:** The client delegates event planning to an assistant, event planner, or family member. This person becomes the primary point of contact but has no ChefFlow access. All coordination happens via email, phone, or text between chef and delegate.

**Context ChefFlow has:**

- Full delegate/cohost system (`lib/delegation/delegate-types.ts`, `lib/delegation/delegate-actions.ts`)
- Delegate roles: `full_delegate` and `view_coordinate`
- Granular permissions: view_events, view_finances, manage_guests, approve_menus, handle_payments, answer_logistics, post_updates
- Invite by email with token acceptance
- Activity logging for delegate actions

**Data source?** No. The assistant/planner is a human intermediary.

**Client-collaborative angle:** Very high. The Dinner Circle + delegation system can give the assistant direct portal access. The assistant becomes a first-class participant rather than an email relay.

**Physical reality:** Assistants typically work at desks with full computer access. Portal is ideal for them. They need clear permission boundaries and notification routing.

**Compounding:** High. A recurring client's assistant who has portal access becomes increasingly efficient. Past event context, vendor contacts, and preferences persist.

**Solution design:**

- Delegate system is BUILT (`lib/delegation/delegate-actions.ts`)
- Invite flow with granular permissions is BUILT
- Missing: client-initiated delegate invite (currently chef-only?)
- Missing: delegate notification routing (assistant gets the notifications, not the client)
- Missing: "on behalf of" labeling in communication trail

**Where it appears:**

- Delegation system (`lib/delegation/`)
- Event access control
- Notification routing
- Client portal settings (invite delegate)

**What remains as permanent exit:**
Planners with their own software (HoneyBook, Aisle Planner) will always use those tools for broader event management. ChefFlow bridges by giving them access to the food-specific slice.

**Priority:** Medium frequency x Low effort (mostly built) = Medium-high priority
**Spec needed?** No (delegate system exists; needs client-side invite surface and notification routing)

---

## Scenario #32: Share files or inspiration

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable (Partially Reducible)

**Why client leaves:** The client has existing assets (Pinterest boards, Instagram saves, photos from a restaurant, a PDF from a wedding planner, a spreadsheet of guests) stored in external services. They want to share these with the chef.

**Context ChefFlow has:**

- Chat supports file and image uploads (`lib/chat/actions.ts`: image, file, link message types)
- Allowed types: JPEG, PNG, HEIC, HEIF, WebP, PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
- Max file size: 10MB images, 25MB documents
- Hub media system for group file sharing (`lib/hub/media-actions.ts`)
- Event context linkage in conversations

**Data source?** Partially. Files are data, but the browsing/curation (Pinterest, Instagram) is the destination experience.

**Client-collaborative angle:** High. Client shares inspiration and files directly. The Circle can host a shared media board where client drops assets and chef responds.

**Physical reality:** Phone photo sharing is the most common case. Client takes a photo of a restaurant dish or screenshots a Pinterest pin. Needs to be as easy as texting a photo.

**Compounding:** Medium. Inspiration collections for repeat clients compound. "Last time you loved this aesthetic" drives future menus.

**Solution design:**

- Chat file upload already supports common types (BUILT)
- Hub media board for group event planning (BUILT)
- Missing: "inspiration board" surface on event detail (pin links, images, notes)
- Missing: drag-and-drop or share-sheet integration for mobile
- Missing: Pinterest/Instagram link preview rendering in chat

**Where it appears:**

- Client chat (`app/(client)/my-chat/[id]/page.tsx`)
- Event detail page
- Hub group media (`lib/hub/media-actions.ts`)

**What remains as permanent exit:**
Pinterest, Instagram, and Google Drive will always be where clients browse and curate. ChefFlow captures what they choose to share, not the browsing experience.

**Priority:** Medium frequency x Medium effort = Medium priority
**Spec needed?** No (file sharing exists; inspiration board is a UX enhancement)

---

## Scenario #33: Ask guests questions manually

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** The host needs to collect dietary restrictions, RSVPs, or preferences from guests. Without a system, they text each guest individually, chase responses, and manually compile into a list for the chef.

**Context ChefFlow has:**

- Public dietary confirmation page (`app/(public)/dietary-confirm/[token]/page.tsx`)
- Full dietary form: common restrictions, severity levels, spice preferences, free-text notes
- Guest lead system (`lib/guests/lead-actions.ts`)
- Batch email button for guest outreach (`components/guest-leads/batch-email-button.tsx`)
- Guest outreach email template (`lib/email/templates/guest-outreach.tsx`)
- Guest portal by token (no login required)
- RSVP and dietary rollup in client portal (Category 7 of never-leaves doc)

**Data source?** No. Guests are the data source, and ChefFlow already collects from them directly.

**Client-collaborative angle:** Maximum. This is THE client-collaborative scenario. The host shares links; guests self-serve dietary info. No manual collection needed.

**Physical reality:** Guests receive a link (text or email), tap it, fill a quick form on mobile. No login, no app install. Optimized for phone completion.

**Compounding:** High. Guest dietary profiles persist across events. Repeat guests never re-submit. Host builds a permanent guest database.

**Solution design:**

- Dietary confirmation token flow is BUILT
- Guest outreach email is BUILT
- Batch email sending is BUILT
- Missing: automated reminder for non-responders
- Missing: host-visible completion dashboard ("4 of 8 guests responded")
- Missing: WhatsApp/SMS delivery option for dietary links (not just email)

**Where it appears:**

- `app/(public)/dietary-confirm/[token]/page.tsx`
- `components/guest-leads/batch-email-button.tsx`
- `lib/email/templates/guest-outreach.tsx`
- Client event detail (guest list with dietary status)

**What remains as permanent exit:**
Very little. Some hosts will still text a few close friends directly, but the systematic collection is fully in-app.

**Priority:** Very high frequency x Already mostly built = Critical (finish remaining gaps)
**Spec needed?** No (core is built; needs reminder automation and completion tracking)

---

## Scenario #34: Escalate a support issue

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Something is blocked, confusing, or wrong. The client cannot find the answer in the portal, cannot reach the chef through normal channels, or has a complaint that needs resolution. They email a support address, search for a help form, or express frustration externally.

**Context ChefFlow has:**

- Client help page with FAQ (`app/(client)/my-help/page.tsx`)
- FAQ accordion component (`components/help/faq-accordion.tsx`)
- Direct link to chef chat from help page ("Contact Your Chef" links to `/my-chat`)
- Client notification system
- Event status visibility and timeline

**Data source?** No. Support is a workflow, not a data source.

**Client-collaborative angle:** Low. Escalation is reactive. However, proactive status visibility reduces the need to escalate.

**Physical reality:** Screen-based. Client is frustrated and wants immediate clarity. Quick resolution matters more than channel.

**Compounding:** Medium. Common questions become FAQ entries. Recurring issues reveal product gaps.

**Solution design:**

- Help page with FAQ is BUILT
- Chat with chef link is BUILT
- Missing: structured "report an issue" form with category selection
- Missing: status page showing event progress and blockers clearly
- Missing: escalation path beyond chef (platform support for billing, technical issues)
- Missing: proactive "something seems stuck" detection with auto-nudge

**Where it appears:**

- `app/(client)/my-help/page.tsx`
- Client chat (`app/(client)/my-chat/page.tsx`)
- Client event detail (status visibility)

**What remains as permanent exit:**
Platform-level issues (payment processor errors, account lockouts) may require external support channels until a full support system exists. Chef-level questions are already handled in-app.

**Priority:** Low frequency x Medium effort = Low-medium priority
**Spec needed?** No (help page exists; needs issue reporting form and proactive status detection)

---

## Batch Summary

| #   | Title                                      | Reclassified To                               | Spec Needed? |
| --- | ------------------------------------------ | --------------------------------------------- | ------------ |
| 27  | Text the chef directly                     | Permanent (Bridgeable at margins)             | No           |
| 28  | WhatsApp the chef                          | Permanent (Bridgeable at margins)             | No           |
| 29  | Call the chef                              | Permanent (Bridgeable)                        | No           |
| 30  | Email outside the portal                   | Reducible                                     | No           |
| 31  | Coordinate through an assistant or planner | Bridgeable (Reducible + Client-Collaborative) | No           |
| 32  | Share files or inspiration                 | Bridgeable (Partially Reducible)              | No           |
| 33  | Ask guests questions manually              | Reducible                                     | No           |
| 34  | Escalate a support issue                   | Reducible                                     | No           |

---

## Key Findings

**Already built (substantial infrastructure):**

- Gmail sync engine with 12+ platform parsers captures inbound email
- Inbound email webhook routes replies via Cloudflare worker
- Portal chat supports text, image, file, and link messages
- Dietary confirmation token flow (no-login guest form)
- Guest batch email outreach
- Delegate/cohost system with granular permissions
- Communication control plane tracks SMS, email, WhatsApp, phone channels
- AI calling system (vendor-only; clients never auto-called)
- Post-call audit logging
- Portal introduction strategy (progressive A/B)

**Gaps to close (no new specs needed, wiring work):**

1. Inbound SMS webhook (Twilio -> unified thread)
2. Reply-to header in outbound email notifications (reply routes back)
3. Client-side delegate invite (currently chef-only)
4. Guest dietary reminder automation (non-responders)
5. Guest response completion dashboard
6. Structured issue reporting form on help page
7. Post-call summary visible to client in portal

**ChefFlow's communication posture:** Never replace native channels (SMS, WhatsApp, phone, email). Instead, capture everything that flows through them into the unified thread. Make the portal the single source of truth even when conversations happen elsewhere.
