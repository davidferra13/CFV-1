# Exit Eval: Admin / DATABASE, MIGRATIONS & CROSS-TENANT DATA REPAIR

> Wave 3 | 8 scenarios | Role: ADMIN | Date: 2026-05-25
> Status: NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)

---

## Scenario #17: Apply a migration

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Schema changes are source-controlled operations that require running `drizzle-kit migrate` or applying raw SQL files from `database/migrations/`. The admin needs terminal access to execute `npm run db:migrate` or `drizzle-kit push`. These are destructive operations that can break the running app if applied incorrectly, requiring rollback capability that only exists at the infrastructure level.

**Context ChefFlow has:**

- Full migration file inventory in `database/migrations/` (100+ timestamped SQL files)
- `package.json` scripts: `drizzle:migrate`, `drizzle:push`, `db:migrate`
- Drizzle schema at `lib/db/schema/schema.ts` and `lib/db/migrations/schema.ts`
- System Health page shows table row counts (evidence of DB connectivity)

**Data source?** No. This is a process control action, not a data lookup.
**Client-collaborative angle:** None. Infrastructure-only concern.
**Physical reality:** Terminal/CLI. This is a developer action requiring full process control, stdout/stderr visibility, and rollback capability.
**Compounding:** Low. Each migration is a one-time event. The knowledge of "how to migrate" compounds but the action itself does not.

**Solution design:**

- Surface last-applied migration timestamp and pending migration count in `/admin/system`
- Show migration file list with applied/pending status (read-only)
- Link to runbook commands (copy-to-clipboard) for common migration operations
- Never allow in-app execution of migrations (too dangerous)

**Where it appears:**

- `/admin/system` (System Health) - migration status badge
- Admin shell "External Dashboards" section - runbook link

**What remains as permanent exit:**
Running the migration itself. Schema changes are inherently infrastructure-level. The admin will always go to terminal for `npm run db:migrate`. ChefFlow's job is to surface whether migrations are pending, not to execute them.

**Priority:** Low frequency (migrations happen during development, not daily ops) x Low effort (status display only) = Low priority
**Spec needed?** No

---

## Scenario #18: Inspect raw cross-tenant records

**Original classification:** Reducible
**Reclassified to:** Partially Reducible

**Why admin leaves:** When debugging support cases (e.g., "why is this client orphaned?" or "why does this event show wrong status?"), the admin needs to see raw database rows across tenant boundaries. Currently the admin portal provides curated views (`/admin/users`, `/admin/clients`, `/admin/events`) but these show summary data, not raw column values. The admin goes to SQL console to inspect `tenant_id`, `created_at`, foreign key references, and internal state columns.

**Context ChefFlow has:**

- `lib/admin/platform-stats.ts` already queries cross-tenant with `createAdminClient()` (no RLS)
- `/admin/system` shows table row counts, zombie events (non-terminal >30 days), orphaned clients (no tenant)
- Chef detail pages show events, clients, ledger entries per tenant
- `lib/db/admin.ts` provides `createAdminClient()` which uses `createCompatClient()` without RLS

**Data source?** Yes, it is the app's own PostgreSQL database. ChefFlow should present its own data without requiring SQL console access.
**Client-collaborative angle:** None. This is internal debugging.
**Physical reality:** Screen/desktop. Admin needs to scan tabular data, filter, and cross-reference IDs.
**Compounding:** Medium. Common support patterns repeat (orphaned records, status mismatches, missing tenant_id). Building drilldowns for these eliminates repeated SQL trips.

**Solution design:**

- Add "Record Inspector" to admin panel (read-only, audited)
- Support common lookups: find record by ID, find records by tenant, show FK relationships
- Pre-built queries for known integrity issues: orphaned clients, zombie events, unlinked ledger entries
- Show raw column values with tenant context
- Log every admin inspection to audit trail (already have `logAdminAction` with `admin_viewed_chef`/`admin_viewed_client` types)

**Where it appears:**

- `/admin/system/inspector` - new read-only record browser
- Linked from existing integrity signals on `/admin/system` (orphaned clients, zombie events)
- Chef/client/event detail pages - "View raw record" link for admin

**What remains as permanent exit:**
Arbitrary SQL queries, complex JOINs, and ad-hoc analysis that doesn't fit pre-built views. Also, any query involving tables not exposed through the inspector.

**Priority:** High frequency (support debugging is recurring) x Medium effort (read-only views with audit) = High priority
**Spec needed?** Yes

---

## Scenario #19: Repair malformed tenant data

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** When cross-tenant data is malformed (wrong tenant_id, null required fields, orphaned FK references), the admin needs to run UPDATE/INSERT statements directly. This is high-risk because: (1) it bypasses application validation, (2) it can violate business invariants (immutable ledger entries, event state machine), (3) tenant boundary mistakes affect real users. Currently there is no admin UI for data repair; it requires SQL console access.

