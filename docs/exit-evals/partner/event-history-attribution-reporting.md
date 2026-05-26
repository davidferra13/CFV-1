# Exit Eval: Partner / EVENT HISTORY, ATTRIBUTION & REPORTING

> Wave 5 | 6 scenarios | Role: PARTNER
> Evaluator mode: Solo (NEEDS-DEVELOPER-REVIEW)
> Date: 2026-05-25

---

## Scenario #25: Verify missing or misattributed events

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why partner leaves:** Partner believes they hosted or referred an event that does not appear in their portal events list. They need to contact the chef (email/text) to ask "did you forget to tag my venue on that Saturday dinner?" The operational reason is accountability: the partner wants credit for work that happened at their venue, affecting their impact stats and potentially their commission.

**Context ChefFlow has:**

- All events with `referral_partner_id` and `partner_location_id` columns (schema at `lib/db/schema/schema.ts:23184-23185`)
- Partner portal events page shows only events linked via `partner_location_id` (see `lib/partners/portal-actions.ts:226-236`)
- Event dates, occasions, guest counts, statuses visible to partner (`app/(partner)/partner/events/page.tsx`)
- Partner locations with IDs (`lib/partners/portal-actions.ts:131-155`)
- Tokenized contribution report already aggregates events by location (`lib/partners/actions.ts:1443-1508`)

**Data source?** No. The gap is internal: events exist in ChefFlow but may not be linked to the partner. No external API needed.

**Client-collaborative angle:** Limited. The client does not typically know which venue partner should be credited. This is a chef-partner attribution question, not a Circle scenario.

**Physical reality:** Screen-based. Partner checks their portal, notices a gap, and currently must message the chef. A "report missing event" button within the events page would keep this in-app.

**Compounding:** Medium. Each correction improves future reporting accuracy and builds trust. Venue partners hosting monthly events would hit this repeatedly if attribution is inconsistent.

**Solution design:**

- Add a "Report Missing Event" button on `/partner/events` that opens a lightweight form (date range, description, optional notes)
- Create a `partner_event_attribution_requests` table or reuse the existing `partner_location_change_requests` pattern (submit/review/approve)
- Chef receives notification with the partner's claim; can link the event with one click via the existing `bulkAssignEventsForTenant` action (`lib/partners/store.ts` / `app/api/v2/partners/[id]/assign-events/route.ts`)
- Show request status (pending/resolved) in the partner portal
- After resolution, partner sees the event appear in their list automatically

**Where it appears:**

- `/partner/events` page (new button in empty state and as a persistent action)
- Chef-side `/partners/[id]` detail (incoming attribution request queue)

**What remains as permanent exit:**
Partner may still text the chef for time-sensitive attribution questions or disputes about events that genuinely were not booked through them.

**Priority:** Medium frequency (monthly for active venue partners) x Low effort (similar pattern to location change requests) = High rank signal
**Spec needed?** No (reuses existing request/review pattern; can be added to build queue as a task)

---

## Scenario #26: Export contribution report for internal use

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why partner leaves:** Partner wants to share their ChefFlow impact data with their own team, accounting, or property management. The tokenized report page (`/partner-report/[token]`) is viewable but not downloadable. They resort to screenshots, browser print, or copying to email/PDF manually.

**Context ChefFlow has:**

- Complete contribution report data: events, guests, revenue by location, occasion, status (`lib/partners/actions.ts:1407-1508`)
- Chef-side report page already has a Print button (`components/partners/partner-report-actions.tsx`) using `window.print()`
- Tokenized public report page renders all data in a clean layout (`app/(public)/partner-report/[token]/page.tsx`)
- Monthly report data with location breakdown, click counts, referral counts (`lib/partners/report.ts:51-217`)

**Data source?** No. All data already exists in ChefFlow. The partner just needs export controls.

**Client-collaborative angle:** None. This is purely partner-internal reporting.

**Physical reality:** Screen + export. Partner needs PDF download and/or "email this report" functionality. Print CSS already partially exists on the chef-side report page.

