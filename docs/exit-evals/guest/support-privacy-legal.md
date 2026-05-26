# Exit Eval: Guest / SUPPORT, PRIVACY & LEGAL

> Wave 4 | 6 scenarios | Role: GUEST | Mode: Solo (NEEDS-DEVELOPER-REVIEW)
>
> Date: 2026-05-25

---

## Scenario #60: Contact support or privacy inbox

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why guest leaves:** Guest has a question, complaint, or concern about their data, a booking issue, a payment problem, or a safety matter. They need to communicate with a human at ChefFlow who can resolve it. The operational reason is: the guest cannot self-resolve the issue through available UI and needs a communication channel to reach support staff.

**Context ChefFlow has:**

- Guest email (from RSVP, ticket purchase, dietary form, or Circle membership)
- Event details (date, chef, menu, location) if the guest has an active token
- Payment record (if ticket was purchased through Stripe)
- Circle membership and profile token (if hub participant)
- Prior form submissions (dietary, feedback, review, tip)

**Data source?** No. This is a communication channel, not a data source.

**Client-collaborative angle:** Limited. The chef or host may be able to resolve the issue directly (e.g., event logistics questions), but true support/privacy concerns need platform-level response.

**Physical reality:** Screen-based. Email is the natural channel for support communication. No hands-free or print needs.

**Compounding:** Low. Each support request is typically one-off. However, FAQ patterns compound (common questions can become self-serve answers).

**Solution design:**

- The `/contact` page already exists with a full form, founder info, support email, and business hours
- The `/trust` page already provides escalation steps, support boundaries, and security contact
- Add a "Need help?" or "Contact support" link to guest token pages (share, event portal, feedback, tip, dietary-confirm) so guests do not have to find `/contact` from the homepage
- Add contextual pre-fill: if a guest clicks support from a token page, pass event ID or token context into the contact form subject line (similar to how broken-link reports pre-fill via `?reason=broken-link`)
- Consider an in-app guest message thread that does not require email (already partially exists via `sendGuestMessage` on the guest portal)

**Where it appears:**

- `/contact` page (full support form with founder info, email, business hours)
- `/trust` page (escalation steps, what support can/cannot do)
- Email footer links on transactional emails
- Guest portal via `sendGuestMessage`

**What remains as permanent exit:**

- Complex disputes requiring back-and-forth email threads
- Legal matters requiring formal correspondence
- Identity verification workflows that cannot happen in-app

**Priority:** Medium frequency x Low effort = Quick win (add support links to token pages)
**Spec needed?** No. Add contextual support links to existing guest token surfaces.

---

## Scenario #61: Request data deletion or privacy help

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why guest leaves:** Guest wants their personal data deleted, exported, corrected, or wants to understand what data ChefFlow holds about them. The operational reason is exercising a legal right (GDPR/CCPA) and wanting assurance their data is handled responsibly.

**Context ChefFlow has:**

- The guest's email address (the primary identifier for lookup)
- All data associated with that email: RSVPs, dietary submissions, feedback, reviews, tips, Circle memberships, ticket purchases
- Token-based access history
- IP hashes from submissions

**Data source?** No. ChefFlow IS the data holder. The guest needs to interact with ChefFlow's own data management system.

**Client-collaborative angle:** None. This is a direct guest-to-platform interaction.

**Physical reality:** Screen-based. Form submission is the correct interface.

**Compounding:** Low. One-off per person. But the system itself compounds (each handled request improves the process).

**Solution design:**

- `/data-request` page ALREADY EXISTS with full self-serve form: deletion, access, correction, export, opt-out
- `submitPublicDataRightsRequest` in `lib/legal/actions.ts` already handles: rate limiting (6 per IP per 10min, 3 per email per hour), honeypot spam filtering, identity verification flagging, case creation in `legal_data_rights_cases` table
- `/privacy` page Section 6 already links to `/data-request` and explains all rights
- Privacy email `privacy@cheflowhq.com` shown on both pages as fallback
- The system is ALREADY REDUCIBLE. Guest can self-serve without leaving ChefFlow.
- Minor gap: `/data-request` is not linked from guest token pages. A guest on `/event/[id]/guest/[token]` or `/share/[token]` would need to navigate to `/privacy` first.

