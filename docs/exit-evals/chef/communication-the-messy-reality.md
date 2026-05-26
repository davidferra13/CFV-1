# Exit Eval: Chef / COMMUNICATION (The Messy Reality)

> **Wave 1** | 7 scenarios | Evaluated: 2026-05-25
> **Mode:** Solo (batch) | All scenarios marked `NEEDS-DEVELOPER-REVIEW`
> **Evaluator:** Claude (Opus 4.6)

---

## Scenario #25: Text/iMessage a Client

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**Why chef leaves:** Client initiated conversation in SMS/iMessage. Chef responds in same channel because that is where the conversation lives. The operational reason is maintaining conversational continuity; switching channels creates confusion for the client.

**Context ChefFlow has:**

- Client name, phone number, email
- Event dates, menu, dietary info
- Full communication history (unified thread)
- Follow-up timers and next actions
- Client preferences and past events

**Data source?** No. SMS is a bidirectional communication channel, not a data source. However, Twilio integration exists (`lib/sms/send.ts`, `lib/sms/actions.ts`) enabling programmatic SMS send/receive.

**Client-collaborative angle:** Client's preferred communication channel is already known. Circle could collect channel preference during onboarding. Chef could send structured messages (menu confirmations, event reminders) via SMS from within ChefFlow, reducing reason to open native Messages app.

**Physical reality:** Chef often texts from pocket while cooking, walking, driving. Phone's native keyboard is muscle memory. Voice-to-text common. Quick capture widget exists for logging these conversations after the fact.

**Compounding:** Medium. Conversation content compounds (dietary changes, scheduling shifts, relationship signals) but the act of texting itself does not improve with repetition.

**Solution design:**

- ChefFlow already has Twilio SMS sending (`sendSmsToClient` in `lib/sms/actions.ts`) and Quick Capture Widget for logging external conversations
- SMS triage card exists (`components/communication/sms-triage-card.tsx`) for inbound SMS handling
- Build: two-way SMS relay via Twilio so client texts ChefFlow's number and chef sees/replies in unified inbox
- Build: Quick Capture one-tap "log this text" shortcut (existing widget supports channel='text')
- Build: Pre-compose context-rich SMS from event detail (event date, menu items pre-loaded)

**Where it appears:**

- Unified inbox (`app/(chef)/inbox/triage/page.tsx`)
- Client detail communication tab
- Event detail page (quick-send SMS)
- Quick Capture Widget (already built: `components/communication/quick-capture-widget.tsx`)

**What remains as permanent exit:**
Client-initiated iMessage threads will always live in Apple's ecosystem. ChefFlow cannot intercept iMessage. Chef will always need to open Messages for threads the client starts there. The bridge is: structured outbound messages originate from ChefFlow (Twilio), and inbound context is captured back.

**Priority:** Very High frequency (daily) x Low effort (infrastructure exists) = P1 signal
**Spec needed?** No. Infrastructure built. Needs activation/polish of existing Twilio relay.

---

## Scenario #26: WhatsApp with a Client

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**Why chef leaves:** International clients or food-photo-heavy conversations happen on WhatsApp. Chef shares plating photos, confirms details, handles logistics in a channel the client already lives in. WhatsApp is preferred by international clients (no SMS cost) and supports media-rich messaging.

**Context ChefFlow has:**

- Client phone (WhatsApp-linked), name, dietary info
- Event photos (up to 50 per event, `lib/events/photo-actions.ts`)
- Menu details, event timeline
- Full communication thread history (WhatsApp channel recognized in `lib/communication/channel-meta.ts`)
- Unified thread supports `whatsapp` type (`lib/communication/unified-thread.ts`)

**Data source?** No. WhatsApp is a communication channel. However, Twilio WhatsApp Business API integration exists (`sendWhatsAppToClient` in `lib/sms/actions.ts`), and managed channel resolution supports WhatsApp (`lib/communication/managed-channels.ts`).

**Client-collaborative angle:** Client's WhatsApp number is their phone number. No additional collection needed. Circle could surface a "view event photos" link that eliminates the need for chef to manually send photos via WhatsApp.

**Physical reality:** WhatsApp is the natural photo-sharing channel for many clients. Chef takes food photo on phone, shares immediately. The friction is: context about which event/client this photo belongs to is lost unless manually tagged later.

**Compounding:** Medium. Photo sharing itself doesn't compound, but the pattern of "which clients prefer WhatsApp" and "what type of updates they want" compounds into communication preferences.

**Solution design:**

