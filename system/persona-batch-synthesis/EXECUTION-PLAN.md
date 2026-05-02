# Persona Build Execution Plan (Module-Gated)

> Generated 2026-05-02.
> Source: 595 gaps from 315 personas, deduplicated and filtered.
> Rule: NOTHING gets built unless it goes into a module.

## Noise Reduction Summary

| Metric                                                                  | Count   |
| ----------------------------------------------------------------------- | ------- |
| Raw gaps from personas                                                  | 595     |
| Already built (LIKELY BUILT tags)                                       | ~45     |
| Vague/non-actionable ("Trust & Reliability", "Simplicity Under Stress") | ~180    |
| Duplicated across categories                                            | ~120    |
| **Actually new and buildable**                                          | **~80** |
| Rejected (cannabis dosing, out of scope)                                | 7       |

## Garbage Build Plans

The 304 directories in `system/persona-build-plans/` contain **786 task files** that are:

- Hallucinated file paths (`pages/_app.tsx`, `index.tsx` instead of `page.tsx`)
- Wrong patterns (React Router, REST APIs instead of server actions)
- No awareness of existing features (propose building recipe system that already exists)
- Generic boilerplate acceptance criteria

**Action: DELETE all 304 directories.** They are not executable. The category build docs are the usable signal.

---

## Module Execution Queue

Builds ordered by: persona count x severity, filtered to genuinely new features.

---

### MODULE: `events` (47+ gaps, HIGH avg severity)

**Target files:** `app/(chef)/events/`, `lib/events/`, `lib/scheduling/`

| #   | Build                            | Severity | Personas | What Exists                                                   | What to Add                                                                                                                                                                     |
| --- | -------------------------------- | -------- | -------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Event Timeline View**          | HIGH     | 12       | Prep timeline exists (`lib/prep-timeline/`). Calendar exists. | Gantt-style cross-event timeline showing all events on one horizontal axis. Per-event drill-down with prep, service, cleanup phases. Reuse `lib/events/time-truth.ts`.          |
| 2   | **Scheduling Conflict Flagging** | HIGH     | 5        | Calendar shows events. No conflict detection.                 | Auto-detect overlapping events by date+location. Show conflict badge on calendar. Alert on event creation if date conflicts. Wire into `lib/events/readiness.ts`.               |
| 3   | **Event Decision Audit Trail**   | HIGH     | 4        | Ledger is immutable. Event transitions logged.                | Surface a "Decision Log" tab on event detail showing all state transitions, quote changes, menu edits, and who/when. Read from existing `event_transitions` + `ledger_entries`. |
| 4   | **Time Zone Validation**         | MEDIUM   | 2        | Events store dates. No TZ awareness.                          | Add `timezone` field to events. Validate against chef's home TZ. Show TZ indicator on calendar. Warn on cross-TZ bookings.                                                      |

**Not building (from this category):**

- Offline-first architecture (major PWA rewrite, not a module feature)
- Dosing administration log (cannabis niche, rejected)
- "Project Mode" (events ARE projects in ChefFlow, just needs better language)
- Real-time inventory depletion (belongs in `operations` module)

---

### MODULE: `finance` (87 gaps, MEDIUM avg severity)

**Target files:** `app/(chef)/finance/`, `lib/finance/`, `lib/billing/`

| #   | Build                            | Severity | Personas | What Exists                                                     | What to Add                                                                                                                                             |
| --- | -------------------------------- | -------- | -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Dynamic Pricing Tiers**        | HIGH     | 3        | Static per-guest pricing. Flat rate or per-head.                | Tiered pricing: base price + per-guest tiers (1-10: $X, 11-20: $Y). Wire into quote builder. Update `lib/quotes/actions.ts` pricing calc.               |
| 2   | **Predictive Cost Analysis**     | HIGH     | 2        | Historical price data in OpenClaw. Linear interpolation exists. | Show cost projection on event detail: "Based on 6-month trend, ingredients for this menu will cost $X by event date." Use existing `lib/pricing/` data. |
| 3   | **Cost Centers**                 | LOW      | 1        | Expenses have categories. No cost center assignment.            | Add `cost_center` field to expenses. Group P&L by cost center. New table: `cost_centers` (id, chef_id, name, description).                              |
| 4   | **Automated Invoice Generation** | LOW      | 1        | Invoices exist but manual.                                      | One-click invoice from accepted quote. Pre-fill line items from quote. Wire `lib/quotes/actions.ts` -> `lib/finance/invoice-actions.ts`.                |