**Where it appears:**

- `/data-request` (self-serve GDPR/CCPA form, no auth required)
- `/privacy` Section 6 (explains rights, links to form)
- `lib/legal/actions.ts` (`submitPublicDataRightsRequest`)
- Admin legal readiness dashboard tracks cases

**What remains as permanent exit:**

- If identity verification requires email exchange (edge case)
- Appeals or complex multi-tenant data scenarios

**Priority:** Low frequency x Already built = Done (minor linking improvement only)
**Spec needed?** No. Feature is built. Add link to `/data-request` from guest portal footer.

---

## Scenario #62: Read Stripe or processor terms

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** Guest wants to understand the legal terms of the payment processor before entering card details, or after a charge, dispute, or refund. The operational reason is: Stripe's terms are a separate legal agreement between the guest and Stripe, not ChefFlow's terms to host or summarize.

**Context ChefFlow has:**

- The fact that Stripe processes payments (disclosed in Terms Section 7 and Privacy Section 4)
- A direct link to Stripe's Connected Account Agreement at `https://stripe.com/legal/ssa`
- The trust page explains how payment protection, disputes, and cancellations work
- FAQ mentions Stripe explicitly for payment processing

**Data source?** No. Stripe's legal terms are their own documents that change independently.

**Client-collaborative angle:** None. This is a guest-to-processor legal relationship.

**Physical reality:** Screen-based reading. No special needs.

**Compounding:** None. One-time read per curious guest.

**Solution design:**

- `/terms` Section 7 already links to Stripe's Connected Account Agreement
- `/trust` page already explains payment protection and dispute process
- `/privacy` Section 4 already lists Stripe as a data processor with link to their privacy policy
- Ensure ticket checkout pages (`/e/[shareToken]`) have a small "Payments processed by Stripe" note with link before the checkout button
- No further build needed; this is appropriately a permanent exit with clear link-outs

**Where it appears:**

- `/terms` Section 7 (Payment Processing, links Stripe SSA)
- `/privacy` Section 4 (Third-Party Service Providers, links Stripe privacy)
- `/trust` (Payment protection card explains Stripe handling)
- `/faq` (mentions Stripe processing)

**What remains as permanent exit:**

- Reading Stripe's own legal terms will always happen on stripe.com
- Card dispute processes governed by Stripe/bank

**Priority:** Low frequency x Zero effort = No action needed
**Spec needed?** No. Already properly linked.

---

## Scenario #63: Read guest or client legal terms

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why guest leaves:** Guest wants to understand what they are agreeing to when RSVPing, submitting dietary info, consenting to photos, or providing personal data through guest forms. The operational reason is: informed consent requires readable, accessible terms before or during form submission.

**Context ChefFlow has:**

- `/guest-terms` page exists but is currently a PLACEHOLDER (uses `LegalPolicyPlaceholder` component)
- `/terms` is a full Terms of Service covering all roles including guests (Section 1: "These Terms apply to all users, including chefs, clients, and guests who interact with the Service without an account")
- `/privacy` is comprehensive and covers inquiry submissions, dietary data collection, and all guest data flows
- Guest token pages collect consent checkboxes (photo consent, data-processing consent, marketing opt-in) during RSVP
- The legal policy versions table exists (`legal_policy_versions`) with support for `guest_terms` policy type

**Data source?** No. ChefFlow owns these terms. They should be accessible in-app.

**Client-collaborative angle:** None directly. But the chef may have event-specific terms (cancellation, dietary disclaimers) that apply to guests.

**Physical reality:** Screen-based reading. Legal text should be scannable with clear headings.