**Context ChefFlow has:**

- Integrity signals in `/admin/system`: zombie events, orphaned clients
- `createAdminClient()` bypasses RLS for cross-tenant reads
- Immutability guards on `ledger_entries`, `event_transitions`, `quote_state_transitions`
- `logAdminAction()` for audit trail
- `nonBlocking()` wrapper in `lib/monitoring/non-blocking.ts` captures side-effect failures

**Data source?** No. This is a mutation action, not data retrieval.
**Client-collaborative angle:** None. Infrastructure repair.
**Physical reality:** Screen. Requires careful review before mutation, confirmation dialogs, and result verification.
**Compounding:** Medium. Common repair patterns repeat (reassign tenant, fix null fields, resolve FK orphans). Building constrained actions eliminates repeated SQL risk.

**Solution design:**

- Add constrained repair actions for known patterns (not arbitrary SQL):
  - "Reassign client to correct tenant" (with preview and audit)
  - "Fix orphaned record" (assign missing tenant_id)
  - "Soft-delete corrupted row" (mark inactive, never hard delete)
- Require confirmation + reason field for every mutation
- Immutable audit log entry for every repair action
- Preview mode: show what would change before committing
- Never allow repair on immutable tables (ledger, transitions)

**Where it appears:**

- `/admin/system/repair` - constrained repair tool
- Linked from integrity signals (orphaned clients, zombie events)
- Each repair action produces an audit log entry viewable at `/admin/audit`

**What remains as permanent exit:**
Novel data corruption patterns, complex multi-table repairs, anything touching immutable records. The admin will still need SQL console for edge cases that don't fit the constrained repair templates.

**Priority:** Medium frequency (data corruption is occasional, not daily) x High effort (mutations need safety rails, preview, audit) = Medium priority
**Spec needed?** Yes

---

## Scenario #20: Investigate RLS/service-role behavior

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** When admin queries behave unexpectedly (data not visible, unexpected empty results), the admin needs to understand whether RLS policies are interfering. The codebase uses `createAdminClient()` which returns a `CompatClient` with no RLS (direct PostgreSQL via `lib/db/compat.ts`). However, diagnosing policy behavior requires inspecting `pg_policies`, testing queries as different roles, and understanding the `get_current_user_role()` / `get_current_tenant_id()` functions in the schema.

**Context ChefFlow has:**

- `lib/db/admin.ts`: `createAdminClient()` explicitly bypasses RLS (uses compat layer directly)
- `lib/db/schema/schema.ts`: Contains all `pgPolicy()` definitions inline (e.g., `chef_wss_all` policy on `website_stats_snapshots`)
- Schema policies use `get_current_user_role()` and `get_current_tenant_id()` for tenant scoping
- No in-app RLS diagnostic UI exists

**Data source?** Partially. PostgreSQL system catalog (`pg_policies`) is the source of truth.
**Client-collaborative angle:** None. Deep infrastructure concern.
**Physical reality:** Screen. Developer needs to read policy definitions and test queries.
**Compounding:** Low. RLS investigation is rare and usually tied to schema changes.

**Solution design:**

- Document which admin surfaces intentionally bypass tenant scoping (already done implicitly via `createAdminClient()`)
- Add a "Tenant Scoping Status" section to `/admin/system` showing which admin queries use service role vs tenant-scoped queries
- Keep as reference documentation, not an interactive tool

**Where it appears:**

- `/admin/system` - informational section on data access modes
- Developer documentation (internal only)

**What remains as permanent exit:**
Actual policy diagnosis, testing queries as different roles, modifying policies. These are PostgreSQL administration tasks that belong in database tools.

**Priority:** Very low frequency (only during development/debugging) x Low effort (documentation only) = Very low priority
**Spec needed?** No

---

## Scenario #21: Restore from backup

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Database restoration is disaster recovery. It requires access to backup files, `pg_restore` or equivalent tooling, and the ability to stop the application during restoration. This is infrastructure-level and must never be executable from within the app (since the app depends on the database being in a consistent state).

**Context ChefFlow has:**

- System Health page shows table row counts (proxy for "database is alive")
- No backup status, backup schedule, or last-backup timestamp is surfaced
- Self-hosted PostgreSQL (no cloud backup provider dashboard)

**Data source?** No. This is process control.
**Client-collaborative angle:** None.
**Physical reality:** Terminal. Requires stopping services, running pg_restore, verifying integrity.
**Compounding:** Low. Disaster recovery is (hopefully) a one-off event.