**Not building:**

- Financial Module Overhaul (too vague)
- Scenario Builder (interesting but V2)
- Single Source of Truth Dashboard (dashboard already exists)
- Batch/Lot Tracking (belongs in `operations`)

---

### MODULE: `clients` (66 gaps, MEDIUM avg severity)

**Target files:** `app/(chef)/clients/`, `lib/clients/`, `lib/chat/`

| #   | Build                                | Severity | Personas | What Exists                                    | What to Add                                                                                                                                                                            |
| --- | ------------------------------------ | -------- | -------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Pre-Event Communication Workflow** | MEDIUM   | 3        | Email exists. No sequenced pre-event outreach. | Automated email sequence: T-14d (menu confirmation), T-7d (logistics), T-3d (final details), T-1d (reminder). Templates in `lib/email/templates/`. Triggered from event date via cron. |
| 2   | **Vendor Communication Hub**         | MEDIUM   | 3        | Vendors exist in directory. No messaging.      | Unified message thread per vendor. Reuse chat infrastructure (`lib/chat/`). Add vendor-type conversations.                                                                             |
| 3   | **Bilingual Draft Mode**             | MEDIUM   | 1        | Remy generates English text.                   | Add language preference to client profile. Remy generates bilingual drafts (English + client language). Uses existing Ollama pipeline.                                                 |
| 4   | **Client Communication Portal**      | MEDIUM   | 1        | Client portal exists. Chat exists.             | Already mostly built. Just needs better visibility in client portal nav.                                                                                                               |

**Not building:**

- Secure Communication (already have auth-gated chat)
- Ghost Mode Input (too vague)
- Expert Network Integration (V2)

---

### MODULE: `protection` (48 gaps, MEDIUM avg severity)

**Target files:** `app/(chef)/protection/`, `lib/compliance/`

| #   | Build                             | Severity | Personas | What Exists                                                               | What to Add                                                                                                                                                               |
| --- | --------------------------------- | -------- | -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Consolidated Audit Trail View** | HIGH     | 8        | Ledger immutable. Event transitions logged. But scattered across screens. | Single `/protection/audit-trail` page. Query all immutable records: ledger, event transitions, quote state changes. Filterable by date, entity, action type.              |
| 2   | **Traceability Export**           | HIGH     | 2        | Data exists in DB. No export.                                             | PDF/CSV export of full chain: ingredient source -> purchase -> recipe -> event -> guest. For compliance audits.                                                           |
| 3   | **Compliance Gate**               | HIGH     | 2        | Cannabis compliance exists. No general gate.                              | Pre-event compliance checklist: insurance valid, permits current, food safety cert not expired. Block event confirmation if missing. Wire into `lib/events/readiness.ts`. |

**Not building:**