**Compounding:** Medium. Once guest terms are written, they serve every guest interaction forever. Schema already supports versioned acceptance tracking.

**Solution design:**

- Complete the `/guest-terms` page (currently placeholder) with actual guest-specific consent language covering: RSVP data, dietary/allergy submissions, photo consent, testimonial consent, data processing, communication preferences
- Ensure guest token pages (RSVP, dietary-confirm, menu-pick, guest-feedback) link to `/guest-terms` near consent checkboxes
- Keep `/terms` as the master ToS and `/guest-terms` as a focused subset for no-login users
- Legal policy acceptance tracking already exists in `lib/legal/actions.ts` via `recordCurrentUserPolicyAcceptance`

**Where it appears:**

- `/guest-terms` (placeholder, needs content)
- `/terms` (full ToS, already covers guests)
- `/privacy` (comprehensive data practices)
- Guest RSVP forms (consent checkboxes link to terms)

**What remains as permanent exit:**

- Nothing. Once `/guest-terms` is completed, all guest legal reading stays in-app.

**Priority:** Medium frequency x Medium effort = P1 (complete the placeholder page)
**Spec needed?** No. The page exists, schema supports it, just needs content authored.

---

## Scenario #64: Escalate safety concern

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** Guest has an urgent safety concern: food safety incident, allergic reaction, hostile situation, or other emergency. The operational reason is: life-safety situations require immediate real-world response (911, poison control, hospital) and cannot be handled by a software platform.

**Context ChefFlow has:**

- Guest's dietary/allergy data (if previously submitted)
- Event details (chef, location, date, time)
- Chef contact information
- `/trust` page already has escalation steps and `support@cheflowhq.com` / `security@cheflowhq.com`
- The trust page explicitly says: "Contact the chef immediately, then email support@cheflowhq.com"

**Data source?** No. Safety escalation requires human judgment, emergency services, and real-world response.

**Client-collaborative angle:** The host/client may be the first responder in a safety situation at their venue. Circle chat could be a rapid communication channel.

**Physical reality:** This is an urgent, potentially hands-free moment. Phone calls to 911 or the chef are the natural first response. No app UI will be the primary tool in an emergency.

**Compounding:** Low per-incident. But having clear safety contact paths and allergy data on file prevents some emergencies.

**Solution design:**

- `/trust` page already covers escalation steps and support contacts
- Add a "Safety concern" option to the `/contact` form reason dropdown for routing/prioritization
- Ensure guest portal pages show chef contact method (already exists via `sendGuestMessage`)
- Add a clear "In an emergency, call 911" notice on any allergen/safety-adjacent page (dietary-confirm, cannabis intake)
- Do NOT attempt to replace emergency services or medical advice
- Consider: add `?reason=safety` URL param support to `/contact` for direct routing from guest surfaces

**Where it appears:**

- `/trust` (escalation steps, support/security emails, "Chef no-show or day-of issue" card)
- `/contact` (general support form)
- Guest portal (chef messaging)
- Dietary/cannabis pages (where safety-relevant data is collected)

**What remains as permanent exit:**

- Emergency services (911, poison control, hospital)
- Direct phone calls to chef, host, or venue
- Medical professionals for health emergencies
- Law enforcement for security threats

**Priority:** Low frequency x Low effort = Quick safety copy addition
**Spec needed?** No. Improve copy on existing pages only.

---

## Scenario #65: Unsubscribe or recover notification preferences

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why guest leaves:** Guest receives an email notification (Circle update, event reminder, marketing campaign) and wants to stop receiving them, or wants to manage what they receive. The operational reason is: notification control traditionally starts from an email unsubscribe link, taking the user to a browser page. The question is whether they can manage preferences without leaving the app ecosystem.

**Context ChefFlow has:**

