# Exit Eval: Admin / COMMUNICATION, SUPPORT & USER RELATIONSHIPS

> Wave 3 | 8 scenarios | Role: Admin
> Evaluated: 2026-05-25 | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #33: Read replies to admin emails

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why admin leaves:** Admin sends direct or broadcast emails from `/admin/communications` (via `lib/admin/email-actions.ts`). These set `replyTo: admin.email`, meaning replies land in the admin's personal Gmail/Outlook inbox. The admin must leave ChefFlow to read and respond to those replies, losing the connection between the original admin action and the reply thread.

**Context ChefFlow has:**

- The original email subject, recipient, body, and timestamp (logged via `logAdminAction` with `admin_sent_email` and `admin_broadcast_email` types)
- The admin's email address (used as `replyTo`)
- Chef/client profile data for the recipient
- Full audit trail of admin email sends in `admin_audit_log`

**Data source?** Yes. Gmail API (already integrated via `lib/gmail/sync.ts` and `lib/google/auth.ts`). The Gmail sync engine already fetches inbound emails, classifies them, and logs them into `communication_events`. However, this currently runs per-tenant (chef-level), not at the admin/platform level.

**Client-collaborative angle:** Limited. Replies are user-to-admin, not something a Circle collects. However, if a reply indicates a support need, it could auto-create a support note on the chef/client record.

**Physical reality:** Screen-based workflow. Admin reads replies at a desk, not in a kitchen.

**Compounding:** Medium. Patterns in user replies to admin emails (common questions, complaint types) compound into better template writing and proactive communication. Individual reply threads do not compound.

**Solution design:**

- Add a platform-level Gmail sync that ingests replies to admin-sent emails by matching `In-Reply-To` / `References` headers against stored `resend_message_id` values
- Display reply threads inline on the `/admin/communications` page, grouped by original send
- Surface unread admin reply count as a badge in admin nav
- Store replies in `communication_events` with a platform-scoped tenant or admin-specific scope
- Allow admin to respond from within ChefFlow (compose reply that sends via provider)

**Where it appears:**

- `/admin/communications` (reply thread panel)
- Admin nav badge (unread replies count)
- Chef detail page (link to relevant admin correspondence)

**What remains as permanent exit:**
Admin may still need to check personal inbox for replies that fail sync, edge-case threading, or attachments the sync cannot render.

**Priority:** High frequency (every admin email expects a reply) x Medium effort (Gmail API already integrated for chef-level) = HIGH
**Spec needed?** Yes

---

## Scenario #34: Resolve sensitive support issue by phone

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Some disputes, privacy violations, trust issues, or account compromises require real-time human conversation with nuance, empathy, and immediate back-and-forth. No text-based system replaces a phone call for de-escalation or complex identity verification.

**Context ChefFlow has:**

- Chef/client profile, account status, subscription status, event history
- Audit log of all admin actions on the account (`admin_audit_log`)
- Communication history (emails sent, broadcasts)
- Financial data (ledger entries, payment status)
- Account health score (`lib/chef/health-score.ts`)

**Data source?** No. Phone calls are analog, real-time human interactions.

**Client-collaborative angle:** None. This is admin-to-user, not Circle-collectable.

**Physical reality:** Voice call. Admin needs quick-reference context while on the phone (split-screen or printed summary). Large text, key facts, no clutter.

**Compounding:** Medium. Call outcomes (resolved, escalated, lost user) compound into support playbooks. Individual calls do not compound, but patterns across calls do.

**Solution design:**

- Add "Call Note" capture on chef/client detail page (date, duration estimate, topic, outcome, follow-up actions)
- Pre-call context card: one-click summary of account status, recent issues, financial standing, last contact
- Post-call audit entry (`admin_call_note` action type in `admin_audit_log`)
- Link call notes to specific issues in Hidden Issues or feedback reports

**Where it appears:**

- `/admin/users/[chefId]` (call note button + history)
- `/admin/clients` (same pattern for client calls)
- `/admin/audit` (call note entries)

**What remains as permanent exit:**
The phone call itself. Admin always leaves ChefFlow to make/receive the call. The app captures context before and outcome after, but never replaces the call.

**Priority:** Medium frequency (sensitive issues are rare but high-stakes) x Low effort (simple form + audit entry) = MEDIUM
**Spec needed?** No (straightforward form + audit pattern)

---

## Scenario #35: Help a chef through account recovery

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why admin leaves:** A chef cannot log in and contacts admin for help. Currently, admin must either (a) tell chef to use the self-service password reset at `/auth/forgot-password`, (b) manually inspect the database for auth issues, or (c) use the auth provider's dashboard. The password reset flow exists (`lib/auth/actions.ts` `requestPasswordReset()`) but there is no admin-initiated "send recovery link to this chef" action.