**Solution design:**

- Surface backup freshness in `/admin/system`: last backup timestamp, backup size, backup location
- Show alert if backup is stale (>24h old, configurable threshold)
- Link to restoration runbook (copy-to-clipboard commands)
- Never allow in-app restore execution

**Where it appears:**

- `/admin/system` - "Backup Status" card with freshness badge
- Admin notification if backup is stale

**What remains as permanent exit:**
The entire restore process. Backup restoration is always a terminal/infrastructure operation.

**Priority:** Very low frequency (disaster only) x Low effort (status display) = Low priority
**Spec needed?** No

---

## Scenario #22: Run one-off data export for legal/support

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** Legal requests (GDPR, data portability), support escalations, or compliance needs require exporting specific tenant data. Currently the admin has CSV export only for the price catalog (`/admin/price-catalog/csv-export` via `catalog-tab.tsx`). For other tables (events, clients, ledger, messages), the admin must use SQL console or scripts.

**Context ChefFlow has:**

- Price catalog CSV export already exists (filtered, sanitized via `lib/security/csv-sanitize.ts`)
- `getPlatformReconciliation()` aggregates cross-tenant financial data
- Admin can view chef detail, client list, events, ledger entries through the portal
- `logAdminAction()` provides audit trail for sensitive actions
- `lib/admin/platform-stats.ts` has cross-tenant query patterns

**Data source?** Yes, it is ChefFlow's own database.
**Client-collaborative angle:** Minimal. Legal/support exports are admin-initiated, though the reason may come from a user request.
**Physical reality:** Screen. Admin selects scope, previews, downloads file.
**Compounding:** Medium. Export templates for common legal/support patterns (full user data export, event history, financial records) can be reused across requests.

**Solution design:**

- Add scoped export packs to admin panel:
  - "Full Chef Data Export" (all tenant data for one chef: profile, clients, events, ledger, messages)
  - "Client Data Export" (single client across tenant: profile, events, preferences)
  - "Financial Export" (ledger entries, transfers, fees for date range)
  - "Audit Export" (all audit log entries for a target)
- Require reason field before export (audit why data was extracted)
- Sanitize PII where export purpose doesn't require it
- CSV + JSON format options
- Log every export to audit trail with export reason

**Where it appears:**

- `/admin/data-export` - new scoped export tool
- Linked from chef detail and client detail pages ("Export this user's data")
- `/admin/audit` shows export actions

**What remains as permanent exit:**
Arbitrary exports requiring complex joins or custom formatting. External delivery of exports (email, upload to legal portal). Responding to the actual legal request (drafting response letters).

**Priority:** Medium frequency (legal requests, support cases) x Medium effort (template-based exports with audit) = Medium priority
**Spec needed?** Yes

---

## Scenario #23: Debug missing public directory records

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why admin leaves:** When a chef should appear on the public `/chefs` directory but doesn't, the admin goes to the database to check `directory_approved` status, whether the chef's profile is complete enough, and whether any indexing/cache issue is preventing display. Currently `/admin/directory` shows approve/revoke toggles but no diagnostic information about why a chef might not be appearing.

**Context ChefFlow has:**

- `/admin/directory` page with `getDirectoryCandidates()` showing all chefs with `directory_approved` status
- `lib/directory/admin-actions.ts`: approve/revoke functions that update `chefs.directory_approved` and revalidate cache
- `lib/directory/actions.ts` and `lib/directory/public-stats.ts` for public-facing directory logic
- Web research queue (`/admin/web-research`) with candidate review, approval, rejection, and audit trail
- `revalidateTag('directory-chefs')` and `revalidatePath('/chefs')` on approval changes

**Data source?** Yes, ChefFlow's own data. The directory is entirely internal.
**Client-collaborative angle:** None. Admin-only debugging.
**Physical reality:** Screen. Admin needs to see approval status, profile completeness, cache state.
**Compounding:** High. Understanding why chefs don't appear builds a diagnostic pattern that applies to every future case.

**Solution design:**

- Add diagnostic panel to `/admin/directory` per-chef:
  - Approval status (approved/not approved)
  - Profile completeness check (required fields for directory listing)
  - Last cache invalidation timestamp
  - Whether chef appears in public query results (live check)
  - Source provenance: how chef entered the system (web research, self-signup, admin-created)
- Add "Why not showing?" button that runs the full eligibility check and reports each criterion
- Show last-reviewed timestamp per chef
- Link to web-research audit trail if chef came through that pipeline

**Where it appears:**

- `/admin/directory` - per-chef diagnostic expansion
- `/admin/web-research` - source provenance and approval history
- `/admin/directory-listings` - external listing status

