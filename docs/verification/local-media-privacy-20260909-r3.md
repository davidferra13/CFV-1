# Local media privacy: full-review continuation

Date: 2026-09-09
Queue: BQ-20260908-local-media-privacy-integration
Run: RUN-20260909-local-media-privacy-r3
Branch: codex/local-media-privacy-20260908
Status: correction pass verified; final review pending; production access remains locked.

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

The new inspect-readiness.ps1 is read-only. It reports administrator status, encryption, default runtime permissions, listener identity and per-executable block verification. Its optional output is a uniquely named aggregate JSON report. It performs no configuration changes or media/catalog reads. A privileged invocation still requires Windows administrator consent.

## Release limits

No real photos, videos, catalogs or personal source hashes were accessed remotely. No model download, media scan, original-file move/deletion, cloud call with media, push, merge, canonical app restart, encryption change or firewall change occurred.

Actual configured isolation and production approval/revocation remain unproven. The prior 44.39-second harmless model result establishes functioning inference only. Sustained resource/throughput proof and repository release gates remain open. The full-review UI closes the former missing-playback workflow gap within the supported content contract; it cannot prove a human watched or listened attentively.

Initial independent Crucible review: D, 69.3 (L1 68, L2 66, L3 74, L4 62, L5 86). Its three mechanical findings were reproduced with harmless fixtures and corrected in one pass: durable companion exclusions, shared decoder environment sanitization, and retryable player shutdown. Final regrade is pending.

The larger workload/responsiveness gate remains open: review preparation, source hashing and isolation checks still run synchronously on the Tk event thread. Small successful fixtures do not establish responsive controls for gigabytes of media. Before bulk use, measure that path with bounded generated workloads and move blocking review operations off the Tk thread if needed. No sustained model workload was started amid unrelated active processes.
