# Staff Exit Evaluation: Clock, Pay, Banking & Tax

Mode: Solo batch. Every scenario is marked `NEEDS-DEVELOPER-REVIEW` because no chef/developer operational review happened in this lane.

## Scenario #15: Confirm money was deposited

**Original classification:** Permanent
**Reclassified to:** Bridgeable (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff are not trying to understand the shift record. They are trying to know whether spendable money actually reached their bank, payroll wallet, Venmo, Zelle, or cash balance after a chef says a payment was made.
**Context ChefFlow has:**

- Staff identity, active status, chef tenant, and protected staff routes through `requireStaff()` and `STAFF_PROTECTED_PATHS`.
- Staff time entries in `/staff-time` backed by `staff_clock_entries` via `getStaffPortalTimeTrackerData`.
- Event assignment actual hours and computed `pay_amount_cents` through `submitStaffHours` and `recordStaffHours`.
- Chef-side labor/payroll summaries in `/staff/labor`, `/staff/clock`, and `PayrollReport`.
- Chef-side W-2 payroll records in `/finance/payroll` and contractor payments in `/finance/contractors`.

**Data source?** No. Bank apps, payroll apps, Venmo, Zelle, and direct-deposit settlement are payment rails, not passive data sources. ChefFlow can use internal `payroll_records`, `contractor_payments`, and `event_staff_assignments` for recorded/sent status, but bank deposit availability remains external.
**Client-collaborative angle:** None for base wages. For event gratuity-funded payouts, Dinner Circle can confirm whether the client left a gratuity, but it should not expose staff banking details.
**Physical reality:** This is usually a post-shift phone check. Staff need a private, mobile-readable pay status and a clean link to the correct external rail, not a kitchen-screen workflow.
**Compounding:** Medium. Trust improves when every event builds a durable payout ledger, but the actual deposit confirmation is one-off per pay run.

**Solution design:**

- Add a staff-facing pay status panel that shows each completed assignment, approved hours, gross/estimated pay, payout method, and payout status.
- Let the chef mark contractor or payroll payments as scheduled, sent, failed, or reconciled without exposing chef-private finance details.
- Add an acknowledgment action: "I received this" or "I did not receive this" tied to the payment record.
- Preserve a clean outbound link or instruction for the external rail when the staff member needs to verify bank-side settlement.

**Where it appears:**

- `/staff-time` as a "Pay status" section beneath time entries.
- `/staff-schedule` past assignment rows for completed shifts.
- Chef-side `/staff/labor`, `/finance/payroll`, and `/finance/contractors` for source status management.

**What remains as permanent exit:**
Staff still leave for their actual bank balance, payroll provider deposit details, Venmo/Zelle wallet state, failed-transfer remediation, and any identity or tax withholding problem controlled by the payment provider.

**Priority:** High frequency x medium-high effort = P1 trust gap
**Spec needed?** yes

## Scenario #16: Receive informal tip or reimbursement

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to accept or verify money moving through informal rails: cash in hand, Venmo, Cash App, Zelle, or a one-off reimbursement from the chef after buying supplies or covering event costs.
**Context ChefFlow has:**

- Event-level tips in `event_tips` via `lib/finance/tip-actions.ts` and public `/tip/[token]` request flow.
- Staff tip entries, pool configs, distribution previews, and finalized distributions in `lib/staff/tip-actions.ts`.
- Staff clock hours that tip distribution can fall back to when tip hours are missing.
- Contractor payments with payment method values including `venmo`, `zelle`, `cash`, `direct_deposit`, and `other`.
- Current gap: these are chef-side financial surfaces; staff portal does not show tip/reimbursement receipt state.

**Data source?** No. Cash and peer-to-peer payment apps are payment rails. ChefFlow can record a tip/reimbursement ledger and status, but the staff member still receives money through the external rail or physically.
**Client-collaborative angle:** Yes for gratuity origin. Dinner Circle or the public tip flow can collect whether the client left a tip and by which method. It should only expose staff-safe distribution status, not internal split logic unless the chef publishes it.
**Physical reality:** Informal money often happens in the moment after service. Mobile acknowledgment, receipt photo capture, and "cash received" confirmation matter more than desktop reporting.
**Compounding:** Medium. Reimbursement/tip histories build trust and reduce repeated questions, but each transfer is still a discrete settlement event.

**Solution design:**

- Add staff-visible tip/reimbursement cards per event showing "expected", "sent", "received", or "needs review".
- Let staff acknowledge cash or external-app receipt without entering private bank data.
- Add receipt/photo upload for reimbursement evidence and connect it to chef-side finance review.
- Make tip pool finalization create staff-readable distribution lines once the chef approves them.

**Where it appears:**

- `/staff-schedule` past event detail or completed assignment row.
- `/staff-time` completed shift/pay section.
- Chef-side `/finance/contractors`, `/staff/labor`, and event closeout/tip panels.

**What remains as permanent exit:**
The actual Venmo, Cash App, Zelle, cash handoff, or banking dispute stays outside ChefFlow. ChefFlow should not become a payment wallet.

**Priority:** Medium-high frequency x medium effort = P1/P2 payout-trust bridge
**Spec needed?** yes

## Scenario #17: Correct a disputed time entry

**Original classification:** Reducible
**Reclassified to:** Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need an accountable way to say a recorded clock-in, clock-out, submitted hours value, or event assignment duration is wrong, and they need the chef to approve or reject the correction.
**Context ChefFlow has:**

- Staff can clock in/out for themselves in `/staff-time` through `clockInFromTimeTracker` and `clockOutFromTimeTracker`.
- Tokenized staff event briefings allow `submitStaffHours`, which updates `actual_hours`, `pay_amount_cents`, and assignment status.
- Chef can record hours through `recordStaffHours`, which computes pay from actual hours and effective rate.
- Staff schedule shows scheduled and actual hours for past assignments.
- Current gap: no staff-side dispute, correction request, audit note, or approval workflow is visible.

**Data source?** No external source. The core data is already in ChefFlow: `staff_clock_entries` and `event_staff_assignments`.
**Client-collaborative angle:** Usually none. If a staff member's hours depend on client-requested overtime or delayed service, Dinner Circle/event recap can capture the client-side cause as context, but the correction remains staff-chef.
**Physical reality:** Correction usually happens after the shift when staff notice the issue. The interface should be mobile-first, low-friction, and allow a short note or evidence attachment.
**Compounding:** High. Every corrected time entry improves payroll trust, dispute history, event costing, and future staffing estimates.

**Solution design:**

- Add a "Request correction" action on completed time entries and past assignments.
- Capture requested start/end/hours, reason, optional note/photo, and whether the dispute affects pay.
- Add chef approval/rejection with audit trail, automatic pay recomputation, and staff notification.
- Keep original clock data immutable while storing the approved correction as a separate review record.

**Where it appears:**

- `/staff-time` on each completed entry.
- `/staff-schedule` on past assignment rows.
- Chef-side `/staff/clock`, `/staff/labor`, and event staff roster review.

**What remains as permanent exit:**
Only evidence not stored in ChefFlow, such as an external text from the chef or a third-party location/payroll record, may need to be referenced. The correction workflow itself should stay in-app.

**Priority:** High frequency x medium effort = P1 reducible trust workflow
**Spec needed?** yes

## Scenario #18: Submit tax forms or contractor paperwork

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to provide legally sensitive onboarding, tax, identity, agreement, or contractor information in a form the chef can rely on for payroll, 1099, W-2, terms, and compliance workflows.
**Context ChefFlow has:**

- Staff terms page exists but is a placeholder under `/staff-terms`.
- Chef-side service agreement storage exists through `contractor_service_agreements` and `ContractorAgreementPanel`.
- W-9 data capture exists through `saveW9Data` and `W9FormPanel`, including TIN type, address, signed date, and collected status.
- Contractor payments and 1099 thresholds exist in `lib/finance/contractor-actions.ts` and `lib/finance/1099-actions.ts`.
- W-2 employee records exist in `lib/finance/payroll-actions.ts`, including filing status, address, pay type, and staff-member linkage.
- Current gap: staff do not have a self-service paperwork inbox or secure upload/signing flow in their portal.

**Data source?** No. Government forms, payroll portals, e-signature providers, and legal document execution are external authority/workflow systems. ChefFlow can collect status, metadata, uploads, and copies, but official filing/execution may remain external.
**Client-collaborative angle:** None. This is staff/chef compliance, not Dinner Circle. Client surfaces should not see it.
**Physical reality:** Staff may complete forms from a phone before the first shift, but TIN and identity data require privacy, save-and-resume, and clear warnings. Some docs may be paper first and uploaded later.
**Compounding:** High. Once W-9, W-2/W-4-like payroll data, agreement status, and terms acknowledgments are captured, future events no longer trigger the same onboarding chase.

**Solution design:**

- Add a staff paperwork checklist: W-9/W-4/payroll profile, service agreement, code-of-conduct/terms acknowledgment, and optional document upload.
- Let chef publish a paperwork request to a staff member and track submitted, needs review, accepted, expired, and rejected states.
- Store secure document metadata and last-four-only display for sensitive identifiers.
- Bridge to external e-sign/payroll/government portals with return capture: uploaded signed copy, confirmation number, or "completed outside ChefFlow".

**Where it appears:**

- New staff portal paperwork area or `/staff-dashboard` compliance card.
- `/staff-schedule` blocking warning before first assignment when required paperwork is missing.
- Chef-side `/staff/[id]`, `/finance/contractors`, `/finance/payroll/employees`, and `/staff/onboarding`.

**What remains as permanent exit:**
Official government instructions, payroll provider enrollment, e-sign provider execution, tax/legal advice, and filing stay external. ChefFlow stores the operational proof and status.

**Priority:** Medium frequency x high effort = P2 compliance foundation
**Spec needed?** yes

## Scenario #19: Download pay stubs or year-end tax docs

**Original classification:** Reducible
**Reclassified to:** Partially Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need durable copies of what they were paid and what tax documents were issued, especially pay stubs, W-2 summaries, 1099-NEC data, year-end totals, and proof for accountants or personal records.
**Context ChefFlow has:**

- Chef-side payroll records include pay period dates, regular/overtime hours, gross pay, withholdings, employer taxes, and net pay.
- `/finance/payroll/w2` can generate W-2 summary values and export CSV reference data.
- `/finance/tax/1099-nec` can generate 1099-NEC recipient values, W-9 status, and export data.
- Contractor payment records include payment method, amount, tax year, and YTD threshold status.
- Staff portal currently exposes schedule/time history but not downloadable pay stubs, W-2/1099 documents, or staff-safe tax summaries.

**Data source?** Partially. Internal payroll/contractor databases can generate reference summaries and staff pay history. Official filed W-2/1099 copies and pay-stub/legal payroll documents may come from payroll software or accountant uploads.
**Client-collaborative angle:** None. This is private staff/payroll data.
**Physical reality:** Staff need downloadable PDFs and mobile-friendly previews. Some will print or forward docs to accountants, so export clarity and date-stamped copies matter.
**Compounding:** High. A staff document vault reduces annual document chasing and creates a long-term employment/contractor record.

**Solution design:**

- Add staff-facing "Pay documents" with pay-period stubs, annual earnings summaries, W-2/1099 status, and uploaded official copies.
- Let chef publish/payroll-sync documents to selected staff members with access control and audit logs.
- Separate "reference summary" from "official filed document" using explicit labels.
- Add download events and optional "I found what I need" acknowledgment for support visibility.

**Where it appears:**

- `/staff-time` or a new staff pay/documents area.
- `/staff-dashboard` year-end alert when documents are available.
- Chef-side `/finance/payroll`, `/finance/payroll/w2`, `/finance/tax/1099-nec`, and `/finance/contractors`.

**What remains as permanent exit:**
Official payroll filing, SSA/IRS/provider portals, amended W-2/1099 processing, and accountant/legal interpretation remain external.

**Priority:** Medium frequency x high effort = P2 annual trust gap
**Spec needed?** yes

## Scenario #20: Track mileage for work

**Original classification:** Reducible
**Reclassified to:** Reducible (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to record work travel for reimbursement or tax tracking, usually connected to a specific event, prep run, emergency supply run, or between-site assignment.
**Context ChefFlow has:**

- Staff assignments already include event date, address context, arrival/serve/departure times, role, scheduled hours, and actual hours.
- Token staff event view and staff schedule expose event location and assignment context.
- Chef-side mileage logging exists through `mileage_logs`, `MileageTracker`, `MileageLogPanel`, and tax center mileage summaries.
- ChefFlow has event addresses and can tie logs to `event_id`.
- Current gap: no staff-side mileage capture or reimbursement field in `/staff-time`, `/staff-schedule`, or token staff portal.

**Data source?** Yes, partially. ChefFlow can use its own event/location database plus a route-distance source or staff-entered odometer/miles. IRS mileage rates are a static/slow-changing source, but staff reimbursement policy remains chef-controlled.
**Client-collaborative angle:** Light. Clients can provide venue access/parking details through Dinner Circle, which reduces unplanned mileage confusion, but mileage submission is staff-to-chef.
**Physical reality:** Mileage is often captured in the car or immediately after arrival. It needs a quick mobile form, recent route defaults, optional receipt/photo for parking/tolls, and offline-tolerant draft behavior.
**Compounding:** High. Repeated venue, home-base, and event-location pairs can prefill future mileage and reveal costly travel patterns.

**Solution design:**

- Add staff mileage/reimbursement submission tied to assignment, with event address prefilled and optional return trip.
- Let staff choose estimated route miles, manual odometer miles, parking/toll reimbursement, and notes.
- Route staff submissions into chef finance review, then into mileage/reimbursement/pay status.
- Reuse chef mileage tax logic where appropriate, but label staff entries as reimbursement/payable unless the chef imports them into business tax records.

**Where it appears:**

- `/staff-schedule` on upcoming/past assignment rows.
- `/staff-time` completed shift closeout.
- Token `/staff-portal/[id]` after hours submission.
- Chef-side `/finance/tax`, `/finance/expenses`, and event closeout/reimbursement review.

**What remains as permanent exit:**
Navigation itself, GPS route truth, toll transponders, parking meters, and personally controlled tax records may stay external. ChefFlow should capture the submitted reimbursement/tax record and approval status.

**Priority:** Medium frequency x medium effort = P1/P2 reducible finance capture
**Spec needed?** yes

## Scenario #21: Check minimum wage/overtime rules

**Original classification:** Permanent
**Reclassified to:** Bridgeable (NEEDS-DEVELOPER-REVIEW)

**Why staff leaves:** Staff need to know whether their recorded hours, pay rate, overtime, classification, or jurisdiction-specific rules are compliant, and whether they should challenge the chef or consult an authority.
**Context ChefFlow has:**

- Staff hourly rates and event/shift hours through staff member records, `staff_clock_entries`, `staff_schedules`, and `event_staff_assignments`.
- Payroll run UI already separates regular hours, overtime hours, hourly rate, and overtime pay at 1.5x.
- Payroll constants compute Social Security, Medicare, FUTA, and W-2 summaries, but use reference tax assumptions rather than labor-law authority.
- Staff schedule/time pages show scheduled/actual hours, but do not surface overtime/minimum-wage explanations to staff.
- ChefFlow knows event location and likely staff region/tenant region, which can help choose jurisdiction-specific references.

**Data source?** Partially. Federal/state/local wage and overtime rules can be sourced from official labor agencies or curated compliance data, but interpretation and disputes are legal/HR matters. ChefFlow should not replace state labor departments, payroll professionals, or lawyers.
**Client-collaborative angle:** None for wage rights. Clients should not see staff wage compliance details.
**Physical reality:** This is not a kitchen moment. Staff need private, calm, plain-language summaries with links to official sources and their recorded hours/rates.
**Compounding:** Medium. Jurisdiction and policy profiles compound across staff and events, but legal rules change and need maintenance.

**Solution design:**

- Add a staff pay-rules explainer that shows recorded hours, base rate, overtime hours if any, and chef policy for the pay period.
- Add jurisdiction-aware official-source links and an "ask/payroll question" action without presenting legal advice as final.
- Flag obvious internal inconsistencies, such as recorded overtime with no overtime pay field, missing hourly rate, or below-policy rates.
- Let chef configure staff pay policy and store review notes for disputed questions.

**Where it appears:**

- `/staff-time` pay/status section.
- `/staff-schedule` past assignments and pay-period summary.
- Chef-side `/finance/payroll/run`, `/staff/labor`, and staff profile/pay policy settings.

**What remains as permanent exit:**
Official labor-law interpretation, legal advice, government complaints, payroll-provider policy, and jurisdiction disputes remain external.

**Priority:** Lower frequency x high effort = P3 compliance bridge
**Spec needed?** yes

## Batch Summary

| #   | Title                                    | Reclassified To                              | Spec Needed? |
| --- | ---------------------------------------- | -------------------------------------------- | ------------ |
| 15  | Confirm money was deposited              | Bridgeable (NEEDS-DEVELOPER-REVIEW)          | yes          |
| 16  | Receive informal tip or reimbursement    | Bridgeable (NEEDS-DEVELOPER-REVIEW)          | yes          |
| 17  | Correct a disputed time entry            | Reducible (NEEDS-DEVELOPER-REVIEW)           | yes          |
| 18  | Submit tax forms or contractor paperwork | Partially Reducible (NEEDS-DEVELOPER-REVIEW) | yes          |
| 19  | Download pay stubs or year-end tax docs  | Partially Reducible (NEEDS-DEVELOPER-REVIEW) | yes          |
| 20  | Track mileage for work                   | Reducible (NEEDS-DEVELOPER-REVIEW)           | yes          |
| 21  | Check minimum wage/overtime rules        | Bridgeable (NEEDS-DEVELOPER-REVIEW)          | yes          |
