# Career replay using existing Simulation Forge

This developer tool exercises a deterministic historical workflow model through
`tools/simulation-forge/core.mjs`. The canonical archive entrypoint is
`history-cli.mjs`; its `career` command invokes this complementary structured
workflow adapter. This layer does not sanitize or store message archives.
Source timestamps come from the existing `history.mjs` compiler. It reuses the Forge runtime budget, trajectory,
provenance, evaluator, and run identity. It has no network, database, UI, payment,
email, or authentication side effects. A successful replay proves model behavior
only. Chef/client browser actions and authenticated application behavior remain
unverified until an application adapter runs and records that evidence.

## Input and historical clock

The JSON envelope uses `schemaVersion: 1`, a stable `id`, `mode` (`source-backed`
or `synthetic`), and `records`. Every record has a stable `id`, `source` (`id`,
`kind`, `evidence`), `knownAt`, `action`, and `actor` (`chef`, `client`, or
`unknown`). Actions can link `clientId` and `eventId`; optional `occurredAt`
preserves the event's original date. Timestamps require an explicit timezone.

The replay clock advances by `knownAt`. Events learned later cannot change an
earlier decision. Source observations remain distinct from inferred actions.
Facts have `key`, `value`, `visibleTo` roles, optional `knownAt`, and `certainty`
(`documented` or `uncertain`). Later facts enter a later clock event. Decisions
contain only facts currently visible to their role and their linked client/event.
Uncertain facts cannot satisfy `requiredFacts`.

Documented actions supported by this first adapter:

`inquiry_received` -> `menu_proposed` -> `quote_issued` -> `booking_confirmed` ->
`deposit_recorded` -> `event_planned` -> `service_completed` ->
`final_payment_recorded` -> `follow_up_sent`.

These are model state transitions, not commands sent to ChefFlow. Role mismatches,
missing predecessors, missing facts, missing entity links, unsupported actions,
and source-only observations create explicit gaps. At the end of the supplied
timeline, unfinished dinner lifecycles produce `incomplete_model_workflow` gaps.
Source-backed evidence is
preserved per decision and fact. No historical price is replaced by current pricing.

## Business history import connection

`findingsToCareerHistory()` accepts existing `BusinessHistoryFinding` objects
from `lib/business-history-import/types.ts`, or equivalent Gmail finding rows
using snake-case fields. It retains the source ID/pointer and original received
time. It accepts a persisted `importedInquiryId`/`imported_inquiry_id` as a
destination receipt only with an explicit review timestamp. A missing or invalid
review timestamp quarantines that record rather than claiming a proven import.

Classification such as `payment_invoice` does not prove money changed hands.
The mapper emits `source_observed` with an unknown actor; it never guesses who
wrote a message, creates clients/events, or invents payment/lifecycle transitions.
Source-only records produce `workflow_not_reconstructed` gaps for the integration
layer to resolve using verified records. The destination receipt becomes visible
at its review time, not at the historical email date.

Raw message bodies, names, and addresses are not copied by this mapping. Read
models already scoped to the authenticated tenant should be used by any future
server integration. This CLI reads an explicitly supplied local export; it does
not read Gmail or grant access to another tenant.

## Bounded runs and resumability

The default batch has at most 25 events, hard maximum 100. Batches shrink as the
checkpoint grows because the existing Forge records before/after state snapshots.
Input caps: 5,000 source records, 10,000 facts (100 per source), 10 MB JSON,
and 2,048 characters per evidence pointer. Checkpoint state is also capped at
10 MB; a larger archive must be segmented. The Forge default
memory headroom and a 10-second runtime budget remain active. Large histories
need multiple bounded batches or segmented archives, never an unbounded loop.

Exact duplicate source records are ignored. Conflicting data for one source ID
is quarantined. Re-importing the same archive with its checkpoint performs no
duplicate observations. Checkpoints are tied to history identity, mode, and
adapter version. A changed source or newly discovered earlier record requires
a full chronological replay; it cannot silently alter an existing checkpoint.

Run the included fictional 2016-2026 fixture:

```powershell
node tools/simulation-forge/history-cli.mjs career --input tools/simulation-forge/fixtures/career-history-synthetic.json --output C:/Temp/career-replay-report.json --save-checkpoint C:/Temp/career-replay-checkpoint.json --max-batches 10
node --test tools/simulation-forge/career-replay.test.mjs
```

Existing finding export:

```powershell
node tools/simulation-forge/history-cli.mjs career --input C:/Temp/business-history-findings.json --findings --output C:/Temp/findings-replay-report.json --save-checkpoint C:/Temp/findings-replay-checkpoint.json
```

## Read-only bridge to real staged sources

`export-career-findings.mjs` reads the existing `gmail_historical_findings`
table using the caller's existing `DATABASE_URL` and installed `postgres.js`.
It does not discover credentials or select a tenant automatically. Run from an
installed ChefFlow checkout; environment loading is the caller's explicit step.
The database session and query transaction are read-only, with one connection,
a five-second connect timeout, and a ten-second statement timeout.

```powershell
node tools/simulation-forge/export-career-findings.mjs --tenant-id <explicit-tenant-uuid> --output C:/Temp/business-history-findings.json --limit 5000
```

The SQL binds tenant UUID, keyset cursor, and bounded limit as parameters.
Every source, inquiry, and original-message lookup remains in the same tenant.
An imported receipt requires a live inquiry with the `historical_email_scan`
marker, matching Gmail message/mailbox provenance, a linked original message,
an inquiry classification, and an explicit review timestamp. Invalid receipts
export as pending with no imported destination, without modifying customer data.

The export is an upstream read-only capture, not another archive compiler.
Exports contain only source IDs, classification/confidence/status, original
timestamps, and verified destination IDs. Names, addresses, subjects, bodies,
and full audit objects are never selected or exported. Unknown dates stay unknown.
The source export is a snapshot of staged records, not evidence that the Gmail
scanner has already captured the owner's entire career.

A segment includes at most 5,000 findings, with a one-row lookahead. `hasMore`
and `nextCursor` explicitly identify additional pages; use the next UUID with
`--cursor`. Exit 3 means another segment remains. Source keyset ordering uses
immutable finding UUIDs, while replay orders by historical known-at timestamps.
Collect every segment before claiming the source archive is complete; do not
feed newly discovered earlier sources into an already advanced replay checkpoint.
The archive/replay input budgets still apply, so larger archives require explicit
segmentation and chronological rebuilding. This bridge performs no customer writes.

Focused export verification:

```powershell
node --test tools/simulation-forge/export-career-findings.test.mjs
```

Resume using `--checkpoint previous.json` and a new `--save-checkpoint next.json`.
The canonical CLI creates new private files outside Git exclusively and refuses overlapping paths. Exit 0:
all model events replayed without gaps; exit 2: quarantined input or workflow
gaps; exit 3: a checkpoint was written but further batches remain; exit 1:
invalid command/input or execution failure. Reports always state UI and auth
proof are unverified and external payments were not executed.

## Remaining integration

The actual importer must export verified event/client/message/payment links
with original timestamps and source evidence. Browser workers must then enact
both roles through ChefFlow's real authenticated interface, capture runtime and
user-flow proof, and turn failures into the existing regression queue. This
module intentionally cannot attest to either missing integration.