**Compounding:** Medium. Partners who report monthly (property managers, venue owners with boards) would use this every month. Eliminates screenshot-based reporting permanently.

**Solution design:**

- Add PDF download button to the tokenized report page (`/partner-report/[token]`) using browser print-to-PDF or server-side PDF generation
- Add "Email Report" action that sends the report as a formatted email to an address the partner specifies
- Add "Copy Link" button for the tokenized report URL (already exists chef-side via `SharePartnerReportButton`)
- Ensure print CSS is comprehensive on the partner-facing report page (match the chef-side `print:` classes)

**Where it appears:**

- `/partner-report/[token]` page (new action bar: Download PDF, Email, Copy Link)
- Optionally on `/partner/dashboard` as "View/Export My Report" if the partner has a valid token

**What remains as permanent exit:**
Partner may still need to paste data into their own accounting system or board deck format that cannot be auto-generated.

**Priority:** High frequency (every reporting cycle) x Low effort (print CSS + email action) = Very High rank signal
**Spec needed?** No (straightforward UI addition; add to build queue)

---

## Scenario #27: Compare ChefFlow event count with venue bookings

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** Partner's canonical booking ledger (Airbnb, VRBO, Peerspace, hotel PMS, venue calendar) is external. They want to cross-reference "ChefFlow says 8 events this quarter" against "my PMS says 12 chef bookings." The discrepancy might mean events are unlinked (see #25) or that some bookings used a different chef.

**Context ChefFlow has:**

- Partner event count and date list (`app/(partner)/partner/events/page.tsx`)
- Events with dates, locations, and statuses
- Contribution report with per-location event counts (`lib/partners/report.ts`)
- No external booking calendar data (ChefFlow does not integrate with Airbnb/VRBO/PMS)

**Data source?** Partially. Airbnb/VRBO/PMS APIs exist but are notoriously restrictive (no public API for hosts). iCal feeds are the realistic bridge, but these only contain dates/titles, not enough for rich reconciliation.

**Client-collaborative angle:** None. This is partner-internal reconciliation against their own systems.

**Physical reality:** Screen comparison. Partner typically has two tabs open: ChefFlow events and their booking platform. A date-based export or summary would help them reconcile without switching context.

**Compounding:** Low. This is a periodic reconciliation task, not a knowledge-building exercise. The pattern repeats but the data does not compound.

**Solution design:**