**What remains as permanent exit:**
Verifying external search engine indexing (Google Search Console). Checking if the public page is actually rendering correctly in a browser (requires visiting the page).

**Priority:** Medium frequency (directory issues are recurring during growth) x Low effort (diagnostic display using existing data) = High priority
**Spec needed?** No (can be built as enhancement to existing `/admin/directory` page)

---

## Scenario #24: Investigate audit-log write failure

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** `logAdminAction()` in `lib/admin/audit.ts` is intentionally non-fatal: failures are caught and logged to `console.error` only. When audit writes fail (DB connection issues, schema drift, permission errors), the admin has no visibility into these failures from the admin panel. They must check server logs or terminal output to discover and diagnose the problem.

**Context ChefFlow has:**

- `lib/admin/audit.ts`: `logAdminAction()` with try/catch that logs to console on failure
- `lib/monitoring/non-blocking.ts`: structured failure capture system writing to `side_effect_failures` table
- `/admin/silent-failures` (Hidden Issues): already surfaces non-blocking operation failures by source and severity
- `admin_audit_log` table with indexes on `action_type`, `actor_email`, and timestamp
- `/admin/audit` page displays audit entries but has no health indicator

**Data source?** Partially. Server logs contain the error details, but the failure pattern could be captured internally.
**Client-collaborative angle:** None. Infrastructure monitoring.
**Physical reality:** Screen. Admin needs alerts and diagnostic details.
**Compounding:** Medium. Audit health is a persistent concern; once monitored, the pattern serves forever.

**Solution design:**

- Wire `logAdminAction()` failures through `nonBlocking()` wrapper so they land in `side_effect_failures` table
- Add "Audit Health" indicator to `/admin/audit` page:
  - Last successful write timestamp
  - Recent failure count (from `side_effect_failures` where source = 'audit-log')
  - Link to `/admin/silent-failures` filtered by audit source
- Add audit-specific alert in Hidden Issues when audit writes fail repeatedly
- Consider: if audit log is down, should admin mutations be blocked? (Product decision for developer)

**Where it appears:**

- `/admin/audit` - health badge at top of page
- `/admin/silent-failures` - audit failures appear automatically once wired through `nonBlocking()`
- Admin notification if audit health degrades

**What remains as permanent exit:**
Root-cause investigation of why the database connection failed (server logs, PostgreSQL logs, infrastructure diagnosis). The actual fix if it's a schema or permission issue.

**Priority:** Low frequency (audit failures are rare if DB is healthy) x Low effort (wire existing `nonBlocking()` system) = Medium priority
**Spec needed?** No (implementation is straightforward: wrap `logAdminAction` catch block with `nonBlocking()` pattern)

---

## Batch Summary

| #   | Title                                     | Reclassified To     | Spec Needed? |
| --- | ----------------------------------------- | ------------------- | ------------ |
| 17  | Apply a migration                         | Permanent           | No           |
| 18  | Inspect raw cross-tenant records          | Partially Reducible | Yes          |
| 19  | Repair malformed tenant data              | Bridgeable          | Yes          |
| 20  | Investigate RLS/service-role behavior     | Permanent           | No           |
| 21  | Restore from backup                       | Permanent           | No           |
| 22  | Run one-off data export for legal/support | Bridgeable          | Yes          |
| 23  | Debug missing public directory records    | Reducible           | No           |
| 24  | Investigate audit-log write failure       | Bridgeable          | No           |

---

## Evidence Summary

**Codebase files examined:**

- `lib/admin/audit.ts` - audit log implementation, non-fatal error handling
- `lib/admin/platform-stats.ts` - cross-tenant queries, system health stats
- `lib/admin/platform-actions.ts` - platform settings mutations
- `lib/admin/reconciliation-actions.ts` - cross-tenant financial aggregation
- `lib/db/admin.ts` - admin client (no RLS, compat layer)
- `lib/db/schema/schema.ts` - `admin_audit_log` table, pgPolicy definitions
- `lib/directory/admin-actions.ts` - directory approve/revoke, candidates query
- `lib/monitoring/non-blocking.ts` - structured failure capture system
- `lib/monitoring/failure-actions.ts` - failure retrieval for Hidden Issues
- `app/(admin)/admin/system/page.tsx` - System Health with row counts, integrity signals
- `app/(admin)/admin/silent-failures/page.tsx` - Hidden Issues dashboard
- `app/(admin)/admin/audit/page.tsx` - audit log display
- `app/(admin)/admin/directory/page.tsx` - directory management
- `app/(admin)/admin/price-catalog/csv-export/route.ts` - existing CSV export pattern
- `database/migrations/` - 100+ migration files (timestamp-ordered)
- `package.json` - drizzle-kit scripts for migration execution