- ChefFlow already has `sendWhatsAppToClient` via Twilio WhatsApp Business API
- ChefFlow already has WhatsApp channel recognition in the communication pipeline
- Build: "Share photos" action on event photo gallery that sends selected photos to client via WhatsApp (Twilio media message)
- Build: WhatsApp inbound webhook to capture client replies into unified thread
- Build: Quick Capture pre-fills WhatsApp channel when logging from event photo section

**Where it appears:**

- Event photo gallery (send to client action)
- Unified inbox (WhatsApp threads, green accent: `#25D366`)
- Client profile (preferred channel indicator)
- Quick Capture Widget (channel = 'whatsapp' already supported)

**What remains as permanent exit:**
Receiving and reading WhatsApp messages will always require opening WhatsApp (end-to-end encryption prevents server-side access without WhatsApp Business API). Rich media conversations (voice notes, video, stickers) cannot be replicated. The bridge reduces to: structured outbound messages from ChefFlow, inbound text captured via webhook.

**Priority:** High frequency (weekly for international clients) x Medium effort (Twilio WhatsApp needs Business verification) = P2 signal
**Spec needed?** No. Infrastructure exists (`lib/sms/actions.ts` already has `sendWhatsAppToClient`). Needs WhatsApp Business API activation and inbound webhook.

---

## Scenario #27: Call a Client

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**Why chef leaves:** Some conversations require voice: sensitive pricing discussions, quick last-minute confirmations, conflict resolution, or relationship warmth that text lacks. The chef picks up the phone because the topic is time-sensitive or emotionally nuanced.

**Context ChefFlow has:**

- Client phone number (primary, secondary, emergency via `lib/phone/actions.ts`)
- Full calling infrastructure (`lib/calling/` with 30+ files: Twilio webhooks, voice helpers, conversation state, call scripts, post-call actions)
- Call audit bridge (`lib/communication/call-audit-bridge.ts`) for logging call lifecycle
- Voicemail bridge (`lib/communication/voicemail-bridge.ts`) for transcribing voicemails into pipeline
- Post-call actions (`lib/calling/post-call-actions.ts`)
- Quick Capture Widget supports channel='call' with duration tracking

**Data source?** No. Voice is a human interaction channel. But call metadata (duration, outcome, transcription) is capturable.

**Client-collaborative angle:** Limited. Calls are bilateral. However, client's preferred call times could be collected via Circle (morning/evening preference, timezone), reducing missed-call cycles.

**Physical reality:** Chef calls while driving to events, walking through markets, or during downtime. Hands are free but eyes should be on road. Voice is the natural interface here. Post-call, the key info needs capturing quickly before it's forgotten.

**Compounding:** High. Call outcomes compound significantly: "Client confirmed 14 guests," "allergic to shellfish not just shrimp," "wants to add a cocktail hour." These are decisions that affect downstream workflows. Capturing them immediately after the call prevents data loss.

**Solution design:**

- ChefFlow already has extensive calling infrastructure (Twilio, conversation state, scripts, post-call actions)
- ChefFlow already has Quick Capture with call channel, duration tracking, and info-change detection
- Build: "Call [Client]" button on event/client detail that auto-opens phone dialer (tel: link) and pre-populates post-call capture form
- Build: Post-call prompt (notification 2 min after call ends via Twilio status callback) to capture key decisions
- Build: AI-assisted call summary from post-call notes (detect dietary changes, date changes, guest count updates via `lib/communication/info-change-detector.ts`)

**Where it appears:**

- Client detail page (call button with tel: link)
- Event detail page (call client/vendor quick action)
- Quick Capture Widget (call channel with duration + tags)
- Post-call prompt (push notification after Twilio call-completed webhook)
- Communication timeline (call logged with duration and notes)

**What remains as permanent exit:**
The actual phone call will always happen on the phone's native dialer (or Twilio if using VoIP). Chef will always leave the app to speak. The bridge is: pre-load context before the call (what to discuss), capture decisions after (what was agreed).

**Priority:** High frequency (several times weekly) x Low effort (infrastructure built) = P1 signal
**Spec needed?** No. All infrastructure exists. Needs UX polish on pre-call context display and post-call capture prompt.

---

## Scenario #28: Check Personal Email for Client Replies

**Original classification:** Reducible (Remy email integration should reduce over time)
**Reclassified to:** Reducible

**Why chef leaves:** Client replied to a thread that didn't originate from ChefFlow, or replied directly to the chef's personal Gmail instead of through the portal. Chef opens Gmail to check if anyone responded to a quote, follow-up, or logistics question.

**Context ChefFlow has:**