- `/unsubscribe?rid=<id>` for marketing campaign unsubscribe (one-click, no auth)
- `/nearby/unsubscribe?t=<token>` for nearby alert unsubscribe (email-based token)
- `/api/push/unsubscribe` for push notification removal (requires auth)
- Circle notification muting via `toggleMuteCircle` in `lib/hub/group-actions.ts` (uses profile token)
- Circle members have `notifications_muted`, `notify_email`, `notify_push`, `quiet_hours_start`, `quiet_hours_end`, `digest_mode` fields
- Hub guest profiles have `notifications_enabled` flag
- Chef-side notification preferences system in `lib/interaction/notification-prefs-actions.ts` and `lib/notifications/settings-actions.ts`
- The Circle detail view already shows notification preferences (mute/unmute toggle)

**Data source?** No. ChefFlow owns the notification system entirely.

**Client-collaborative angle:** None. This is a direct user-to-platform preference.

**Physical reality:** Screen-based. Quick toggle or one-click unsubscribe from email footer.

**Compounding:** Medium. Once preferences are set, they persist across all future notifications. Each Circle membership has its own mute state.

**Solution design:**

- Marketing unsubscribe is ALREADY fully in-app (`/unsubscribe` page, one-click from email)
- Nearby unsubscribe is ALREADY fully in-app (`/nearby/unsubscribe` page)
- Circle mute/unmute is ALREADY in-app (profile token-based toggle)
- Push unsubscribe is in-app (API endpoint)
- Gap: no unified "notification preferences" page for no-login guests. A guest with a profile token can mute individual circles but cannot see ALL their notification settings in one place.
- Gap: email unsubscribe links land on ChefFlow pages (good), but do not offer "manage all preferences" as a next step
- Build: Add "Manage notification preferences" link on unsubscribe success pages that deep-links to `/hub/me/[profileToken]` notification section (if profile token exists in cookie)
- Build: On Circle notification settings, add link to mute/digest/quiet hours for each group

**Where it appears:**

- `/unsubscribe` (marketing campaign, one-click)
- `/nearby/unsubscribe` (nearby alerts)
- Circle detail view (mute toggle per circle)
- `/hub/me/[profileToken]` (profile with group list)
- Email footers (unsubscribe links)

**What remains as permanent exit:**

- Nothing fundamental. All notification control can be handled in-app.
- Edge case: email client "unsubscribe" header button may bypass in-app flow (but that is email client behavior, not a ChefFlow gap)

**Priority:** Medium frequency x Low effort = Quick win (add "manage all" links to existing unsub pages)
**Spec needed?** No. Wire existing components together with cross-links.

---

## Batch Summary

| #   | Title                                           | Reclassified To     | Spec Needed? |
| --- | ----------------------------------------------- | ------------------- | ------------ |
| 60  | Contact support or privacy inbox                | Partially Reducible | No           |
| 61  | Request data deletion or privacy help           | Reducible           | No           |
| 62  | Read Stripe or processor terms                  | Permanent           | No           |
| 63  | Read guest or client legal terms                | Reducible           | No           |
| 64  | Escalate safety concern                         | Permanent           | No           |
| 65  | Unsubscribe or recover notification preferences | Reducible           | No           |

---

## Key Findings

**ChefFlow's support/privacy/legal infrastructure for guests is surprisingly mature:**

1. **Data rights are fully self-serve** - `/data-request` with rate limiting, honeypot, case tracking, and admin dashboard. No guest needs to leave.
2. **Contact/support is comprehensive** - `/contact` with founder info, business hours, form submission. `/trust` with explicit escalation paths and boundaries.
3. **Privacy policy is thorough** - Covers all guest data flows (inquiries, dietary, RSVP, AI features, local AI, cookies).
4. **Unsubscribe flows are built** - Marketing, nearby, push, and Circle notification muting all exist.
5. **One real gap:** `/guest-terms` is a placeholder page that needs actual content authored.

**Minor wiring improvements needed (no specs):**

- Add support/privacy/data-request links to guest token page footers
- Complete `/guest-terms` content
- Add "manage all preferences" cross-link on unsubscribe success pages
- Add `?reason=safety` support to contact form for safety-concern routing