- Master Audit Trail (same as #1 above)
- Automated Compliance Checks (cannabis already built)
- All "Trust & Reliability" gaps (not features, just sentiment)

---

### MODULE: `operations` (33+ gaps, HIGH avg severity)

**Target files:** `app/(chef)/operations/`, `lib/vendors/`, `lib/inventory/`

| #   | Build                          | Severity | Personas | What Exists                                      | What to Add                                                                                                                  |
| --- | ------------------------------ | -------- | -------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Vendor Scorecard**           | HIGH     | 8        | Vendor directory exists. Order history exists.   | Calculated vendor score: delivery reliability, price competitiveness, quality rating. Dashboard card on vendor detail.       |
| 2   | **Sourcing Dependency Map**    | HIGH     | 3        | Ingredients linked to vendors. No visualization. | Show which vendors supply which ingredients for which events. Highlight single-source risk.                                  |
| 3   | **Supplier Vetting Checklist** | HIGH     | 4        | Vendor records exist. No vetting workflow.       | Add vetting status to vendors: unvetted, in-review, approved, suspended. Checklist: insurance, food safety cert, references. |
| 4   | **Inventory Depletion Alerts** | HIGH     | 3        | Inventory tracking exists.                       | Alert when stock drops below reorder point. Dashboard widget. Wire into existing `lib/inventory/` actions.                   |

**Not building:**

- Multi-store route optimizer (requires mapping API, V2)
- External store availability (requires store API integrations)
- Supply Chain Volatility (too abstract)

---

### MODULE: `culinary` (48 gaps, MEDIUM avg severity)

**Target files:** `app/(chef)/culinary/`, `lib/culinary/`, `lib/dietary/`

| #   | Build                         | Severity | Personas | What Exists                                     | What to Add                                                                                                                      |
| --- | ----------------------------- | -------- | -------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Recipe Scaling Accuracy**   | MEDIUM   | 3        | Recipe scaling exists. Linear only.             | Non-linear scaling rules per ingredient (e.g., salt doesn't scale 1:1). Per-ingredient scale factor field.                       |
| 2   | **Cross-Contact Risk Matrix** | MEDIUM   | 2        | Allergen classification exists. Per-dish.       | Show allergen cross-contact risk across entire menu. Matrix: ingredients x allergens. Highlight prep station contamination risk. |
| 3   | **Yield-Based Inventory**     | MEDIUM   | 3        | Ingredient quantities exist. No yield tracking. | Yield factor per ingredient (bought vs usable weight). Auto-adjust shopping quantities. Field already spec'd in `lib/pricing/`.  |

**Not building:**

- Recipe Costing Module (already exists at `lib/culinary/plate-cost-actions.ts`)
- Dynamic Recipe Costing Engine (already exists)
- Constraint Layering (too abstract)

---

### MODULE: `more` (analytics) (32 gaps, MEDIUM avg severity)

| #   | Build                          | Severity | Personas | What to Add                                                                                                     |
| --- | ------------------------------ | -------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | **Event Storytelling Report**  | MEDIUM   | 3        | Post-event narrative: what happened, financials, guest feedback, photos. PDF export. Reuse AAR generator.       |
| 2   | **Role-Based Dashboard Views** | MEDIUM   | 2        | Different default widgets for different chef archetypes. Wire into progressive disclosure system already built. |

---

### MODULE: `commerce` (5 gaps, MEDIUM avg severity)

| #   | Build                       | Severity | Personas | What to Add                                                                                                |
| --- | --------------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **Waitlist/Access Control** | MEDIUM   | 2        | Tiered access for ticketed events. VIP early access, waitlist management. Extends existing `lib/tickets/`. |

---

### MODULE: `station-ops` (7 gaps, MEDIUM avg severity)

| #   | Build                    | Severity | Personas | What to Add                                                                            |
| --- | ------------------------ | -------- | -------- | -------------------------------------------------------------------------------------- |
| 1   | **Staff Schedule Board** | MEDIUM   | 3        | Visual staff assignment to events. Who works what day. Extends `lib/staff/actions.ts`. |
| 2   | **Labor Cost Tracking**  | MEDIUM   | 2        | Per-event labor cost from staff hours x rate. Rolls into event P&L.                    |

---

### MODULE: `social-hub` (2 gaps, LOW avg severity)

| #   | Build             | Severity | Personas | What to Add                                                                                     |
| --- | ----------------- | -------- | -------- | ----------------------------------------------------------------------------------------------- |
| 1   | **Guest Vetting** | LOW      | 1        | Host approval required before guest joins circle. Already partially built in circle membership. |

---

## Execution Order (Recommended)

1. **Events: Timeline View** - 12 personas, HIGH, extends existing calendar
2. **Events: Conflict Flagging** - 5 personas, HIGH, low effort
3. **Protection: Audit Trail View** - 8 personas, HIGH, read-only (safe)
4. **Operations: Vendor Scorecard** - 8 personas, HIGH, extends existing vendor page
5. **Finance: Dynamic Pricing Tiers** - 3 personas, HIGH, extends quote builder
6. **Clients: Pre-Event Communication** - 3 personas, MEDIUM, uses existing email infra
7. **Culinary: Cross-Contact Risk Matrix** - 2 personas, MEDIUM, extends allergen system
8. **Operations: Supplier Vetting** - 4 personas, HIGH, new workflow on vendor page
9. **Protection: Traceability Export** - 2 personas, HIGH, PDF generation
10. **Finance: Predictive Cost Analysis** - 2 personas, HIGH, uses OpenClaw data

## What Was Killed

| Category                   | Reason                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Cannabis Dosing (7 gaps)   | REJECTED. Hyper-niche, 3 personas. Basic compliance exists.                                   |
| Offline-first (5 gaps)     | DEFERRED. Major PWA architecture work, not a module feature.                                  |
| ~180 vague sentiment gaps  | KILLED. "Trust & Reliability", "Simplicity Under Stress", "Over-Automation" are not features. |
| ~120 duplicates            | MERGED into module builds above.                                                              |
| 304 build plan directories | TO DELETE. Hallucinated specs, not executable.                                                |