- Full Gmail sync engine (`lib/gmail/sync.ts`) with bidirectional read/send
- 7-layer email classification (`lib/gmail/classify.ts`)
- Gmail inbox triage UI (`app/(chef)/inbox/triage/page.tsx`)
- Historical scan for importing past conversations (`lib/gmail/historical-scan.ts`)
- Thread linking to inquiries and events
- Multi-mailbox support (`listGoogleGmailMailboxes`)
- Sender reputation learning (`lib/gmail/sender-reputation.ts`)
- Gmail sync strip component for manual trigger (`components/inquiries/gmail-sync-strip.tsx`)

**Data source?** Yes. Gmail API is the data source. ChefFlow already drinks from it via OAuth2 sync. The chef should never need to open Gmail separately.

**Client-collaborative angle:** Clients who reply via email have their messages auto-synced into ChefFlow. Client portal messages also flow through email. The Circle's email notifications carry reply-to addresses that route back to the unified inbox.

**Physical reality:** Email checking is a screen activity. No physical/analog advantage. Chef checks between tasks. The unified inbox replicates this entirely within ChefFlow.

**Compounding:** High. Every email synced builds the communication history, trains sender reputation, enriches client profiles, and improves AI classification accuracy over time. The system gets smarter with each synced message.

**Solution design:**

- ChefFlow already has this fully built: Gmail OAuth sync, classification, triage inbox, thread linking
- Existing cron sync (`app/api/pie/v1/cron/route.ts` triggers sync)
- Build: Push notification when client reply detected (already partially built via `NewMessageChefEmail` template)
- Build: Reduce sync latency (currently periodic; could add Gmail push notifications via Pub/Sub)
- Build: "Zero unread in ChefFlow = zero reason to open Gmail" guarantee via sync completeness indicator

**Where it appears:**

- Unified inbox (`app/(chef)/inbox/triage/page.tsx`)
- Inquiry detail (threaded messages)
- Client profile (communication history)
- Dashboard (unread count badge, `components/communication/inbox-unread-badge.tsx`)

**What remains as permanent exit:**
Near-zero. If Gmail sync is healthy and latency is low, chef never needs to open Gmail for client communication. Remaining exits: non-client emails (personal, vendor, marketing) that ChefFlow intentionally doesn't surface.

**Priority:** Very High frequency (multiple times daily) x Very Low effort (already built) = DONE signal
**Spec needed?** No. Feature is built. Needs reliability hardening (sync latency, push notifications).

---

## Scenario #29: Respond to Inquiry on a 3rd-Party Platform

**Original classification:** Inquiry consolidation hub (planned)
**Reclassified to:** Partially Reducible

