# ORCHESTRATION MISSION: Client Communication Pipeline + Unblocked Items

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `docs/UNIFIED-BUILD-QUEUE.md` (queue contract)
- `docs/specs/inquiry-to-booking-orchestration.md` (P0 spec, full read)
- `docs/specs/pre-event-confidence-cadence.md` (P1 spec, depends on Wave 1)
- `docs/specs/social-proof-loop.md` (P1 spec, independent)
- `docs/specs/client-comms-brand-voice.md` (P1 spec, independent)
- `docs/specs/client-portal-guest-dietary-surfacing.md` (P1 spec, independent)
- `docs/specs/one-click-rebook.md` (P1 spec, independent)
- `docs/specs/professional-invoice-delivery.md` (P1 spec, independent)
- `docs/specs/post-event-photo-gallery.md` (P1 spec, depends on social proof)
- `docs/specs/referrer-circle-visibility.md` (P2 spec, depends on Wave 1)
- `docs/specs/dashboard-rail-architecture.md` (just built, context for rail integration)
- `lib/discovery/god-mode-dispatcher.ts` (rail resolver registration)
- `lib/discovery/rail-tier-assigner.ts` (tier assignment for new items)

## Session Decisions (Do Not Re-Debate)

- Dashboard Rail Architecture is DONE (4-tier, 28 resolvers, committed fd039de12)
- PIE Current Attention Collector was blocked by dirty dashboard; dashboard is now clean. Unblock it.
- Inquiry-to-Booking Orchestration is the P0: wires all built pipeline pieces into 5-day flow
- Pre-Event Confidence Cadence depends on the trigger engine from Inquiry-to-Booking
- Social Proof Loop is independent (post-event lifecycle stage already built)
- Client Comms Brand Voice is independent (tone templates for all automated comms)
- All client-facing automated emails must respect the brand voice spec once built
- New rail resolvers were just added for: dormant clients, follow-up not sent, client birthdays, review requests, proposal activity. These surface in the Rail automatically once data exists.

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: Inquiry-to-Booking Orchestration (P0)

- **Model:** opus
- **Task:** Build the orchestration layer that wires all existing pipeline components into a 5-day inquiry-to-deposit flow. This is the highest-priority item in the queue.
- **Read first:** `docs/specs/inquiry-to-booking-orchestration.md` (FULL spec), `lib/lifecycle/` (lifecycle intelligence), `lib/inquiries/` (inquiry system), `lib/quotes/` (quote generation), `app/(chef)/dashboard/page.tsx` (rail integration points)
- **Build:**
  1. Trigger engine: lifecycle stage transitions fire next-stage actions automatically
  2. Referral deep-link to inquiry form (friend shares link, client lands on pre-filled inquiry)
  3. Response time enforcement with auto-escalation (passive tracking becomes active nudges)
  4. Quote auto-gen from lifecycle data (template-based, chef reviews before send)
  5. Client-facing status updates at each stage transition (email + portal)
  6. Email-to-portal bridge wiring (every email links back to portal)
- **Done when:** A referral link leads to inquiry form. Inquiry triggers lifecycle progression. Each stage transition fires the next action. Response time enforcement works. Type check passes.

### Agent 2: Social Proof Loop (P1)

- **Model:** opus
- **Task:** Close the review capture loop: satisfied client -> review request -> submission -> chef profile display.
- **Read first:** `docs/specs/social-proof-loop.md` (FULL spec), `lib/events/` (event completion), `lib/email/` (email templates), `app/(public)/chefs/[slug]/` (public chef profile)
- **Build:**
  1. Post-event auto review request (48h after completion, token-based, no account required)
  2. Review submission endpoint (star rating + text, token auth)
  3. Review moderation (chef approves before public display)
  4. Chef profile reviews section (display approved reviews with star ratings)
  5. Portfolio gallery integration (reviews link to events)
- **Done when:** Completed events auto-trigger review requests. Clients can submit reviews via token link. Chef can approve/reject. Approved reviews appear on public profile. Type check passes.

### Agent 3: Client Comms Brand Voice (P1)

- **Model:** haiku
- **Task:** Build the tone/template system for all automated client communications.
- **Read first:** `docs/specs/client-comms-brand-voice.md` (FULL spec), `lib/email/` (existing email infrastructure), `database/schema/` (check for settings tables)
- **Build:**
  1. Three voice presets (Polished, Friendly, Minimal) stored in chef settings
  2. Template variable system (chef name, client name, event details auto-injected)
  3. Thank-you-before-review-ask sequence (24h thank-you, 48h review request)
  4. Template audit: update all existing automated emails to use voice system
  5. Settings UI for voice preset selection
- **Done when:** Chef can select voice preset in settings. All automated emails use the selected voice. Template variables auto-populate. Type check passes.

### Agent 4: Client Portal Guest Dietary Surfacing (P1)