**Context ChefFlow has:**

- Chef email, account status, auth user ID (via `user_roles` join)
- Whether account is suspended or active (`account_status` field)
- Existing `requestPasswordReset()` function that generates token, hashes it, stores it, and emails a reset link
- Password reset email template (`lib/email/templates/password-reset.tsx`)
- Rate limiting on reset requests (3/hour)

**Data source?** No external data source needed. Auth is self-contained in ChefFlow's `auth_users` table with Drizzle ORM.

**Client-collaborative angle:** None. This is admin helping a specific user recover access.

**Physical reality:** Screen workflow. Admin is at a desk, chef is locked out (likely on phone or email).

**Compounding:** Low. Account recovery is per-incident. No knowledge accumulates.

**Solution design:**

- Add "Send Recovery Email" button on admin chef detail page (`/admin/users/[chefId]`)
- Reuse `requestPasswordReset()` logic but bypass rate limit for admin-initiated resets
- Log action as `password_reset_sent` in `admin_audit_log` (type already defined in `lib/admin/audit.ts`)
- Show last recovery email sent timestamp on chef detail
- Add "Account Access Diagnostics" section: is auth_user linked, is account suspended, last login attempt, MFA status

**Where it appears:**

- `/admin/users/[chefId]` (recovery button + diagnostics section)
- `/admin/audit` (logged action)

**What remains as permanent exit:**
If the issue is deeper than password reset (corrupted auth row, OAuth provider issue, email address change needed), admin may still need database access. But 90%+ of recovery cases are simple password resets.

**Priority:** Medium frequency (users forget passwords regularly) x Low effort (reuse existing function) = HIGH
**Spec needed?** No (simple wiring of existing function to admin UI)

---

## Scenario #36: Handle urgent outage communications

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** During a platform outage, users cannot access ChefFlow. Admin must communicate via external channels (status page, email provider, social media) because the in-app announcement banner is useless if users cannot load the app. This is a fundamental infrastructure reality.

**Context ChefFlow has:**

- Platform announcement banner system (`lib/admin/platform-actions.ts` `setAnnouncement()`) with info/warning/critical types
- Broadcast email capability (`lib/admin/email-actions.ts` `sendAdminBroadcastEmail()`)
- All chef emails for broadcast targeting
- Service health status (`/admin/services` Mission Control)

**Data source?** No. External status pages (StatusPage.io, etc.) and social channels are the communication medium during outage.

**Client-collaborative angle:** None during outage. After recovery, users seeing the banner confirms they are back.

**Physical reality:** High-urgency screen workflow. Admin needs fast, pre-written templates and one-click sends to multiple channels simultaneously.

**Compounding:** Low. Each outage is unique. However, having pre-written incident templates and a checklist compounds into faster response times.

**Solution design:**

- Add "Incident Response" section to `/admin/communications` with pre-built templates (planned maintenance, unplanned outage, partial degradation, resolved)
- One-click: set critical banner + send broadcast email + copy status-page-ready text to clipboard
- Store external status page URL in platform settings for quick-link access
- Add incident log entries (start time, channels notified, resolution time, post-mortem link)
- Post-recovery: auto-suggest clearing the banner and sending "resolved" broadcast

**Where it appears:**

- `/admin/communications` (incident response section)
- `/admin/system` (link to incident log)
- Platform announcement banner (auto-set on incident trigger)

**What remains as permanent exit:**
Admin must still post to external status page, social media, and any third-party notification services. ChefFlow can prepare the content but cannot post to StatusPage.io or Twitter on their behalf.

**Priority:** Low frequency (outages are rare) x Medium effort (templates + coordination UI) = LOW
**Spec needed?** No (enhancement to existing communications page)

---

## Scenario #37: Coordinate with a trusted admin/operator

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** When multiple operators manage the platform (owner + trusted admin), they need to coordinate on decisions, hand off tasks, or discuss sensitive matters. This naturally happens in Slack, SMS, or email because ChefFlow has no admin-to-admin messaging channel.

**Context ChefFlow has:**

- Platform admin list (via `platform_admins` table)
- Audit log showing who did what and when
- Presence system (`/admin/presence`) showing who is currently active
- Command Center for observability

**Data source?** No. Communication between humans uses external messaging tools.

**Client-collaborative angle:** None. This is internal operator coordination.

**Physical reality:** Text/chat workflow. Often asynchronous (Slack message, read later).

**Compounding:** Medium. Coordination patterns (who handles what, escalation paths, decision history) compound into operational playbooks. Individual messages do not.

**Solution design:**

