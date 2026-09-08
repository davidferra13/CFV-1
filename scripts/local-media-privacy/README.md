# Local media privacy review

Status: implementation under verification. Personal-media processing is not enabled automatically.

This native Windows tool creates a virtual review queue. Originals stay in their source folders. It reuses Python 3.12, Pillow, OpenCV and the installed local Ollama vision model. No training, cloud fallback, Google credentials, file moves or deletion are implemented.

## Open the harmless demo

From the repository root:

```powershell
powershell -NoProfile -File scripts/local-media-privacy/start-review.ps1 -Demo
```

The demo creates its own harmless image, labels its model result as synthetic, and disables source picking and export matching. It does not run inference. Reveal the image, choose Keep private, or explicitly approve local archive use. Close the window to remove the generated demo directory.

## Real-media prerequisites

The normal launcher opens a locked window until its read-only isolation checks pass:

1. Set `MEDIA_PRIVACY_HOME` to an existing encrypted directory outside the repository, Documents, Desktop and known OneDrive roots. The default is `%LOCALAPPDATA%\ChefFlowMediaPrivacy`.
2. The directory must be on a BitLocker-protected volume. Its ACL must disable inherited permissions and allow only the current owner, SYSTEM and Administrators. Custom sync software and backup exclusions must be checked separately; the program cannot discover every third-party sync configuration.
3. All effective Windows firewall profiles must be enabled. The Python executable and the process listening on `127.0.0.1:11434` must have effective outbound block rules covering all non-loopback addresses. The verifier accepts a program-wide `Any` block or the exact IPv4 ranges `0.0.0.0-126.255.255.255`, `128.0.0.0-255.255.255.255` and IPv6 `::/0`.
4. For archive consumption, set `MEDIA_PRIVACY_PYTHON` to the absolute Python 3.12 executable. The consuming Node executable must also pass the outbound-block check. Use a dedicated executable for this workload: applying rules to the shared Node binary can interrupt unrelated ChefFlow network operations.

The build does not change encryption, firewall rules, permissions, backup jobs or existing services. Those machine-level changes require a concrete configuration pass. A localhost URL alone does not prove zero egress. Effective firewall inspection is not packet-capture proof, and the current checks do not claim protection against same-user malware, administrator changes or unknown backup agents.

Once the prerequisites pass, open the normal launcher and choose one source folder. Nothing starts automatically. Work runs in bounded batches with a single-worker lock, a two-GiB free-space stop and a pause control. Press Scan again to reach remaining new files; unchanged inspected files are skipped. Errors stay excluded.

## Review meaning

| Model signal | Your decision | General archive access |
| --- | --- | --- |
| Any signal, including no_signal | Unreviewed | Blocked |
| Any | Keep private | Blocked |
| Any | Exclude / removal review | Blocked |
| Any | Explicit complete human review and approval | Local use only, while bytes and companions remain unchanged |

Potential under-18 sexual material belongs in Exclude / removal review. That state suppresses previews. The model never estimates age, identity or consent. No private media is needed for developer tests.

Approvals are signed locally and bound to source identity, complete file hashes, companion hashes and review revision. Direct OCR and extraction consumers consult this store again. An edited JSON allowlist cannot grant access. Runtime signing keys and review records never belong in git or a shared diagnostic report.

## Coverage and current limits

- Images: Pillow-supported JPEG, PNG, GIF, WebP, BMP and TIFF. Animated images inspect at most 120 frames per invocation. Unsupported HEIC/RAW and decoder failures remain unknown.
- Videos: OpenCV examines up to 120 sequential frames from its first video stream. All video results remain partial because this does not prove every stream was inspected. There is no audio analysis, full-video clearance, or resumed frame-by-frame progress yet.
- Preview: the owner can reveal one still image locally. No thumbnails or extracted frames are stored. The first frame is a preview, not proof of complete animated-file or video review.
- Linked files: same-stem companions and direct sidecars are fingerprinted. The program does not discover arbitrary embedded attachments or unrelated derivative filenames. Unsupported containers must remain excluded.
- Large sources: inventory hashes are streamed, but consumers cap in-memory image/document snapshots at 64 MiB. The worker has a batch cap and disk guard; a measured CPU/memory budget and durable per-frame checkpointing are still release requirements for bulk operation.
- Failed/partial inspections need an explicit retry/resume workflow before this can be called an exhaustive scanner.

## Existing archive integration

The existing archive ingest, low-level OCR, classification and extraction now require approval and signed text provenance. The local archive migration only adds metadata and a nullable receipt column. It does not delete or rewrite legacy source records.

Old derived clients, timelines and exports are held because historical provenance cannot be established by approving a source today. A fresh archive database is confined to the verified `MEDIA_PRIVACY_HOME/archive` directory. Arbitrary `ARCHIVE_DATA_DIR` overrides are rejected. Local JSON export is disabled pending separate destination verification. Existing legacy records need a separate reconstruction pass; the build never silently releases them.

The former network archive API now serves loopback health only and returns 403 for archive data routes. Personal media has no cloud publication permission. General `parseWithOllama` image arguments are blocked until they use the dedicated local review flow; this intentionally affects existing image callers. Restricted dispatch also rejects missing local runtimes and cloud/remote overrides.

Local export matching uses full-byte SHA-256 equality and records candidates privately. It cannot confirm a live Google Photos item or delete it. Filenames and dates are not identity. Recompressed or edited copies require separate candidate matching and manual confirmation.

## Verify without private data

```powershell
py -3.12 -m unittest discover -s tests/local-media-privacy -v
node --test tests/local-media-privacy/archive-gate.test.mjs
py -3.12 scripts/local-media-privacy/probe-model.py
```

The native tests create harmless fixtures, exercise real SQLite and Tkinter, and remove their temporary files. The probe makes one request using a generated geometric image and reports only the neutral result and elapsed time. It is not an accuracy benchmark or proof that explicit content will always be detected.

Technical references: [Ollama cloud execution](https://docs.ollama.com/cloud), [Windows firewall rules](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule), [effective address filters](https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewalladdressfilter).
