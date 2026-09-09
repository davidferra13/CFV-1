# Owner-local media privacy integration

Queue: BQ-20260908-local-media-privacy-integration
Run: RUN-20260909-local-media-privacy-r3
Surface mode: reviewing. Native Windows window; no hosted page or private HTTP route.

The problem is mixed personal media entering general OCR and indexing before an owner can exclude it. The privacy worker may inspect unknown media only locally. Every general consumer requires current human approval. A model signal is evidence for review and never authorization.

The implementation uses a separate local SQLite authority, signed byte-and-companion-bound decisions, an Ollama adapter, native review controls and consumer-side checks. Source files remain untouched during migration. Existing derived records without verifiable lineage stay held. Network archive publication is disabled for this project.

States: unreviewed, private, removal_review, approved_local_archive. Model outputs: suspected_sensitive, no_signal, unknown. Cloud permission is always false. Unknown formats, failures, partial videos, refusals and malformed outputs cannot create approvals.

The complete implementation contract, entrypoint, coverage limits and machine prerequisites are in `scripts/local-media-privacy/README.md`. Verification results belong in `docs/verification/local-media-privacy-20260909-r3.md` (current) and `docs/verification/local-media-privacy-20260908-r2.md` (historical) and `docs/verification/local-media-privacy-20260908.md` (historical). No private paths, source hashes, images, catalogs or model descriptions belong in either file.

Release requires Windows synthetic tests, real native UI proof, a harmless installed-model probe, regression firewall, wiring review, and verified machine isolation. Resumable all-video-track processing, durable checkpoints and retry controls are implemented. Bulk release still requires embedded-container treatment and measured sustained resource budgets. Visual coverage is distinct from detection accuracy and from review of audio or companions. Passing helper tests alone cannot mark the queue item done.

Business domain applicability: this is a private review boundary, not a CRM or finance workflow. Rail, Dinner Circles, priority queue, commitment engine, menu engine, PIE, event FSM, ledger and communications have no new data or action surfaces. They must never receive private records. Shared AI routing is affected and requires focused dispatch regressions. The existing local archive entrypoints are the integration surface.

## Supported owner review contract

The next step for an unreviewed asset is Review file and companions. Its signed checklist is derived from freshly hashed source components, not editable metadata supplied by a model. Still images, animation and TIFF frames, supported plain-text companions, and each decoded video/audio track are independently reviewable. Video and audio use the installed protected FFplay process. Audio is reviewed separately so alternate tracks cannot be silently skipped.

A part is initially unreviewed. Successful local opening or player closure may record opened, never confirmed. The owner must explicitly attest to reviewing the entire part to record confirmed. All required parts must be supported and confirmed before the separate whole-bundle approval can succeed. A changed bundle, changed review policy or invalid signature prevents reuse. Legacy approvals without signed per-part review evidence do not pass consumers.

Playback duration, a player exit code and the model signal do not prove human attention. The owner attestation remains the human authorization step. Unsupported subtitle/data/attachment streams, unknown formats, unreadable parts and size-limit failures keep whole-bundle reuse held; there is no manual bypass around an unsupported unit. Private and removal-review decisions remain available without granting reuse.

The dialog owns the single-worker slot while open, keeps previews local, gates player launch on the same storage/network preflight, and stops its owned player on close or loss of the parent pipe. No cloud page, remote media review route, source relocation or deletion is added.

### Durable removal exclusion

Exclusions retain local component path records across automatic inventory changes. Same-stem and overlapping companion access is held at review, quick preview, scan, selected restart and archive authorization. An explicit owner decision releases only the exclusion created by that asset. Retained paths conservatively hold reused companion names; renamed unrelated copies are not inferred to be the same item. Excluded paths are runtime records and never belong in repository evidence.

### Decoder and player failures

FFprobe, FFmpeg, FFplay and the watchdog use one sanitized subprocess environment that discards inherited reporting and proxy overrides. Playback shutdown failure preserves the owned handle and worker slot, displays a retry action, and permits another Stop or Close. Only verified shutdown allows the dialog to finish closing.