**Why chef leaves:** Inquiry arrived on Thumbtack, Bark, Take a Chef, The Knot, GigSalad, Cozymeal, or personal website. Chef must respond ON that platform (within platform's messaging system) or risk losing the lead. Platforms penalize slow response times.

**Context ChefFlow has:**

- 12+ platform parsers built (`lib/gmail/thumbtack-parser.ts`, `take-a-chef-parser.ts`, `bark-parser.ts`, `cozymeal-parser.ts`, `gigsalad-parser.ts`, `theknot-parser.ts`, `yhangry-parser.ts`, `wix-forms-parser.ts`, `privatechefmanager-parser.ts`, `hireachef-parser.ts`, `cuisineistchef-parser.ts`, `google-business-parser.ts`)
- Platform deduplication (`lib/gmail/platform-dedup.ts`)
- Platform analytics with conversion tracking (`lib/inquiries/platform-analytics.ts`)
- Platform cost-per-lead tracking (`lib/inquiries/platform-cpl.ts`)
- Take a Chef command center (`lib/gmail/take-a-chef-command-center.ts`)
- Inquiry response composer (`components/inquiries/inquiry-response-composer.tsx`)
- Platform raw feed tab (`components/inquiries/platform-raw-feed-tab.tsx`)

**Data source?** Partially. The inquiry notification arrives via email (parsed automatically). But the RESPONSE must go through the platform's own messaging system (API or web UI). Most platforms do not offer API-based reply.

**Client-collaborative angle:** Limited for initial response. Client is on the platform, not yet in ChefFlow's ecosystem. After booking, Circle takes over. Pre-booking, the platform is the relationship layer.

**Physical reality:** Screen-based. Chef opens platform app/website. Time-sensitive (some platforms have <1hr response SLA). The friction is context-switching between multiple platform tabs.

**Compounding:** High. Platform-specific response patterns, win rates by platform, optimal pricing by channel, and response templates all compound. ChefFlow already tracks this via platform analytics.

**Solution design:**

- ChefFlow already captures all platform inquiries via email parsing (12 parsers)
- ChefFlow already tracks platform spend, CPL, and conversion rates
- Build: "Respond" button that opens platform's messaging page with pre-composed response in clipboard (bridge-out with context)
- Build: AI-draft response tailored to platform norms (Thumbtack = brief/price-forward; Take a Chef = formal/menu-forward)
- Build: Response timer showing SLA countdown per platform
- Cannot fully eliminate: most platforms require responding IN their messaging system (no API for replies)

**Where it appears:**

- Inquiries kanban (`components/inquiries/kanban-board.tsx`)
- Platform-specific workflow guides (`components/inquiries/tac-workflow-guide.tsx`)
- Inquiry response composer (draft text to copy to platform)
- Platform raw feed tab (see original message)
- Inquiry detail page (platform link banner: `components/inquiries/platform-link-banner.tsx`)

**What remains as permanent exit:**
Chef MUST respond on the platform itself for: Thumbtack (proprietary messaging), Bark (in-app chat), Take a Chef (platform messaging + acceptance), The Knot (vendor messaging), GigSalad, Cozymeal. None of these offer reply APIs. The permanent exit is the actual "send" action on each platform.

**Priority:** Very High frequency (daily during busy season) x High effort (platform APIs don't exist) = P1 signal (bridge quality matters)
**Spec needed?** No. System is well-built. Improvement is incremental (better bridge-out UX, response templates, SLA timers).

---

## Scenario #30: Send Food Photos to Client

**Original classification:** Permanent exit (social/personal sharing is inherently external)
**Reclassified to:** Partially Reducible

**Why chef leaves:** Chef wants to share tonight's plating, a beautiful ingredient haul, or a "here's what I made for you" preview with a specific client. This is relationship-building through visual storytelling, not formal communication. It happens on iMessage, WhatsApp, or Instagram DM because those are intimate, immediate, visually rich channels.

**Context ChefFlow has:**

- Event photo gallery with upload, caption, reorder (`lib/events/photo-actions.ts`, up to 50 photos per event)
- Photo types: plating, setup, process, ingredients, ambiance, team, other
- "Photos Ready" email notification to client (`sendPhotosReadyEmail` in `lib/email/notifications.ts`)
- Client portal where photos are visible
- WhatsApp send capability via Twilio (`sendWhatsAppToClient`)
- SMS send capability (`sendSmsToClient`)
- Chef social posting system (`lib/social/chef-social/posts.ts`)

**Data source?** No. Photos originate on chef's phone camera. ChefFlow stores them after upload.

**Client-collaborative angle:** Client receives photos via Circle/portal notification. "Photos Ready" email already exists. Client can view in their portal without chef manually sending each photo. The Circle eliminates the need to manually share in some cases.

**Physical reality:** Chef takes photo on phone immediately after plating. Sharing is impulsive, warm, personal. The moment matters. Opening ChefFlow to upload, then triggering a notification feels clinical compared to a quick iMessage with a heart emoji. This is a social/emotional interaction.

**Compounding:** Medium. Photos compound as portfolio pieces and client memory. A client seeing their past event photos on their portal is delightful. But the ACT of sharing is one-off emotional labor that doesn't compound.

**Solution design:**

- ChefFlow already has photo upload and "Photos Ready" email notification
- Build: "Quick share" from phone camera roll that uploads to event AND sends preview to client in one tap (share sheet integration if PWA allows)
- Build: Auto-notification when chef uploads event photos (client portal + email already built)
- Build: Photo sharing via WhatsApp/SMS with Twilio media message from event gallery
- Accept: intimate personal sharing (heart emoji + "look what I made!") stays in native messaging

**Where it appears:**

- Event photo gallery (share action per photo or batch)
- Client portal (auto-visible when uploaded)
- "Photos Ready" email (already built)
- Quick Capture could attach photo reference to communication log

**What remains as permanent exit:**
Spontaneous, intimate, emoji-laden photo sharing stays in iMessage/WhatsApp/Instagram DM. This is relationship warmth, not operational communication. ChefFlow handles the formal "your event photos are ready" workflow. The impulsive "OMG look at this tomato" message stays personal.

**Priority:** Medium frequency (a few times per event) x Low effort (core infrastructure exists) = P3 signal
**Spec needed?** No. Photo notification system exists. Enhancement is adding media-message capability to WhatsApp/SMS send actions.

---

## Scenario #31: Coordinate with Other Vendors (Florist, Event Planner, Venue)

**Original classification:** Could store vendor contacts per event
**Reclassified to:** Bridgeable

**Why chef leaves:** Multi-vendor events require coordinating arrival times, load-in schedules, power/space allocation, timeline alignment. Chef emails/texts the florist about when they'll be done with the table, calls the venue about kitchen access time, texts the event planner about the timeline. Each vendor is a separate communication thread outside ChefFlow.

**Context ChefFlow has:**

- Vendor coordination section per event (`components/events/vendor-coordination-section.tsx`) with 10 vendor types (florist, photographer, DJ, rental, linen, A/V, decor, entertainment, transport, other)
- Vendor contact logging (`lib/vendors/vendor-coordination-actions.ts`) with channel tracking (text, call, whatsapp, email, in_person)
- Vendor communication actions (`lib/vendors/vendor-communication-actions.ts`) with order drafting, preferred channels, lead times
- Communication pipeline ingestion for vendor contacts
- Follow-up date tracking per vendor contact
- Status tracking: contacted, waiting, confirmed, issue
- Vendor profiles with contact info (name, phone, email)

**Data source?** No. Vendor communication is bilateral human interaction.

**Client-collaborative angle:** Client often knows their other vendors (their wedding planner, their preferred florist, their venue contact). Circle could collect vendor contact details during event setup, pre-populating the coordination section.

**Physical reality:** Chef coordinates while driving, during setup, between courses. Quick texts ("running 10 min late", "kitchen access at 2pm?") are the norm. Voice calls for complex logistics. Speed matters more than formality.

**Compounding:** High. Vendor relationships compound enormously. The florist you've worked 5 events with needs less coordination. Knowing a venue's loading dock rules from past events eliminates questions. Contact preferences (this planner prefers email, this DJ only texts) compound into friction-free coordination.

**Solution design:**

- ChefFlow already has vendor coordination section per event with contact logging
- ChefFlow already has vendor communication preferences (channel, lead time, cutoff time)
- ChefFlow already ingests vendor contact logs into communication pipeline
- Build: "Text vendor" / "Email vendor" action from event vendor section (pre-compose with event context)
- Build: Vendor memory across events (same florist at 3 events, show past coordination notes)
- Build: Timeline-aware vendor coordination (auto-suggest "confirm florist arrival" 48h before event based on lead time preference)
- Build: Circle-collected vendor contacts (client provides their planner/florist/venue contact during event setup)

**Where it appears:**

- Event detail page, vendor coordination section (`components/events/vendor-coordination-section.tsx`)
- Vendor contact entry form (`components/events/vendor-contact-entry.tsx`)
- Vendor coordination log (`components/events/vendor-coordination-log.tsx`)
- Communication timeline (vendor contacts appear in unified thread)
- Event checklist (vendor confirmation status)

**What remains as permanent exit:**
The actual communication (texting the florist, calling the venue) happens on phone/email. ChefFlow cannot replace the bilateral conversation. But context prep (what to say, who to contact, what's outstanding) and post-contact capture (what was agreed) are fully manageable in-app.

**Priority:** High frequency (every multi-vendor event, several contacts per vendor) x Low effort (infrastructure built) = P1 signal
**Spec needed?** No. Core infrastructure exists. Enhancement is timeline-aware prompts and vendor memory across events.

---

## Batch Summary

| #   | Title                                      | Reclassified To     | Spec Needed? |
| --- | ------------------------------------------ | ------------------- | ------------ |
| 25  | Text/iMessage a client                     | Bridgeable          | No           |
| 26  | WhatsApp with a client                     | Bridgeable          | No           |
| 27  | Call a client                              | Bridgeable          | No           |
| 28  | Check personal email for client replies    | Reducible           | No           |
| 29  | Respond to inquiry on a 3rd-party platform | Partially Reducible | No           |
| 30  | Send food photos to client                 | Partially Reducible | No           |
| 31  | Coordinate with other vendors              | Bridgeable          | No           |

### Classification Distribution

- Reducible: 1 (#28, already built)
- Partially Reducible: 2 (#29, #30)
- Bridgeable: 4 (#25, #26, #27, #31)
- Permanent: 0

### Key Finding

ChefFlow's communication infrastructure is remarkably mature. The codebase already contains:

- Full Gmail sync with 12 platform parsers
- Twilio SMS + WhatsApp sending
- Extensive calling infrastructure (30+ files)
- Unified communication thread across all channels
- Quick Capture Widget for logging external conversations
- Vendor coordination per event with status tracking
- Communication pipeline with thread resolution

The gap is not infrastructure but UX polish: making the bridge-out and bridge-back seamless enough that the chef's workflow feels continuous even when the actual communication happens externally. None of these scenarios need new specs; they need activation and refinement of existing systems.

### Status

All 7 scenarios: `NEEDS-DEVELOPER-REVIEW`
