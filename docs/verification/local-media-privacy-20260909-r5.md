# Local media privacy — r5 responsiveness and CI repair

Date: 2026-09-09
Queue: BQ-20260908-local-media-privacy-integration
Run: RUN-20260909-local-media-privacy-r5
Source commit: aae82e4bf2d29d507056aeb924567464cc0dbafa
PR: https://github.com/davidferra13/CFV-1/pull/1
Status: BLOCKED for production and real-media use; verified source improvements are prepared for the approved public draft PR.

## Changes and boundaries

The native reviewer now runs protection checks, catalog initialization and queries, checklist preparation, file hashing, image decoding and resizing, owner-decision verification, local-match confirmation, and owned-player shutdown in background tasks. Each task owns and closes its SQLite connection before completion reaches Tk. The UI receives bounded catalog snapshots (200 rows per page). Widget creation and attaching prepared images remain on Tk.

Asset and review-unit IDs are captured before dispatch. Approval still requires signed per-part evidence, a separate whole-bundle attestation, and current-byte verification; changed companions fail approval. Pending operations retain their worker slot and prevent the owning window from closing prematurely. Failure to start a worker restores usable error/close states. Playback failure retains the player handle for a stop retry and cannot claim a shutdown that never started.

The native UI process owns cyclic garbage collection while its windows exist: reference counting continues, periodic collection occurs on Tk, and the prior automatic-GC setting is restored after the last owner closes with its worker drained. This addresses a reproduced wrong-thread Tcl finalization failure across successive windows. Task errors transfer neutral codes, not traceback objects or exception text. The existing scan loop now uses the same owned task lifecycle.

CI now uses Node 22 consistently across its six jobs. The previous Node 20 jobs treated quoted test glob patterns as literal filenames and failed before test discovery. The existing quoted pattern discovered tests on the installed Node 22.17.1: 58 auth tests executed, 57 passed and one failed. This is discovery evidence, not an auth-suite pass. No dependency versions or route authorization rules were changed.

The implementation follows the [Tkinter threading model](https://docs.python.org/3.12/library/tkinter.html#threading-model); long callbacks must not block event processing. [Node's test runner documentation](https://nodejs.org/api/test.html) describes quoted glob discovery.

No personal media, thumbnails, catalogs, inventories, credentials or personal media hashes were inspected or transmitted. Media verification used generated shapes, text and silence. No runtime protection configuration, real-media scan, source move, original deletion, cloud media processing, merge or website deployment occurred.

## Verification

| Check | Evidence |
| --- | --- |
| Final Python suite | 83 passed in 21.562 seconds on the committed source |
| Native UI/lifecycle checks | 10 included in the Python suite; real short synthetic video/audio playback, approval flow, retry and parent-loss cleanup |
| Responsiveness/recovery checks | 8 included: delayed protection/hash checks, pending close lock, stale approval, failed checklist, worker-start recovery, cyclic finalizer thread, exclusive catalog lock, generated large image |
| Generated 12-megapixel image | 4000 x 3000 pixels; maximum observed UI heartbeat gap 47 ms in the final full run (31 ms in preceding focused runs) |
| Node archive and real Python/Node pipe fixtures | 8 passed in 3.001 seconds; production boundary code unchanged by later UI-only corrections |
| Wiring audit | Exit 0; 982 routes, 979 wired, zero weak, zero orphan, 3 skipped; no affected web routes |
| Diff / ownership | Diff check passed; only six task-owned source/config/test files in the source commit; unrelated canonical work preserved |

Two initial delay tests failed before implementation: startup blocked for 0.515 seconds and checklist preparation for 0.610 seconds. They pass after the fix. Early sequential-window verification reproduced a Tcl collection failure, which was corrected before the passing final suite. The catalog contention fixture uses an exclusive rollback-journal lock; a WAL writer alone does not block reads and was not an adequate contention fixture.

The heartbeat result is a bounded synthetic measurement, not a sustained workload guarantee. It does not prove performance for arbitrary catalogs, every image format, long videos, disconnected drives, or memory pressure. The pipe fixture substitutes isolation only in its generated test driver and therefore does not prove protected production consumption. Earlier TypeScript, firewall and ACL fixture results remain historical; they were not counted as rerun here.

## Wiring and release holds

The domain matrix found no affected web route. Remy/navigation relevance is satisfied by the existing native local entry point; private review content is intentionally excluded from cloud intelligence and general command surfaces. The commitment keyword refers to owner media approval, not bookings or payments. Dinner Circles, Universal Rail, Priority Queue product UI, Menu Intelligence, PIE, Client Intelligence, communications, event FSM and ledger changes are not applicable to this native maintenance change. Automation/consumer access remains governed by existing signed approval and revocation checks, covered by the generated boundary tests.

The latest observed pre-update [CI run](https://github.com/davidferra13/CFV-1/actions/runs/34327792275) failed TypeScript + Lint, Critical Tests, Unit Tests and Dependency Audit. Its route gate names /dfpc and /hermes as missing from PUBLIC_UNAUTHENTICATED_PATHS, and the audit includes critical advisories. Changing CI's Node version repairs the diagnosed discovery mismatch; it does not establish passing tests, route gates, dependency audit or production build. The earlier full repository typecheck also failed on declaration/import gaps. No repeated full build, canonical server restart or passing regression-firewall claim is made in this bounded pass.

The default protected runtime remains absent. Encrypted owner-only storage, executable outbound restrictions and actual isolated approval/consumption/revocation are still unverified. The native Windows reviewer is not a deployable dfprivatechef.com feature; the website is a separate repository and production target.

The next environment step is the prepared read-only readiness check in an Administrator PowerShell window on the Windows PC:

```powershell
powershell -NoProfile -File "C:\Users\david\.codex\worktrees\cfv1-media-privacy-release-20260909\scripts\local-media-privacy\inspect-readiness.ps1"
```

This reads protection metadata. It does not configure encryption/firewall rules or unlock processing. Previous Windows RunAs attempts did not produce an administrator result; no alternate elevation route was used.

## Independent review and publication scope

Initial r5 Crucible review: C, 79.8. The single correction pass moved catalog preparation and image transformations out of Tk callbacks, added catalog-lock and large-image checks, and committed the result at aae82e4bf2d29d507056aeb924567464cc0dbafa.

Final verdict: **B, 81.6** (L1 77, L2 84, L3 87, L4 71, L5 97; no floor adjustment). The reviewer found the mechanical responsiveness issue resolved and no new blocking code defect. This clears the reviewed code-quality threshold; the actual protected runtime, full repository gates and collection-scale sustained workload evidence remain release holds. The reviewer used the inherited available model because the skill's requested Opus model was unavailable.

The owner previously explicitly approved public source/build-note publication to davidferra13/CFV-1 and opening a draft PR; the subsequent Proceed instruction authorizes continuing this scoped work. Publication remains source and generic verification notes only, on the existing draft branch. It does not publish media or enable private processing.
