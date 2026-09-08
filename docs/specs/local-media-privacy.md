# Owner-local media privacy integration

Queue: BQ-20260908-local-media-privacy-integration
Run: RUN-20260908-local-media-privacy
Surface mode: reviewing. Native Windows window; no hosted page or private HTTP route.

The problem is mixed personal media entering general OCR and indexing before an owner can exclude it. The privacy worker may inspect unknown media only locally. Every general consumer requires current human approval. A model signal is evidence for review and never authorization.

The implementation uses a separate local SQLite authority, signed byte-and-companion-bound decisions, an Ollama adapter, native review controls and consumer-side checks. Source files remain untouched during migration. Existing derived records without verifiable lineage stay held. Network archive publication is disabled for this project.

States: unreviewed, private, removal_review, approved_local_archive. Model outputs: suspected_sensitive, no_signal, unknown. Cloud permission is always false. Unknown formats, failures, partial videos, refusals and malformed outputs cannot create approvals.

The complete implementation contract, entrypoint, coverage limits and machine prerequisites are in `scripts/local-media-privacy/README.md`. Verification results belong in `docs/verification/local-media-privacy-20260908.md`. No private paths, source hashes, images, catalogs or model descriptions belong in either file.

Release requires Windows synthetic tests, real native UI proof, a harmless installed-model probe, regression firewall, wiring review, and verified machine isolation. An exhaustive scanner additionally requires all-stream video coverage, durable frame checkpoints, retry controls, embedded-container treatment and measured resource budgets. Passing helper tests alone cannot mark the queue item done.

Business domain applicability: this is a private review boundary, not a CRM or finance workflow. Rail, Dinner Circles, priority queue, commitment engine, menu engine, PIE, event FSM, ledger and communications have no new data or action surfaces. They must never receive private records. Shared AI routing is affected and requires focused dispatch regressions. The existing local archive entrypoints are the integration surface.