- Add date-range CSV export of partner events (date, occasion, guest count, status) from the partner portal
- Add "reconciliation notes" field where partner can log discrepancies for the chef
- Optionally accept iCal URL import to show external booking dates alongside ChefFlow events (view-only overlay)
- Surface the "Report Missing Event" flow (#25) prominently when discrepancies are found

**Where it appears:**

- `/partner/events` page (export CSV action, reconciliation notes)
- Optional: calendar overlay view if iCal import is built

**What remains as permanent exit:**
The partner will always need to check their booking platform for the canonical booking data. ChefFlow cannot replace Airbnb/VRBO/PMS as the source of truth for venue availability and bookings.

**Priority:** Low frequency (quarterly for most partners) x Medium effort (CSV export is simple; iCal is complex) = Medium rank signal
**Spec needed?** No (CSV export is a simple task; iCal overlay would need a spec if pursued)

---

## Scenario #28: Share impact results with a manager or owner

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why partner leaves:** The partner (e.g., a concierge or property manager) needs to show their boss/owner the value of the chef partnership. The audience does not have a ChefFlow account. Partner currently screenshots the dashboard, prints the report page, or forwards the tokenized link via email/Slack/PDF.

**Context ChefFlow has:**

- Tokenized public report links already exist (`/partner-report/[token]`), accessible without auth (`app/(public)/partner-report/[token]/page.tsx`)
- Share link generation via `generatePartnerShareLink` (`components/partners/share-partner-report-button.tsx`)
- Full stats: events, guests, revenue, conversion rate, location breakdown
- Report is already noindex (private by design)

**Data source?** No. ChefFlow has all the data. The gap is distribution and formatting for non-ChefFlow audiences.

**Client-collaborative angle:** None. This is partner-to-stakeholder reporting.

**Physical reality:** The manager/owner receives a link, PDF, or email. They glance at it in a meeting or inbox. Clean, branded, scannable format matters. Board decks need exportable graphics or summaries.

**Compounding:** Medium. Monthly or quarterly reporting to stakeholders builds a narrative of partnership value over time. Historical comparison would compound.

**Solution design:**

- Make the tokenized report link directly shareable by the partner (currently only chef generates it; add partner-initiated token refresh or persistent access)
- Add "Share Report" button in partner portal dashboard that copies the public link
- Add PDF download on the tokenized report page (see #26)
- Add executive summary section at top of report (3 numbers: events, guests, revenue) optimized for quick-glance stakeholder review
- Optionally add period comparison ("vs. last quarter") for narrative value

**Where it appears:**

- `/partner/dashboard` (Share Report button)
- `/partner-report/[token]` (download/share actions)
- Partner profile page (link to latest report)

**What remains as permanent exit:**
Partner will still paste into board decks, Slack messages, or internal tools with their own formatting requirements.

**Priority:** Medium frequency (monthly/quarterly) x Low effort (tokenized report already exists; just needs partner-side access + export) = High rank signal
**Spec needed?** No (combines #26 export work with partner-side link access; single build queue item)

---

## Scenario #29: Investigate event revenue details

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** Partner wants to know the financial details of specific events (exact pricing, payment status, breakdown). The partner portal intentionally excludes client PII and full financial detail by design. Revenue data in reports is aggregate only. Partner contacts the chef or checks their own accounting records for specifics.

**Context ChefFlow has:**

- Events have `quoted_price_cents` (visible in chef-side report at `lib/partners/report.ts:86`)
- Partner portal events show occasion, date, guest count, status only (no pricing; see `lib/partners/portal-actions.ts:228-229`)
- Tokenized report shows aggregate `total_revenue_cents` and per-location revenue (`lib/partners/actions.ts:1465,1499-1504`)
- Commission type/rate stored on partner record (per `partner-never-leaves-analysis.md` item 161)
- Payout history exists chef-side (`lib/partners/payout-actions.ts`)

**Data source?** No. The data exists in ChefFlow but is intentionally gated by privacy policy (client PII protection and chef financial discretion).

**Client-collaborative angle:** None. Revenue details are between chef and partner; clients should not be involved.

**Physical reality:** Screen-based. Partner checks accounting records or messages chef.

**Compounding:** Low. Each revenue investigation is event-specific. The pattern repeats but knowledge does not compound across events.

**Solution design:**

- Show allowed aggregate value per event period (already done in contribution report)
- Add privacy boundary explanation in partner portal ("Revenue details are managed by your chef partner for client privacy")
- Optionally: if chef enables "show event value to partner" toggle per-partner, display `quoted_price_cents` on the partner events table
- Show commission calculation when commission terms are set (commission_type + commission_rate from partner record applied to visible revenue)

**Where it appears:**

- `/partner/events` page (optional revenue column when chef enables it)
- `/partner/dashboard` (aggregate revenue stat already shown via contribution report)
- Privacy explanation text on partner portal

**What remains as permanent exit:**
Partner will always need to contact the chef for detailed financial breakdowns, payment timing, and line-item pricing. This is a deliberate privacy boundary, not a product gap. Full accounting reconciliation requires the partner's own systems.

**Priority:** Low frequency (occasional, usually around commission disputes) x High effort (requires new permission model per-partner) = Low rank signal
**Spec needed?** No (privacy boundary is intentional; optional revenue toggle is a small enhancement)

---

## Scenario #30: Track referral source beyond linked events

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** Partner refers potential clients informally (word of mouth, property guidebook mentions, social posts) but cannot log these referrals in ChefFlow. The `referral_records` table exists (`lib/db/schema/schema.ts:27723-27745`) but is chef-editable only. Partner tracks their own referral activity in spreadsheets or CRM because they have no submission surface.

**Context ChefFlow has:**

- `referral_records` table: id, tenant_id, partner_id, client_id, event_id, revenue_cents, notes, referred_at
- Chef can record referrals via `recordReferral` action (`lib/partners/actions.ts:1600-1633`)
- Partner leaderboard and performance analytics use referral + inquiry + event counts (`lib/partners/analytics.ts:319-403`)
- Events and inquiries have `referral_partner_id` for attribution
- Partner portal currently has no write surface for referral logging

**Data source?** No. The data is generated by the partner's own activity (informal referrals). ChefFlow is the correct destination; it just lacks the partner-side input surface.

**Client-collaborative angle:** Minimal. The referred client eventually fills an inquiry form (which can capture UTM/referral source), but the partner wants to log the referral before the client acts.

**Physical reality:** Screen-based. Partner refers someone (in person, via text, via guidebook) and wants to log it immediately from their phone. Quick-entry form optimized for mobile.

**Compounding:** High. A running referral log builds a complete picture of partner activity, enables fair commission tracking, and proves partner value even when referrals do not convert to inquiries. Every logged referral is permanent attribution evidence.

**Solution design:**

- Add "Submit a Referral" form in partner portal: client name (optional), date, method (word of mouth, guidebook, social, event, other), notes
- Store as `partner_referral_submissions` or insert into `referral_records` with a `submitted_by_partner` flag requiring chef approval
- Chef sees pending partner-submitted referrals in their partner detail page; can approve/link to inquiry/event or dismiss
- Show submission history and status (pending/approved/linked) in partner portal
- Count approved partner referrals in the leaderboard and contribution report

**Where it appears:**

- `/partner/dashboard` (quick "Log a Referral" button)
- New `/partner/referrals` page (submission history + new form)
- Chef-side `/partners/[id]` detail (approval queue)

**What remains as permanent exit:**
Partner may still track detailed CRM-level relationship data (contact frequency, follow-up cadence, multi-touch attribution) in their own systems. ChefFlow captures the referral event, not the full relationship pipeline.

**Priority:** High frequency (every referral event, potentially weekly for active partners) x Medium effort (new form + approval flow + schema addition) = Very High rank signal
**Spec needed?** Yes (new partner-side write surface with approval workflow warrants a standalone spec)

---

## Batch Summary

| #   | Title                                            | Reclassified To | Spec Needed? |
| --- | ------------------------------------------------ | --------------- | ------------ |
| 25  | Verify missing or misattributed events           | Bridgeable      | No           |
| 26  | Export contribution report for internal use      | Reducible       | No           |
| 27  | Compare ChefFlow event count with venue bookings | Permanent       | No           |
| 28  | Share impact results with a manager or owner     | Reducible       | No           |
| 29  | Investigate event revenue details                | Permanent       | No           |
| 30  | Track referral source beyond linked events       | Reducible       | Yes          |

---

## Key Findings

**Codebase evidence reviewed:**

- `app/(partner)/partner/events/page.tsx` - Partner events list (read-only, no actions)
- `lib/partners/portal-actions.ts` - Partner portal data fetching (no write surfaces for attribution)
- `lib/partners/report.ts` - Chef-side monthly report generation
- `lib/partners/actions.ts:1407-1508` - Tokenized contribution report
- `lib/partners/actions.ts:1600-1699` - Referral recording + performance (chef-only)
- `lib/partners/analytics.ts` - Leaderboard and source analytics (chef-only)
- `lib/partners/payout-actions.ts` - Payout recording (chef-only)
- `lib/db/schema/schema.ts:27723-27745` - referral_records table schema
- `app/api/v2/partners/[id]/assign-events/route.ts` - Bulk event assignment API
- `components/partners/partner-report-actions.tsx` - Print action (chef-side only)
- `components/partners/share-partner-report-button.tsx` - Share link generation (chef-side only)
- `app/(public)/partner-report/[token]/page.tsx` - Public tokenized report

**Pattern:** The partner portal is intentionally minimal (read-only dashboard + location change requests). Most attribution, reporting, and referral tools exist chef-side but have no partner-facing counterpart. The highest-value improvements are extending existing chef-side capabilities to the partner portal with appropriate approval gates.

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)_
