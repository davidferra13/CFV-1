# Evidence-backed client history replay

Status: native offline record replay verified; ChefFlow product integration BLOCKED.

## Current outcome review, 2026-10-01

1. The owner's goal is automatic reconstruction of the full career followed by
   both chef and client agents exercising the actual application. Native paths
   currently prove import integrity, source-prefix replay, and deterministic
   workflow modeling. Actual authenticated UI integration remains unverified;
   no whole-decade import or simulated product adoption is claimed.
2. Auth and tenant guards, source clocks, source-linked import receipts, atomic
   inquiry/message/receipt persistence, and unknown/conflicting evidence handling
   establish correctness. No chef is required to type historical dinner rows.
3. Existing archives, existing Simulation Forge, and this canonical history CLI
   are reused. The recovered history commit is integrated into the task worktree;
   no new product menu or competing archive entrypoint is introduced.
4. Gmail threads, normalized messages, and stored reference derivatives converge
   on `compileHistory`. The `career` command is a complementary structured
   workflow adapter using the same Forge core and canonical source clock.
   Synthetic workflow fixtures remain explicitly distinct from real source
   observations and cannot establish historical clients, revenue, or UI behavior.
5. Read-only source export, keyset segments, bounded replay snapshots, explicit
   checkpoints, duplicate detection, and refusal to overwrite source/proof files
   reduce manual entry and rework. Missing timestamps remain quarantined, and
   newly discovered earlier records require rebuilding the chronological replay.

## Current release evidence and limits

The final combined focused suite passed 139 tests with zero failures (native
process PID 37512, exit 0). This covers existing import behavior, integrity regressions,
source parsing, atomic persistence, bounded persona execution, Forge core,
canonical history, structured career replay, read-only export, historical-scan
orchestration, Sentry build configuration, and worktree ownership safeguards. The actual
PostgreSQL proof ran inside an outer rollback transaction and verified original
2016 source/event dates, idempotent retry, one original message, client email
suppression, and no fixture rows left behind.

The hygiene scope repair has 21 passing native regressions. Writer inspection
uses exact worktree paths, resolves relative scripts against explicit working
directories, and blocks unknown ownership/inspection failures. Fix selection
refuses mixed ownership and shared PM2 parents; no real writers or tasks were
stopped or disabled by this task. Installed executable paths were selected only
for the verification subprocess, with no global PATH or service changes.
The final native read-only guard passed with zero writer/task blockers and
empty action/failure lists. Production watchdog ownership was verified from its
exact Windows script-host wrapper; it derives the production project from its
own file path.

The bounded real persona gate completed in 246.5 seconds with **FAIL**: all three
persona evaluations and the chef/client interaction exhausted their 30-second
request deadlines. Its failure receipt is
`system/persona-gates/gate-2026-10-01T18-20-22-929Z.json`. Passing deadline unit
tests establish termination and honest failure reporting, not a passing model
review.

Current production database inspection found zero staged findings, inquiries,
messages, events, and connected Gmail mailboxes. The Goldmine derivative has 299
dated messages in 49 source threads from 2021-06-05 through 2026-01-23. Platform
derivatives have 131 messages without original message timestamps, including 50
Take a Chef records; these remain quarantined. Searches of both connected owner
mailboxes found no Take a Chef/privatechefmanager domain messages in 2016-2020.
That search does not establish that other historical business records are absent.
Source thread grouping does not establish verified dinner boundaries or full
career coverage.

Windows full app typechecking exhausted its heap at 1 GB and 4 GB. An 8 GB attempt
was stopped when system commit headroom fell below 1 GB; it is not successful
compile evidence. A Linux verification copy matched all 9,802 tracked source hashes except the
lockfile (installed TypeScript 5.9.3 and Next 14.2.35 match Windows); the new
parser/persistence sources were also synchronized. The full application typecheck
then passed with an 8 GB heap, exit 0 (local verification session 25307).

The initial full-build attempt was automatically rejected when its unconfigured
Sentry build wrapper initiated an HTTPS connection whose destination/payload
were not verified safe for disclosure. The configuration now activates Sentry
build hooks only when explicitly configured and sets telemetry to false.
Instrumentation/background-job setup remains explicitly enabled independently.
All five configuration regressions pass (native PID 94928, exit 0), and five
existing historical-scan orchestration checks pass (PID 56576, exit 0).
The safer isolated build was retried with no Sentry configuration, no customer
credentials, a closed local database endpoint, and background jobs disabled.
Its session ended without a captured exit verdict or complete BUILD_ID/prerender
manifest. No full-build success or deployable artifact is claimed.

