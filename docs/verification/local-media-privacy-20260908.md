# Local media privacy: build and release evidence

Date: 2026-09-08
Queue: BQ-20260908-local-media-privacy-integration
Run: RUN-20260908-local-media-privacy
Code commit: e1357bacc
Branch: codex/local-media-privacy-20260908
Status: prototype built; release blocked. No canonical-main merge or private-media rollout.

## Acceptance Evidence

The native Windows review window, local SQLite authority, signed human decisions, companion fingerprints, strict model-output parsing and consumer approval checks are implemented. Sources are never moved or deleted. Previews are hidden until explicitly revealed; removal-review assets cannot be previewed. No raw private media or review catalog was accessed during development.

Synthetic behavior checks cover unknown/no-signal exclusion, full human-review attestation, altered bytes with preserved size/time, new/changed companions, forged database approvals, ignored allowlist files, persisted decisions, local exact matching, unknown/invalid decoders, timeouts, partial animation coverage, single-worker locking, low disk, restart behavior and signed derived-text receipts.

## Wiring Proof

Existing archive ingest, OCR, classification, extraction, linking and timeline entrypoints require local approval/provenance. New derived databases are confined to the verified review runtime; arbitrary archive destinations and JSON export are held. The former archive network service serves only loopback health and denies data routes. Shared restricted AI parsing now verifies local model metadata and uses a direct transport that rejects redirects and ignores HTTP proxies.

Wiring audit reported zero orphan routes, zero weak routes, and no affected page routes. This is source wiring evidence, not proof of a production data flow. The local native launcher is the user entrypoint. No hosted media-review route was added.

Rail, Circles, commitment, priority queue, client/menu intelligence, PIE, communications, event FSM and ledger have no new private-data surfaces. Their business behavior was not claimed verified. Shared AI routing has focused regressions; existing business image callers are intentionally denied until integrated with the local approval boundary.

## Runtime Proof

Windows Python 3.12 exercised a real Tkinter window using generated geometric imagery: hidden preview, explicit reveal, refused approval without attestation, recorded approval, private decision, and locked unconfigured state. Fixtures and runtime records were temporary and synthetic.

The installed qwen3.5:4b passed local-model metadata verification in 0.2 seconds. Two harmless image probes failed to produce a result within the configured 120-second timeout. The diagnostic attempt identified TimeoutError at 120.3 seconds. No detector quality or successful installed-model inference is claimed.

Actual encrypted owner-only storage, effective zero-egress behavior, successful approved Python-to-Node consumption and revocation were not proven. Real-media processing remains unenabled. The canonical http://localhost:3100 application was not restarted or replaced by this build.

## Verification Output

| Check | Result |
| --- | --- |
| Windows Python/native UI suite | 31 passed |
| Node archive boundary suite | 4 passed |
| Existing and new AI dispatch/transport tests | 24 passed |
| Synthetic firewall applicability cases | 12 passed |
| PowerShell parser | 0 errors |
| Wiring audit | 0 orphan and 0 weak routes |
| Default full TypeScript/Next build preflight | Both exhausted the default Node heap, exit 134 |
| TypeScript with 8-GiB heap | Blocked by existing missing better-sqlite3 declarations and hub-push-subscriptions-internal imports outside this change |
| Regression firewall | No passing result; npm wrapper failed ERR_INVALID_ARG_TYPE, direct run reached app typecheck without completing release proof |
| Privacy artifact guard | Failed on pre-existing generated-report paths; paths withheld and contents not inspected |
| test:affected | Script absent from this checkout; focused tests run directly |
| graphify update | Not completed; no broad indexing of existing generated/private repository artifacts was authorized |
| Native finish-check | Not claimed passed; incomplete proof cannot close the queue item |

The isolated branch contains only this build's source, tests and documentation. Unrelated changes in the canonical checkout were preserved. Runtime databases, keys, previews, source hashes and extracted frames are excluded from version control.

## Crucible Verdict

Final grade: D. Weighted score: 65.7/100. Mode: full. Re-evaluation: 1 of 1. Scores: L1 60, L2 64, L3 68, L4 58, L5 95. Initial grade was F (62.3, floor applied because L4 was 45).

The one correction pass addressed ancestor links, narrowly scoped firewall rules, protected derived destinations, final model-tier selection, and restricted transport redirects/local metadata.

Remaining release failures:

1. The archive model adapter accepts alternate loopback ports while the isolation verifier checks port 11434. Bind the consumer to the verified endpoint/process and add an alternate-proxy rejection test. Also verify permissions on any reused archive subdirectory/database.
2. Implement complete video-stream coverage, durable frame checkpoints, explicit retry/resume and measured resource budgets. Existing video inspection is bounded and always partial.
3. Add an owner-facing list of exact-match candidates, actionable progress and recovery. A match count alone does not complete the review workflow.
4. Prove installed-model inference, actual isolation, approved cross-process consumption followed by revoked-access denial, and the required repository release gates.

The Crucible skill requires grade B or higher and permits one correction/review pass. Its D verdict prevents marking this build done. Keep the branch unmerged and the queue item blocked until the remaining work and evidence exist.

BUILD BLOCKED: Grade D does not meet the B threshold. Fix remaining gaps before marking done.