- Add internal admin notes system: free-text notes attached to any admin entity (chef, client, event, issue)
- Add "Handoff" field on flagged items: assign to specific admin with context
- Show which admin last touched an item and when (already partially covered by audit log)
- Add simple admin-to-admin ping/notification within ChefFlow (not full messaging, just "look at this")

**Where it appears:**

- `/admin/users/[chefId]` (internal notes section)
- `/admin/silent-failures` (assign/handoff per issue)
- `/admin/audit` (coordination trail)
- Admin notification bell (pings from other admins)

**What remains as permanent exit:**
Real-time back-and-forth discussion, sensitive conversations that should not live in the platform's own database, and casual operational chat will remain in Slack/SMS. ChefFlow captures structured handoff context, not conversational messaging.

**Priority:** Medium frequency (daily for multi-operator platforms) x Medium effort (notes + assignment system) = MEDIUM
**Spec needed?** No (standard notes + assignment pattern)

---

## Scenario #38: Verify email delivery failure

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why admin leaves:** When an admin-sent email (direct or broadcast) fails to deliver, the admin currently has no visibility into why. They must check the Resend dashboard for bounce reasons, spam complaints, or delivery failures. The email provider has this data and ChefFlow already has partial infrastructure to capture it.

**Context ChefFlow has:**

- Resend webhook handler (`app/api/webhooks/resend/route.ts`) that processes `bounced`, `opened`, `clicked`, and `spam_complaint` events
- `email_suppressions` table that auto-populates on hard bounces/complaints
- `campaign_recipients` table with `bounced_at` and `spam_at` fields
- Full delivery reconciliation system (`lib/communication/delivery-reconciliation.ts`) tracking `pending`, `sent`, `delivered`, `read`, `failed` states with error codes
- `communication_events` table with `provider_delivery_status`, `provider_error_code`, `provider_error_message`
- Communication health dashboard (`lib/communication/health-metrics.ts`) showing `emailsFailed30d` and `recentFailures`
- Normalized email event types (`lib/email/provider/types.ts`): bounced, complained, opened, clicked

**Data source?** Yes. Resend API / webhooks (already integrated). The webhook handler already captures delivery events; the gap is surfacing these at the admin level (current health metrics are tenant-scoped via `requireChef()`).

**Client-collaborative angle:** None. Delivery diagnostics are purely technical.

**Physical reality:** Screen workflow. Admin needs to see failure reason, affected recipients, and suppression status.

**Compounding:** High. Knowing which email addresses consistently bounce or complain improves list hygiene permanently. Suppression list grows and protects sender reputation over time.

**Solution design:**

- Add admin-level delivery dashboard to `/admin/communications`: show sent/delivered/bounced/complained counts for admin emails
- Surface `email_suppressions` table as a browsable list (which addresses are suppressed and why)
- Show per-recipient delivery status on broadcast results (leveraging `campaign_recipients` data)
- Add "Delivery Health" section showing bounce rate, complaint rate, and suppression count
- Link individual failed sends to their error codes and provider status

**Where it appears:**

- `/admin/communications` (delivery health panel + per-send status)
- `/admin/communications` (suppression list viewer)
- Admin email send confirmation (immediate delivery status feedback)

**What remains as permanent exit:**
Deep Resend dashboard investigation (IP reputation, domain authentication issues, detailed SMTP logs) remains external. ChefFlow surfaces the "what failed and why" but not the "how to fix sender infrastructure."

**Priority:** High frequency (every broadcast needs delivery confirmation) x Low effort (data already captured, just needs admin UI) = HIGHEST
**Spec needed?** No (UI layer over existing data)

---

## Scenario #39: Answer support ticket from outside channel

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** Users contact support through channels other than ChefFlow: email to a support address, social media DMs, app store reviews, community forums. Admin must leave ChefFlow to read and respond on those platforms.

**Context ChefFlow has:**

- User profiles (chef email, phone, account status, subscription)
- Feedback/issue reports (`/admin/feedback`)
- Hidden Issues system (`/admin/silent-failures`)
- Audit log of all admin actions on the account
- Account health score and event history

**Data source?** No. External support channels (Zendesk, Intercom, social DMs, email) are the message source and response medium.

**Client-collaborative angle:** Limited. If a user submits feedback via the in-app feedback form, that is already captured. External channel tickets are by definition outside ChefFlow.

**Physical reality:** Screen workflow. Admin reads ticket on external platform, may need ChefFlow context to respond.

**Compounding:** Medium. Tracking which users contact support externally and why (patterns in external tickets) compounds into product improvement signals. Individual tickets do not compound.

**Solution design:**

- Add "External Support Reference" field on chef/client detail pages (link to external ticket/thread)
- Add "Support History" section showing in-app feedback + linked external ticket references
- Allow admin to log "external contact" events with channel, topic, resolution status
- Surface users who have open external tickets prominently in admin user list (badge/filter)
- Provide quick-copy context card: account summary, recent events, subscription status (for pasting into external support reply)