- **Model:** haiku
- **Task:** Surface the existing dinner circle dietary collection feature in the client portal.
- **Read first:** `docs/specs/client-portal-guest-dietary-surfacing.md` (FULL spec), `app/(client)/` (client portal), `lib/circles/` (dinner circles), `lib/dietary/` (dietary system)
- **Build:**
  1. "Invite Guests" card in client portal event view
  2. Guest dietary response tracker (who responded, who hasn't)
  3. Dietary summary for chef (aggregated view of all guest requirements)
  4. Integration with existing dinner circle dietary collection
- **Done when:** Client portal shows "Invite Guests" card on event. Guests can submit dietary info. Chef sees aggregated dietary summary. Type check passes.

### Agent 5: One-Click Rebook (P1)

- **Model:** haiku
- **Task:** Add "Book Again" functionality on completed events.
- **Read first:** `docs/specs/one-click-rebook.md` (FULL spec), `app/(chef)/events/` (event pages), `lib/events/` (event data), `lib/inquiries/` (inquiry creation)
- **Build:**
  1. "Book Again" button on completed event detail pages
  2. Pre-fill new inquiry from past event data (menu, guest count, location, dietary notes)
  3. Repeat client badge on returning clients
  4. Seasonal rebook prompt (60 days before anniversary of last event)
- **Done when:** Completed events show "Book Again" button. Clicking it creates pre-filled inquiry. Repeat clients get badge. Type check passes.

### Agent 6: Professional Invoice Delivery (P1)

- **Model:** opus
- **Task:** Build PDF invoice generation and delivery system.
- **Read first:** `docs/specs/professional-invoice-delivery.md` (FULL spec), `lib/finance/` (financial data), `lib/invoices/` (if exists), `lib/email/` (email delivery), `app/(client)/` (client portal)
- **Build:**
  1. PDF invoice generation from event financial data
  2. Client portal invoice download page
  3. Auto-email invoice after final payment received
  4. Corporate "Bill To" support (different billing entity than event host)
  5. Invoice history in chef dashboard
- **Done when:** Invoices generate as PDFs. Clients can download from portal. Auto-email fires after payment. Corporate billing works. Type check passes.

## Wave 2 (After Wave 1 Verified)

### Agent 7: Pre-Event Confidence Cadence (P1)

- **Model:** opus
- **Task:** Build automated countdown comms between deposit and event day. Depends on trigger engine from Agent 1.
- **Read first:** `docs/specs/pre-event-confidence-cadence.md` (FULL spec), trigger engine code from Agent 1, `lib/email/` (email templates), `lib/events/` (event scheduling)
- **Build:**
  1. Cadence scheduler: deposit confirmed -> schedule all milestone emails (30d, 14d, 7d, 3d, 1d, day-of)
  2. Each milestone generates appropriate message using brand voice (from Agent 3)
  3. Client portal countdown display
  4. Chef override: chef can customize/delay any scheduled message
  5. Smart skipping: if chef manually contacts client, skip next automated touchpoint
- **Done when:** Deposited events auto-schedule confidence emails. Countdown shows in portal. Chef can override. Type check passes.

### Agent 8: Referrer Circle Visibility (P2)

- **Model:** haiku
- **Task:** Give referrers visibility into the journey they started. Depends on referral deep-link from Agent 1.
- **Read first:** `docs/specs/referrer-circle-visibility.md` (FULL spec), `lib/circles/` (circles system), referral code from Agent 1
- **Build:**
  1. Referrer milestone notifications (inquiry received, booked, completed)
  2. Privacy-gated: client name shown only with permission
  3. Thank-you flow after successful referral booking
  4. Referrer dashboard showing their referral impact
- **Done when:** Referrers get notified at milestones. Privacy respected. Thank-you fires. Type check passes.

### Agent 9: Post-Event Photo Gallery (P1)

- **Model:** haiku
- **Task:** Chef uploads event photos, clients see them in portal, photos flow to public profile. Depends on Social Proof Loop (Agent 2).
- **Read first:** `docs/specs/post-event-photo-gallery.md` (FULL spec), review system from Agent 2, `lib/uploads/` (file upload system), `app/(public)/chefs/[slug]/` (public profile)
- **Build:**
  1. Photo upload interface on event detail (chef side)
  2. Client portal photo gallery for their event
  3. Portfolio tagging (chef marks photos as portfolio-worthy)
  4. Public profile portfolio section (tagged photos)
  5. Client download/share capability
- **Done when:** Chef can upload photos to events. Clients see gallery in portal. Portfolio photos appear on public profile. Type check passes.

### Agent 10: PIE Current Attention Collector (Unblocked)

- **Model:** opus
- **Task:** PIE Current Attention Collector was blocked by dirty dashboard. Dashboard is now clean (fd039de12). Build it.
- **Read first:** Check queue notes for this item, `lib/pie/` (PIE infrastructure), `app/(chef)/dashboard/page.tsx` (cleaned dashboard), `lib/discovery/rail-tier-assigner.ts` (tier system for surfacing price alerts)
- **Build:** Whatever the PIE Current Attention Collector spec defines. This surfaces price intelligence in the Rail and dashboard.
- **Done when:** PIE attention items appear in the Rail. Type check passes.

## Verification Protocol

- Each agent runs type check: `npx tsc --noEmit --skipLibCheck`
- After Wave 1: verify all 6 features independently
- After Wave 2: verify cross-feature integration (referral -> inquiry -> booking -> confidence cadence -> review -> photo)
- Full Playwright test of affected flows: `npm run test:experiential`
- Anti-Loop: 3 strikes on same error = stop, commit partial, report
- At completion: conventional commit per wave, push to main

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, screenshot, behavioral test).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, push to main.
8. Do NOT re-debate any decisions listed above. They are settled.
9. Update `docs/UNIFIED-BUILD-QUEUE.md` status for each completed item.
