# Evidence-backed client history replay

Status: native offline record replay verified; ChefFlow product integration BLOCKED.

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