Canonical production runtime verification passed (PID 102236). Public
`/api/build-version` still reports `065916ad4`; strict readiness returns HTTP
503 with AI reason `local_only_in_production`. Runtime response does not prove
the changed feature works. Release remains **BLOCKED** pending a full build, a passing persona review,
strict readiness, and actual authenticated UI workers.
No full career import or product adoption has been completed.

## Consolidated reference import and bounded replay

Use `history-cli.mjs import` for existing normalized/Gmail sources or generated
reference fixture packets, then `history-cli.mjs replay` for canonical cases.
The reference adapter preserves observed-derivative hashes and original source
dates but withholds message bodies and identities in its metadata pilot.
`bodyStatus: withheld` is distinct from an unavailable original body. Classification
does not establish sender identity, payment, or a completed lifecycle action.
Absent explicit verified owner aliases, roles remain unresolved counterparties.

The CLI processes at most 5,000 sources in a 30-second invocation, with a default
25-event Forge batch that shrinks as source-prefix snapshot size grows. It retains
legacy import/replay/branch semantics and the existing counterfactual invariant:
all historical future records after the branch point are discarded. Structured
workflow/findings modeling is `history-cli.mjs career`; the separate career CLI
has been removed. Real output remains private, outside the Git worktree.

## Consolidated private source pilot, 2026-10-01

The actual canonical CLI imported the existing Goldmine reference derivative
(PID 79632, exit 0) and replayed it through the existing Forge core (PID 97232,
exit 0). The receipt contains 299 source-prefix steps across 49 source-thread
cases and 50 bounded batches, with zero replay violations. All 299 bodies are
explicitly withheld; the compiled pilot contains no nonempty message text.
Original source dates range from 2021-06-05T12:00:00Z to
2026-01-23T23:09:16Z. The missing 2016-2020 years are recorded, and complete
history, participant identity, dinner boundaries, financial verification, and
actual UI behavior remain unverified.

The same importer processed 131 platform reference records, including 50 Take a
Chef records. All 131 lack original timestamps and appear in the quarantine
receipt as `unknown_source_timestamp`; zero cases are replayable. The CLI returns
a nonzero result for quarantine rather than substituting the fixture generation
date. The remote process wrapper reported exit 1 for this nonzero import
(PID 46296); its receipt was independently read and verified.

Private outputs are outside Git at
`C:/Users/david/Documents/DFPC-Private-History/20261001-consolidated-reference-pilot/`:
`goldmine-cases.json`, `goldmine-replay.json`, and `platform-quarantine.json`.
The source inputs remain the existing generated fixture packets under
`data/email-references/generated/`. Their recorded original MBOX paths are
currently absent, so these packets are observed derivatives with unverified
originals. No source bodies, names, or email addresses were printed in the pilot
reports. No database, customer, email, payment, or application UI mutation occurred.

The migrated canonical `career` command also ran the fictional 2016-2026 fixture
(PID 115628, exit 0): 99 source actions for 11 dinners, four bounded batches,
zero remaining events, zero workflow gaps, and zero quarantined records. Its
receipt says `synthetic_only`; chef/client role modeling does not prove actual
UI use, authentication, payments, or real historical dinner completion. The
private files are `synthetic-career-replay.json` and
`synthetic-career-checkpoint.json` in the same pilot directory.

## Earlier recovered implementation and pilot context

The following records describe the recovered implementation's earlier branch and
private pilot. Current release evidence and the consolidated pilot above govern
this task's status.

The new history module and CLI extend the existing Simulation Forge. They import selected decoded Gmail message bodies or normalized channel exports into separate engagement cases, exclude unsent drafts, coalesce exact duplicates, reject conflicting evidence, preserve source clocks and pointers, remove quoted history and contact/link credentials, and expose only the historical prefix to a participant adapter. Hypothetical branches discard all subsequent historical messages and identify new records as counterfactual. Client thoughts, causal explanations, provider payment verification and service satisfaction are not inferred as fact. No model weights are trained. No client contact adapter is invoked.

## Verified pilot

28 retrieved records across three selected Gmail threads yielded 26 sent records in two cases. Case 001 contains 23 records including an excerpt of the original website inquiry; case 002 contains three partner-referral records. Two drafts were excluded. HTML-only mail was decoded rather than silently omitted. The selected record bodies have no remaining unavailable-body gaps. This is selected-thread coverage, not proof of complete client history or ten years of ingestion. SMS/RCS/MMS, calls and attachment contents remain unimported. Source originals remain in Gmail. The stored private input is a decoded/redacted derivative, not a lossless archive.

