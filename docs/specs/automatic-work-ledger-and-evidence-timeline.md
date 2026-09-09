# Automatic Work Ledger and Evidence Timeline

> Status: IN-PROGRESS
> Created: 2026-09-08
> Active run: `RUN-20260908-WORK-LEDGER-CORE`
> Build branch: `codex/work-ledger-core-20260908`
> Product owner: David / DF Private Chef
> Canonical surface: `/insights/time-analysis`
> Operating mode: local-first, evidence-first, approval-before-accounting

## Decision

ChefFlow will replace fragmented and mostly unused time tracking with one canonical work ledger.

The system will continuously collect minimal business-activity evidence, propose work sessions, and let David approve or correct them. A manual clock remains available everywhere as a recovery mechanism, but automatic evidence capture is the primary workflow.

The ledger must answer:

- when David actively worked;
- when David supervised an agent or automation;
- when AI or another agent ran without David actively working;
- when staff worked;
- what business activity occurred;
- which client, event, project, or business objective benefited;
- which source supports each claim;
- how confident the system is;
- which time is approved versus only proposed;
- what revenue and outcome resulted from approved human effort.

The ledger will not claim exact time when the evidence only proves that an activity occurred.

## Existing System Being Replaced or Projected

ChefFlow already contains three partial time systems:

1. event phase timestamps on `events`, projected through `event_time_summary`;
2. manual `admin_time_logs` with category, date, minutes, notes, and optional event;
3. `staff_clock_entries` for staff punch-in/out, GPS, breaks, approval, and event links.

These remain accepted inputs. They do not remain separate reporting truths.

The new ledger becomes the canonical reporting layer. Compatibility projections preserve every existing record ID and prevent duplicate totals.

## Hard Truth Rules

1. A calendar block is scheduled evidence, not actual work.
2. An email or message timestamp is an activity anchor, not a duration.
3. A location visit proposes context; it does not prove business work by itself.
4. AI runtime is never added to David-active time.
5. David-supervisory time is distinct from both David-active execution and AI runtime.
6. Staff time remains a separate actor clock.
7. Only approved sessions appear in financial or hourly-rate totals.
8. Evidence is append-only. Corrections supersede interpretations; they never rewrite source records.
9. Repeated imports are idempotent using source IDs and content hashes.
10. Historical uncertainty remains visible instead of being converted into false precision.

## Actor Clocks

| Actor clock | Meaning | Counted as David-active labor |
| --- | --- | --- |
| `david_active` | David is directly performing the work | Yes |
| `david_supervisory` | David is directing, reviewing, approving, or correcting agent work | Separate total |
| `ai_agent_runtime` | Local/cloud agent or automation is running without active David labor | No |
| `staff` | Employee or contractor work | No; separate labor total |
| `system` | Connector, scheduler, or ingestion process | No |

No view or report may combine these clocks without showing the separate components.

## Activity Taxonomy

The first release uses stable business categories:

- `lead_generation`
- `client_communication`
- `proposal_pricing`
- `menu_planning`
- `event_planning`
- `shopping_sourcing`
- `prep`
- `packing_loading`
- `travel`
- `setup`
- `service`
- `cleanup_reset`
- `event_closeout`
- `bookkeeping_finance`
- `marketing_content`
- `website_code`
- `automation_agent_direction`
- `business_strategy`
- `professional_development`
- `other_business`

Aliases from `admin_time_logs.category` and event phase timestamps map into this taxonomy without destroying their original category.

## Canonical Data Model

### `work_evidence`

Immutable source facts.

Required fields:

- `id uuid primary key`
- `tenant_id uuid not null references chefs(id)`
- `source_type text not null`
- `source_account text null`
- `source_record_id text not null`
- `source_hash text not null`
- `source_created_at timestamptz null`
- `interval_start timestamptz null`
- `interval_end timestamptz null`
- `actor_type text not null`
- `actor_id text null`
- `event_id uuid null references events(id)`
- `client_id uuid null references clients(id)`
- `project_key text null`
- `activity_hint text null`
- `signal_type text not null`
- `signal_summary text not null`
- `minimal_metadata jsonb not null default '{}'`
- `privacy_class text not null`
- `ingested_at timestamptz not null default now()`

Constraints:

- unique `(tenant_id, source_type, source_account, source_record_id)`;
- source facts cannot be updated or deleted through ordinary chef actions;
- `minimal_metadata` cannot contain full email bodies, message bodies, screen captures, keystrokes, credentials, or unrestricted file content;
- tenant-scoped RLS for every operation.

### `work_sessions`

Reviewable interpretations of one or more evidence records.

Required fields:

- `id uuid primary key`
- `tenant_id uuid not null references chefs(id)`
- `actor_type text not null`
- `actor_id text null`
- `activity_type text not null`
- `event_id uuid null references events(id)`
- `client_id uuid null references clients(id)`
- `project_key text null`
- `started_at timestamptz null`
- `ended_at timestamptz null`
- `duration_minutes integer null`
- `duration_kind text not null`
- `status text not null`
- `confidence_tier text not null`
- `creation_mode text not null`
- `boundary_gap text null`
- `summary text not null`
- `reviewed_by uuid null`
- `reviewed_at timestamptz null`
- `superseded_by uuid null references work_sessions(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Enumerations:

- `duration_kind`: `exact`, `observed_window`, `inferred`, `unknown`
- `status`: `proposed`, `review_required`, `approved`, `rejected`, `superseded`
- `confidence_tier`: `observed`, `corroborated`, `inferred`, `unknown`
- `creation_mode`: `manual_clock`, `manual_log`, `forward_inference`, `historical_import`, `compatibility_projection`

An approved session with a duration must have both boundaries or an explicit manual duration plus a correction/audit record.

### `work_session_evidence`

Many-to-many evidence bridge:

- `session_id`
- `evidence_id`
- `evidence_role`
- `weight numeric(4,3)`
- unique `(session_id, evidence_id)`

### `work_session_corrections`

Append-only correction history:

- session and tenant IDs;
- previous and replacement values;
- correction reason;
- reviewer;
- timestamp;
- optional rule ID responsible for the incorrect proposal.

### `work_inference_rules`

Versioned tenant rules:

- rule key and version;
- enabled state;
- configuration JSON;
- evidence thresholds;
- performance counters for accepted, edited, rejected, false-positive, and false-negative outcomes.

### `work_capture_devices`

Device registration and coverage state:

- stable local device ID;
- tenant ID;
- device type and label;
- last successful sync;
- last evidence time;
- paused state;
- privacy policy version;
- coverage-gap reason;
- never store reusable device secrets in readable metadata.

## Compatibility Contract

### Event phase timestamps

Existing `shopping`, `prep`, `travel`, `service`, and `reset` start/completion timestamps are projected as canonical evidence and sessions with `creation_mode = compatibility_projection`.

Projection must be deterministic and idempotent. The source record ID includes the event ID and phase. Existing timestamps remain authoritative for their original phase; the ledger does not copy them back into `events` during phase one.

### `admin_time_logs`

Each record projects into:

- one immutable evidence record;
- one session using the stored date and duration;
- `duration_kind = exact_manual_duration` represented by `duration_kind = exact` plus a `manual_duration` metadata flag;
- `status = approved` only because the record was explicitly entered by David;
- original log ID retained in the source pointer.

New manual logging writes to the canonical ledger. A compatibility view supplies the legacy `admin_time_logs` shape where older consumers still need it.

### `staff_clock_entries`

Staff entries project with `actor_type = staff`. Existing approval, void, GPS, break, and role fields remain visible. Staff minutes never enter David labor totals.

## Inference Engine

The first inference engine is deterministic. AI can summarize or suggest classification, but it cannot approve sessions or determine payroll/financial totals.

Default rules:

- split desktop work after 15 minutes of user idle time;
- merge same actor + activity + event when the gap is 10 minutes or less;
- require two independent signals for automatic travel or on-site proposals;
- allow one signal only when David explicitly confirms it;
- link to an event using immutable event/client/thread IDs before fuzzy text matching;
- prefer event address and time overlap over title similarity;
- preserve planned and observed windows separately;
- never derive a duration from one message timestamp;
- never convert a calendar window directly into approved time;
- mark conflicting boundaries `review_required`;
- retain rule version and all evidence links on every proposal.

Daily reconstruction produces proposed sessions for the previous local day in the chef's configured timezone. Re-running the same day cannot create duplicates.

## Product Surface

### Upgrade `/insights/time-analysis`

The existing page becomes the Work Ledger without losing its current admin summaries.

Top section:

- current clock state;
- one manual `Clock in` / `Clock out` fallback;
- current actor clock;
- activity, client/event, and project selectors;
- privacy pause state;
- device/source coverage warning.

Review queue:

- proposed session cards grouped by day;
- evidence count and confidence label;
- planned versus observed boundaries;
- approve, correct, split, merge, reject;
- one correction reason captured for every material edit;
- no bulk approval when sessions contain unknown boundaries or conflicting evidence.

Timeline:

- separate visual lanes for David active, David supervisory, AI runtime, and staff;
- scheduled calendar blocks shown as background context, not work bars;
- coverage gaps shown explicitly;
- evidence drawer with source pointer and interpretation limit;
- filters for event, client, project, activity, actor, confidence, status, and source.

Economics:

- approved hours only;
- revenue per David-active hour;
- revenue per active + supervisory hour;
- staff labor shown separately;
- AI runtime and automation leverage shown separately;
- unresolved and proposed time excluded from headline economics.

### Global fallback control

A compact clock state belongs in the chef shell/command rail so David can recover from missing automation from any page. It opens the same canonical manual-clock action; it does not maintain separate local state.

## Forward Evidence Ingestion

### Gmail, Calendar, and Git

The existing daily work-ledger automation becomes an ingestion client, not the database.

It writes immutable evidence through a tenant-authenticated endpoint and then invokes deterministic proposal generation. It does not send email, modify calendar records, or change repository history.

Required API boundaries:

- `POST /api/v2/work-ledger/evidence` — authenticated, idempotent batch ingest;
- `POST /api/v2/work-ledger/reconstruct` — authenticated date-range proposal generation;
- scheduled route with `verifyCronAuth` for local daily reconstruction;
- maximum batch size, rate limits, schema validation, and structured rejection reasons.

### Windows collector

Build a lightweight local Rust service with a small SQLite spool.

Capture by default:

- foreground application name;
- normalized window/app category, not full window content;
- user idle/active transition;
- allowlisted repository file-change metadata;
- Git commit/branch/worktree activity;
- collector pause/resume and coverage gaps.

Never capture by default:

- keystrokes;
- screenshots;
- clipboard content;
- file contents;
- email/message bodies;
- passwords or credentials;
- private/incognito browser destinations;
- personal media contents.

Sync over the local machine or authenticated LAN endpoint. If ChefFlow is unavailable, spool locally and retry without losing ordering or generating duplicates.

### Android collector

Build a native Kotlin companion because background geofencing is not reliable enough in a PWA.

Capture:

- coarse arrival/departure signals for explicitly registered grocery stores, commissaries, client/event addresses, and home/base;
- route start/end hints;
- user confirmation/correction notifications;
- pause state and permission/coverage loss.

Location alone creates only a proposal. Raw continuous coordinates are not uploaded by default. The phone retains the shortest practical local history required for reconciliation.

## Historical Reconstruction

Historical processing runs newest-to-oldest in annual batches after forward capture is stable.

Adapters:

- business Gmail connector/MBOX;
- personal Gmail Takeout/MBOX;
- Google Calendar/ICS;
- Google Maps Timeline exports;
- Google Messages or SMS backup export;
- local Git repositories, reachable reflogs, commit history, and preserved archive manifests;
- existing ChefFlow event/admin/staff time records;
- receipts and business documents when explicitly included.

Every adapter must:

- hash the source file;
- retain immutable source record IDs;
- emit coverage start/end and gaps;
- support dry-run counts;
- be idempotent;
- separate parsing failures from no-data periods;
- store minimal normalized metadata, not unrestricted raw content;
- exclude image/video content analysis by default, including personal or explicit media;
- produce a batch reconciliation report before sessions are approved.

The first historical acceptance fixture is the Jean Eude September 1, 2026 dinner. Gmail/calendar/payment evidence currently supports five session candidates and thirteen evidence records, with exact shopping, travel, arrival, departure, and service boundaries still unresolved.

## Proposed File Ownership

Foundation lane:

- `lib/db/schema/schema.ts`
- generated migration under `lib/db/migrations/`
- `lib/work-ledger/types.ts`
- `lib/work-ledger/validators.ts`
- `lib/work-ledger/repository.ts`
- `lib/work-ledger/inference.ts`
- `lib/work-ledger/compatibility.ts`
- `lib/work-ledger/actions.ts`

API lane:

- `app/api/v2/work-ledger/evidence/route.ts`
- `app/api/v2/work-ledger/reconstruct/route.ts`
- `app/api/scheduled/work-ledger-reconstruct/route.ts`

UI lane:

- `app/(chef)/insights/time-analysis/page.tsx`
- `app/(chef)/insights/time-analysis/work-ledger-client.tsx`
- `components/work-ledger/*`
- `components/navigation/nav-config.tsx` only if the existing label changes

Collector lanes:

- `apps/work-ledger-windows/*`
- `apps/work-ledger-android/*`

Historical lane:

- `scripts/work-ledger-import/*`
- fixtures under `tests/fixtures/work-ledger/*`

## Security and Privacy Requirements

- Every server action calls `requireChef()` before data access.
- Every query scopes by `tenant_id` or `chef_id`.
- Every API route uses V2 API auth, cron auth, or a device credential that resolves to exactly one tenant.
- All new tables enable RLS and ship explicit tenant policies.
- Evidence payloads are schema-limited and size-limited.
- Raw device credentials are never logged.
- Manual evidence deletion is not exposed; privacy deletion uses an explicit audited retention workflow.
- A visible pause control must immediately stop forward device capture.
- Coverage gaps caused by pause or missing permission remain visible but do not disclose private reasons to other users.
- No outbound communication occurs from the ledger.

## TDD Acceptance Tests

### Data and inference

- duplicate source ingest returns the existing evidence row;
- same source record under different tenants cannot collide or leak;
- evidence cannot be updated through chef-facing actions;
- one email timestamp cannot produce a duration;
- a calendar event cannot become approved work automatically;
- location-only evidence remains proposed;
- two corroborating signals can create a reviewable travel/on-site proposal;
- 15-minute idle split and 10-minute merge rules behave deterministically;
- corrections append history and supersede the prior interpretation;
- daily reconstruction is idempotent;
- approved totals exclude proposed/rejected/superseded sessions;
- actor totals never combine David, agent, staff, or system clocks;
- event/admin/staff compatibility projections do not double count.

### Auth and tenancy

- unauthenticated server actions reject before querying;
- API requests without valid auth fail closed;
- cross-tenant evidence/session IDs cannot be read, linked, approved, or corrected;
- scheduled reconstruction requires valid cron auth;
- device token resolves to one tenant and one registered device.

### UI

- manual clock creates one canonical open session and closes it once;
- refresh/reconnect does not create a second open clock;
- proposed card shows evidence, confidence, boundary type, and limitation;
- approve/correct/split/merge/reject produce visible audit history;
- unknown/conflicting sessions cannot use bulk approval;
- timeline renders separate actor lanes and visible coverage gaps;
- scheduled calendar context cannot visually masquerade as approved labor;
- economics cards use approved sessions only.

### Collectors and importers

- offline spool replays in order and remains idempotent;
- pause immediately stops capture and emits a coverage-gap marker;
- excluded apps/domains/repositories emit no activity content;
- importer dry run writes nothing;
- repeat annual import creates zero duplicate evidence rows;
- corrupt records are quarantined with source pointers;
- media content is not opened or analyzed by default.

## Build Timeline

- 2026-09-09: Queue item fired as `RUN-20260908-WORK-LEDGER-CORE`.
- 2026-09-09: Isolated worktree created on `codex/work-ledger-core-20260908` because the main checkout contains unrelated active work.
- 2026-09-09: Preflight passed after mirroring one pre-existing untracked hub module required by committed imports; TypeScript exited 0 and the untouched 1,034-route production build exited 0 with inherited warnings.
- 2026-09-09: Spike corrected the schema ownership path to ChefFlow's live local Drizzle source and generated migration directory.
- 2026-09-09: Implemented the core schema/migration, tenant and append-only controls, deterministic inference, compatibility projectors, authenticated actions/APIs, scheduled reconstruction, and the canonical review UI.
- 2026-09-09: Focused ledger tests passed 15/15; high-memory TypeScript exited 0; the scoped wiring audit found 0 weak routes and 0 orphans.
- 2026-09-09: Final 1,037-route production build exited 0 in 1,470.01 seconds after all ledger edits.
- 2026-09-09: Unauthenticated probes proved all three new APIs fail closed with 401 and the canonical page redirects to sign-in.
- 2026-09-09: Local Postgres on 127.0.0.1:54322 remained unavailable, so migration, Jean fixture, authenticated UI mutations, and screenshot proof remain blocked. The queue item stays IN-PROGRESS.

## Definition of Done

The foundation is done only when:

1. the canonical migration, domain layer, authenticated APIs, compatibility projections, and review UI exist;
2. `/insights/time-analysis` visibly shows manual fallback, proposed sessions, separate actor lanes, and source coverage;
3. the Jean fixture reconstructs without inventing exact durations;
4. all focused tests pass;
5. `npm run regression:firewall` passes;
6. `/wiring-audit` covers the ledger, navigation, CIL, automation, events, and financial consumers;
7. the canonical app at `http://localhost:3100` is manually verified with browser console/network/server logs checked;
8. screenshots and a proof pack document the working route;
9. no legacy time source is double-counted;
10. the queue item remains in-flight if any runtime, DB, auth, or visual proof is missing.

## Execution Order

1. Repair the broken Git worktree registration for the canonical checkout.
2. Fire **Automatic Work Ledger Core**.
3. Land schema, deterministic inference, compatibility projections, API, and `/insights/time-analysis` review UI.
4. Verify the Jean fixture and forward daily ingestion.
5. Fire Windows and Android collectors in separate non-overlapping lanes.
6. Fire historical importers newest-to-oldest.
7. Fire economics analytics after approved time exists.

Do not start collector or decade-import work before the core evidence/session/correction contract is merged and verified.
