# Local media privacy: continuation evidence

Date: 2026-09-09 (continuation started 2026-09-08)
Queue: BQ-20260908-local-media-privacy-integration
Run: RUN-20260908-local-media-privacy-r2
Branch: codex/local-media-privacy-20260908
Code commit: 5b8c839b9
Status: correction pass verified; release blocked. No real-media rollout.

## Changes

The archive model adapter is bound to the exact verified 127.0.0.1:11434 listener. Direct node:http ignores environment proxies and rejects redirects. The Windows verifier checks every runtime descendant for broader permissions or reparse points, including reused archive databases, and includes resolved FFmpeg/ffprobe executables in egress checks. WinGet executable links resolve once to concrete binaries; media links remain rejected.

Image and video inspection persists successful frame checkpoints in SQLite. Resume revalidates the complete file/companion hash and model digest. A model change or changed bundle restarts inference. FFmpeg enumerates all video tracks, passes every decoded visual frame through the detector across bounded batches, and requires clean decoder EOF on every track before complete visual coverage. Uninspected audio, subtitles, attachments or data streams keep whole-file coverage partial. No media frames are saved.

The native window exposes Resume, retry failed files, restart selected inspection, current phase/frame count/elapsed time, and an owner-facing exact-match list. Match confirmation rehashes both local files. Removal-review assets are excluded from further inference. Source files are never moved, copied into quarantine or deleted.

Resource controls: 100 files per batch, 120 new frames per file, two queued 384-by-384 RGB video frames, one decoder thread, a 30-second frame read timeout, model request timeout, two-GiB free-disk and one-GiB available-memory stops, 64-MiB compressed-image and 32-million decoded-pixel limits. These are configured controls, not a measured sustained-load budget.

## Runtime proof

An actual qwen3.5:4b request on the existing Windows Ollama service classified one generated geometric image as no_signal in 44.39 seconds. No private images were used. This resolves the prior missing successful-inference proof; it does not measure recall, precision, age, consent, throughput or long-video feasibility.

Windows read-only setup inspection: the default private runtime directory does not exist, all three effective firewall profiles are enabled, and system-volume encryption could not be verified. An enabled firewall is not proof of the required application block rules. No configuration changes were made and real-media access remains locked.

The cross-process fixture test invokes the production Node authority and Python bridge with real OS pipes, SQLite, approval signatures and receipts. It verifies denied-before-approval, approved read, text-bound provenance and revoked denial. The test replaces only the isolation preflight inside a test-owned driver restricted to its generated text fixture. Therefore it does not prove actual isolated production consumption.

## Verification

Final Windows checks after the mechanical correction pass:

| Check | Result |
| --- | --- |
| Python authority, worker, checkpoint and native UI tests | 51 passed, including 6 Tkinter checks |
| Node archive transport and actual-pipe fixture | 8 passed |
| Existing and new AI dispatch/transport tests | 24 passed |
| Firewall applicability fixtures | 12 passed |
| Disposable descendant storage-ACL fixtures | 2 passed |
| PowerShell parser | No errors |
| Git diff whitespace check | Passed |

Total: 97 focused checks. Fixture tests do not grant a production release.

The Windows native suite caught WinGet launcher links being rejected as media links; pinning the resolved executable corrected that failure. The Windows IPC test caught platform-specific text newlines; fixed-byte fixture creation corrected it. The final run passed on Windows. No real media was needed.

Full repository release gates remain unproven because of the previously recorded unrelated TypeScript/import issues, regression-wrapper failure and pre-existing generated-report guard findings. Broad private-artifact indexing was not performed. No canonical application restart, main merge, remote push or actual media scan occurred.

## Release hold

Initial Crucible grade: C, 70.5/100 (L1 70, L2 74, L3 68, L4 66, L5 75). Its one mechanical correction pass is implemented: policy invalidation, explicit outcome counts, shared resource stops, actionable errors and empty states, a distinct next action, duplicate-control removal, and a portable IPC fixture. Final regrade: C, 77.7/100 (L1 74, L2 76, L3 82, L4 72, L5 94). No mechanical findings remain open. The required B threshold was not met, so the Crucible skill blocks done status after its one correction/regrade cycle. Remaining evidence requires configured encrypted owner-only storage, verified executable egress restrictions including the decoders and archive consumer, actual isolated approved/revoked consumption, a sustained synthetic workload budget and passing repository release gates. The native still-image preview does not supply complete video/companion playback; whole-file human review remains the owner's explicit attestation.

No new detector training, cloud deletion, cloud identity matching or automatic cleanup is claimed. The old evidence document remains the historical record for the first iteration; this document records continuation work.

## Full final verdict

CRUCIBLE VERDICT: C (composite: 77.7, floor-adjusted: no)
Scores: L1: 74 | L2: 76 | L3: 82 | L4: 72 | L5: 94
Mode: full

FAILURES:

- [Lens 1: Definition of Done]: Release verification remains incomplete. The 97 focused checks do not replace the required repository gates or establish sustained resource behavior for large workloads. -> Exact fix: keep docs/verification/local-media-privacy-20260908-r2.md and the queue blocked until the required repository gates pass and a sustained synthetic workload records CPU/GPU/memory use, pause behavior and recovery. Address unrelated gate failures through their appropriate work items; do not waive them or present fixture results as release proof.
  FIXABLE: no

- [Lens 4: Integration Completeness]: The protected production path remains unconfigured and unproven. The default runtime directory is absent, encryption is unverified, and the IPC fixture substitutes the isolation preflight. Actual approved consumption and revoked denial under the enforced production boundary have not occurred. -> Exact fix: complete a deliberate dedicated-runtime configuration using security.py, verify-isolation.ps1 and the README prerequisites. Then exercise the production Node authority and Python bridge with harmless fixtures, verify effective executable egress restrictions and network behavior, and record approved/revoked results without substituting the isolation gate.
  FIXABLE: no

- [Lens 2: Void / Island / Facade]: Complete human review still exceeds what the review surface supports. review.py:reveal() displays one still image, while approval covers the complete video or animated file and every companion. -> Exact fix: define the supported owner review contract in docs/specs/local-media-privacy.md. Implement protected full-media review and companion navigation, or obtain an explicit product decision narrowing the approval workflow to content it can support. Keep complete-media review claims held until that decision and implementation are verified.
  FIXABLE: no

ADVISORY (unscored):

- Final regrade scope: commit 5b8c839b9. No mechanical findings from the previous verdict remain open. The targeted policy, failure-accounting, low-disk restart and IPC regressions were independently rerun using harmless fixtures.
- The successful 44.39-second model probe establishes functioning inference only. It establishes neither detection accuracy nor practical bulk-video throughput.
- This final regrade remains below the required B threshold. Record the remaining gaps and hold release; the permitted correction/regrade cycle is exhausted.

BUILD BLOCKED: Grade C does not meet the B threshold. Fix remaining gaps before marking done.