**Where it appears:**

- `/admin/users/[chefId]` (external support log + reference links)
- `/admin/feedback` (cross-reference with external tickets)
- Admin user list (filter: has open external ticket)

**What remains as permanent exit:**
Admin must still use the external support platform to read and respond. ChefFlow provides context going out and captures resolution coming back, but does not replace help desks.

**Priority:** Medium frequency (support requests are regular) x Low effort (reference fields + log entries) = MEDIUM
**Spec needed?** No (standard reference field pattern)

---

## Scenario #40: Send legal/privacy response

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** When a user submits a data rights request (GDPR export, deletion, correction) or requires a formal legal notice (privacy incident, terms violation), the admin must coordinate with legal counsel, use approved templates, and deliver responses through formal channels (email with specific headers, certified mail for serious matters).

**Context ChefFlow has:**

- Legal readiness system (`lib/legal/readiness.ts`, `lib/legal/actions.ts`) tracking policy versions, readiness items, and professional review status
- Data export capability (`lib/compliance/data-export.ts` `exportMyData()`) for GDPR takeout
- Takeout categories (`lib/exports/takeout-categories.ts`) covering recipes, clients, events, financials, conversations, etc.
- Policy acceptance tracking with version history
- Data rights case builder (`buildDataRightsCase()` in `lib/legal/readiness.ts`)
- Admin legal readiness overview (`getAdminLegalReadinessOverview()`)
- Compliance data import/export modules

**Data source?** No. Legal counsel approval, formal notice templates, and certified delivery are human/institutional processes.

**Client-collaborative angle:** The user initiates the request (data export, deletion). ChefFlow already supports self-service data export via the takeout system.

**Physical reality:** Screen + document workflow. Admin prepares response, gets counsel approval, sends via approved channel.

**Compounding:** Medium. Legal templates, response playbooks, and precedent decisions compound. Individual responses do not.

**Solution design:**

- Add "Data Rights Request" tracker in `/admin/legal-readiness`: log incoming requests with type (access, rectification, erasure, portability), requester, deadline, status
- Auto-generate data export package for portability/access requests using existing `exportMyData()` infrastructure
- Add response checklist: acknowledge receipt (72h), process request (30d), confirm completion
- Store response evidence (what was sent, when, confirmation of delivery)
- Link requests to specific user accounts for audit trail

**Where it appears:**

- `/admin/legal-readiness` (data rights request tracker)
- `/admin/users/[chefId]` (link to open data rights requests for this user)
- `/admin/audit` (legal response actions logged)

**What remains as permanent exit:**
Counsel review, formal notice drafting, certified delivery, and regulatory portal submissions all remain external. ChefFlow tracks the request lifecycle and provides the data, but does not replace legal process.

**Priority:** Low frequency (rare but legally mandated deadlines) x Medium effort (request tracker + auto-export integration) = MEDIUM
**Spec needed?** Yes (data rights request lifecycle tracker)

---

## Batch Summary

| #   | Title                                      | Reclassified To     | Spec Needed? |
| --- | ------------------------------------------ | ------------------- | ------------ |
| 33  | Read replies to admin emails               | Partially Reducible | Yes          |
| 34  | Resolve sensitive support issue by phone   | Permanent           | No           |
| 35  | Help a chef through account recovery       | Reducible           | No           |
| 36  | Handle urgent outage communications        | Permanent           | No           |
| 37  | Coordinate with a trusted admin/operator   | Bridgeable          | No           |
| 38  | Verify email delivery failure              | Reducible           | No           |
| 39  | Answer support ticket from outside channel | Bridgeable          | No           |
| 40  | Send legal/privacy response                | Permanent           | Yes          |

---

## Classification Distribution

- Reducible: 2 (#35, #38)
- Partially Reducible: 1 (#33)
- Bridgeable: 2 (#37, #39)
- Permanent: 3 (#34, #36, #40)

## Key Findings

1. **#38 is the highest-priority win**: ChefFlow already captures delivery events via Resend webhooks and has a full delivery reconciliation system. The gap is purely a UI layer at the admin level (current health metrics are chef-tenant-scoped).

2. **#35 is trivial to implement**: The `requestPasswordReset()` function and `password_reset_sent` audit type already exist. Just needs an admin-facing button that calls it.

3. **#33 requires the most new architecture**: Platform-level Gmail sync (vs current chef-tenant-level) is needed to pull admin email replies back in.

4. **The three Permanent exits (#34, #36, #40) benefit most from context capture**: Call notes, incident templates, and data rights request tracking all make the external work smoother without trying to replace it.
