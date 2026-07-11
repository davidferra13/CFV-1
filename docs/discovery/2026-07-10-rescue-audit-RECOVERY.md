# Recovery Net: ChefFlow V1 Rescue Audit (2026-07-10)

STATUS: COMPLETE. Workflow finished 14/14 agents, 0 errors. Final deliverable persisted at
`docs/discovery/2026-07-10-chefflow-rescue-blueprint.md` (53,349 chars, 13 sections, verified
clean of em dashes). The seven discovery reports, synthesis, and five critiques remain
recoverable from the journal below (each `{"type":"result"}` line; assemble agent id ad5f0888aa34a5003).

- Workflow run ID: `wf_960f72bc-342` (task `wuxrqo3lj`)
- Transcript dir: `C:\Users\david\.claude\projects\C--Users-david-Documents-CFv1\4bb154e1-2407-4de5-a66e-106c793a6782\subagents\workflows\wf_960f72bc-342`
- Script file: `C:\Users\david\.claude\projects\C--Users-david-Documents-CFv1\4bb154e1-2407-4de5-a66e-106c793a6782\workflows\scripts\chefflow-rescue-audit-wf_960f72bc-342.js`
- The last `assemble:final` entry in `journal.jsonl` in the transcript dir is the finished document. Copy its `result` field to `docs/discovery/2026-07-10-chefflow-rescue-blueprint.md`.

## Phase 0 ground truth (established anchors)

- 982 page.tsx total: 731 app/(chef), 96 app/(public), 66 app/(client), 44 app/(admin), plus vendor/staff/partner/kiosk/book/mobile portals.
- 97 top-level chef sections; 348 lib/ domains; 652 docs/specs files.
- Nav tier system exists: components/navigation/nav-config.tsx (~line 136, tier: primary/secondary).
- Modularization primitives: lib/feature-gates, lib/features, lib/progressive-disclosure.
- Wiring truth: scripts/wiring-audit-results.json.
- Central tension: worldwide-chef-OS ambition vs owner no longer understanding the product; app both bloated and incomplete; zero real users; owner's business-critical needs are communication pipeline, recipe capture, inquiry consolidation, food costing.
- Constraint: no deletion, no new features; modularize and tier only.
- Hands off: uncommitted studio/ website-builder work (68 dirty files from another tool, see .planning/HANDOFF.json).

## Second run: rescue plan workflow (2026-07-10, later same day)

- Run ID: `wf_2df40594-7eb` (task `wjkpmx55p`)
- Transcript dir: `C:\Users\david\.claude\projects\C--Users-david-Documents-CFv1\4bb154e1-2407-4de5-a66e-106c793a6782\subagents\workflows\wf_2df40594-7eb`
- Shape: 4 parallel planners write plans directly to `docs/specs/rescue/2026-07-10-rescue-ws{1..4}-*.md`, then 2 critics, then 1 fixer edits the files in place.
- If the session dies, the plan files on disk are the deliverable; the fixer's edit report is the last result line in that journal.jsonl.

## Workflow shape

7 discovery agents (core-workflows, surface-census, duplication-map, dashboard-ia, prior-art, data-wiring, smallest-product) -> 1 synthesis -> 5 critics (constraint-verifier, security-adversary, persona-minimalism, anti-slop, missing-expectations) -> 1 assembly.

To resume after a crash: `Workflow({scriptPath: <script file above>, resumeFromRunId: "wf_960f72bc-342"})`.