The native initial run passed 14 tests (9 new history behavior checks plus 5 existing core checks), then ran the actual CLI import and replay using the existing Forge core. Findings retained source references for payment difficulty, installment reports, repeated confirmation-link follow-ups, a reported link failure, restrictions, explicit positive statements and a schedule mismatch. These findings describe statements in historical records, not newly reproduced ChefFlow defects.

Private data and replay receipts are outside Git: C:/Users/david/Documents/DFPC-Private-History/20261001-pilot/. Do not commit these files or seed actual client contact addresses into the product. The CLI requires a separate output path outside its worktree and refuses overwrites.

## Invocation and extension

Run node tools/simulation-forge/history-cli.mjs import --input <private-source.json> --output <private-cases.json>, followed by replay with those cases as input and a new private receipt path. The import file contains cases, each holding normalized messages plus id/engagement, or Gmail threads with options. Explicitly group threads by engagement; do not combine all dinners from a repeat client. SMS/call exporters must retain source ID, timestamp, role and channel before using compileHistory.

replayHistory accepts a trusted development adapter whose step receives only caseId, historical time, current event and the known prefix. It does not supply the eventual outcome. historyScenario and historyAdapter use the existing Forge engine as an offline record adapter. This adapter accumulates records; it does not execute the ChefFlow UI or verify payment, email delivery, booking, permissions or production behavior. Source event timestamps carry the historical clock; the Forge trajectory wrapper clock is bookkeeping.

## Release boundary and exact remaining work

Task branch: feat/client-history-replay-20261001, isolated from the clean main-based Forge review branch at 8834ba08687d4484977471ff061f84b0d34ef4d5. Canonical working checkout and foreign changes were preserved. The shared-task/context entrypoint reported no .agent-command/project.json for the canonical repository; this work is not claimed as a coordinated registry assignment. Digital David service identity was not established on the remembered ports; source records were used directly.

The baseline native regression firewall failed the seven existing Studio navigation destinations. Its wiring and Forge hooks also failed Windows executable quoting (C:/Program...), while the app typecheck did not produce captured success. The runtime portion was stopped when it incorrectly classified the existing canonical server as missing from this isolated checkout. The original listener PID 91460 remained on port 3100 and answered /api/health HTTP 200 (AI runtime degraded). Subsequent isolated checks must use --skip-runtime; actual app verification belongs to the canonical checkout. No production release is claimed.

Next: reconcile the Forge integration with the existing ChefFlow release owner; repair the actual release failures, bind a side-effect-free test-tenant/UI adapter, replay both chef and client roles without live notifications or charges, ingest remaining channels and attachment evidence, then expand historical coverage. Preserve fresh revision-bound receipts and report unknowns. A successful offline replay is not evidence of live product adoption.

## Additional native verification

All five Forge test files passed under the installed tsx runtime. A counterfactual guest-count branch was created from the original inquiry, then replayed. It retained exactly the observed branch-point record plus one explicitly hypothetical change; no subsequent historical record survived. The canonical listener remained PID 91460 and returned HTTP 200 after the misplaced runtime check was stopped.

Test output:

```text
historical outcomes to a participant (10.6363ms)
✔ findings remain sourced statements rather than invented feelings or settled finance (0.7623ms)
✔ a branch preserves the known prefix and removes all later historical messages (1.1622ms)
✔ the existing Forge adapter retains original message clocks and only observed history (0.514ms)
✔ Gmail import handles HTML-only mail, attachments, drafts and form telemetry (3.8573ms)
✔ unresponsive adapters are bounded and do not produce a success report (10.4944ms)
✔ actual ChefFlow taste loader yields bounded, valid candidates through the generic Forge interface (489.6219ms)
✔ source outage is visible and never invents a candidate (10.1073ms)
✔ synthetic marketplace calls real ChefFlow capacity model and respects price, place and supply (7.5845ms)
✔ late chef outage yields minimized injected counterexample and guarded replay (56.8328ms)
✔ bounded market mutations expose availability, budget, geography, cancellations and seasonality (13.7626ms)
✔ paired distinct seeds expose synthetic demand sensitivity without changing invariant outcome (8.9971ms)
✔ distinct-seed counterfactuals compare the same synthetic market draw before and after guard (190.4902ms)
✔ minimized market outage fixture remains an automatic reproducible regression (215.3891ms)
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2943.087

```
