# Local media privacy: full-review continuation

Date: 2026-09-09
Queue: BQ-20260908-local-media-privacy-integration
Run: RUN-20260909-local-media-privacy-r3
Branch: codex/local-media-privacy-20260908
Code commit: 4a847146a
Status: correction pass verified; release held. Production access remains locked.

## Acceptance evidence

Full owner review now has a local checklist covering supported image frames, text companions, video tracks and audio tracks. The installed FFplay process handles video and audio; images support actual-pixel viewing. Opening a part records only opened. A separate owner attestation records confirmed. Signed review manifests and confirmations are required at both final approval and the consumer authority. The final checkbox alone is insufficient. Changed bytes, companions or review policy invalidate the evidence, and old approvals without the new evidence remain held.

Unknown/unsupported formats, embedded subtitle/data/attachment streams and unreadable or over-limit components block whole-bundle approval. Removal-review items cannot open a checklist or viewer. The dialog holds the existing single-worker slot and checks the existing resource stop before opening media.

A parent-pipe watchdog owns the FFplay child. Dialog close, Stop or loss of the parent pipe terminates that playback only. Viewer logs are suppressed; no frames, audio copies or media reports are saved. File/pipe protocols and an explicit container list prevent network and playlist demuxers. FFplay joins the executable isolation requirements. Volume checks require fully encrypted BitLocker with protection on and 100% encryption.

## Runtime evidence

Read-only workstation metadata: C: had about 199.6 GiB free, FFplay 9 was installed through WinGet, and the remote session was not administrator. No robocopy, rclone or FFmpeg process appeared in the bounded process-name check. This is point-in-time metadata, not a guarantee about all concurrent storage activity. Existing unrelated processes were preserved.

The final Windows correction run passed 75 Python checks, including ten native UI/lifecycle checks, actual FFplay playback of generated video and silent audio, abrupt-parent-exit cleanup, and injected shutdown timeout followed by successful retry. No destroyed-window timer errors appeared. Eight Node authority/transport checks, twelve firewall-policy fixtures and two disposable storage-ACL fixtures passed. Total: 97 focused checks in this iteration. All local-media PowerShell scripts parsed successfully and git diff --check passed.

New regressions reproduce and prevent durable-exclusion loss, bypass through an approved companion or overlapping sidecar, inherited FFREPORT writes during real probing/frame extraction, and dialog shutdown deadlock. The exclusion holds survive changed or missing originals; only an explicit owner reset of the excluding asset releases its hold.

The Node/Python IPC fixture uses production pipes and approval code, but replaces isolation only within its test-owned fixture driver. It proves authority behavior, not actual machine isolation. Existing TypeScript coverage was not rerun because this iteration changes no TypeScript code; its earlier evidence is recorded in r2.

The non-administrator readiness check reported: default runtime absent; all effective firewall profiles enabled; encryption unverified; listener unverified; and no verified application blocks for Python, Pythonw, FFmpeg, FFprobe, FFplay or Node. Unverified listener/block results do not establish that a service is absent or that traffic occurred. Python is resolved using the same py -3.12 launcher as the normal review entrypoint.

The new inspect-readiness.ps1 is read-only. It reports administrator status, encryption, default runtime permissions, listener identity and per-executable block verification. Its optional output is a uniquely named aggregate JSON report. It performs no configuration changes or media/catalog reads. A privileged invocation requires Windows administrator consent. The prepared read-only elevated invocation did not start: the launcher returned administrator_consent_not_completed after about 124 seconds. No administrator report was created. No alternate elevation route was attempted and no machine protections were changed.

## Release limits

No real photos, videos, catalogs or personal source hashes were accessed remotely. No model download, media scan, original-file move/deletion, cloud call with media, push, merge, canonical app restart, encryption change or firewall change occurred.

Actual configured isolation and production approval/revocation remain unproven. The prior 44.39-second harmless model result establishes functioning inference only. Sustained resource/throughput proof and repository release gates remain open. The full-review UI closes the former missing-playback workflow gap within the supported content contract; it cannot prove a human watched or listened attentively.

Initial independent Crucible review: D, 69.3 (L1 68, L2 66, L3 74, L4 62, L5 86). Its three mechanical findings were reproduced with harmless fixtures and corrected in one pass: durable companion exclusions, shared decoder environment sanitization, and retryable player shutdown. Final regrade: C, 79.2 (L1 74, L2 82, L3 82, L4 71, L5 96). No initial mechanical findings remain open. The required B threshold was not met; the Crucible skill holds done status after its one correction/regrade cycle.

The larger workload/responsiveness gate remains open: review preparation, source hashing and isolation checks still run synchronously on the Tk event thread. Small successful fixtures do not establish responsive controls for gigabytes of media. Before bulk use, measure that path with bounded generated workloads and move blocking review operations off the Tk thread if needed. No sustained model workload was started amid unrelated active processes.

## Full final verdict

CRUCIBLE VERDICT: C (composite: 79.2, floor-adjusted: no)
Scores: L1: 74 | L2: 82 | L3: 82 | L4: 71 | L5: 96
Mode: full

FAILURES:

- [Lens 1: Definition of Done]: Release verification remains incomplete. The 97 focused Windows checks do not establish sustained resource behavior, usable controls with large media, or passing repository release gates. Review preparation, hashing and isolation checks still execute synchronously on the Tk event thread. -> Exact fix: retain the release hold in docs/verification/local-media-privacy-20260909-r3.md. Run a bounded generated workload that measures review responsiveness, CPU/GPU/memory use, interruption and recovery. Move blocking review operations in review.py and review_dialog.py off the Tk event thread where the measurements demonstrate stalled controls. Resolve the required repository gates through their appropriate work items.
  FIXABLE: no

- [Lens 4: Integration Completeness]: The protected production flow remains unconfigured and unproven. The default runtime is absent, encryption and executable isolation are unverified, and the IPC fixture substitutes the isolation preflight. Enabled firewall profiles and administrator metadata do not establish protected consumption. -> Exact fix: complete the dedicated runtime configuration using inspect-readiness.ps1, security.py, verify-isolation.ps1 and the README prerequisites. Then exercise harmless fixtures through the actual review launcher and production Node/Python bridge without replacing isolation checks. Record verified storage protection, applicable executable restrictions, actual network behavior, approved consumption and revoked denial.
  FIXABLE: no

ADVISORY (unscored):

- Final regrade scope: commit 4a847146a. The three initial mechanical findings are corrected: durable companion exclusions, decoder environment sanitization and retryable player shutdown.
- Independently reran all seven boundary regressions and thirteen full-review tests successfully using generated fixtures. Native Windows execution and lifecycle results are recorded in the build evidence.
- The supported full-review workflow now connects individual owner confirmations to final approval and consumer authorization. Those confirmations remain human attestations, not proof of attention or detector accuracy.
- No private media, catalogs, credentials or unrelated reports were inspected. This completes the permitted correction and regrade cycle.

BUILD BLOCKED: Grade C does not meet the B threshold. Fix remaining gaps before marking done.

## Immediate next step

The owner can run the prepared read-only readiness check from an Administrator PowerShell window:

```powershell
powershell -NoProfile -File "C:\Users\david\.codex\worktrees\cfv1-media-privacy-20260908\scripts\local-media-privacy\inspect-readiness.ps1"
```

This step reads only machine protection metadata. It does not configure encryption/firewall rules or enable media processing. Keep the application locked until a dedicated runtime is configured and the actual protected fixture path passes. Shared Python/Node/Ollama executable restrictions must be assessed against existing services before any configuration changes.
