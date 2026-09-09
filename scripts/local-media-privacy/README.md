# Local media privacy review

Status: implementation under verification. Personal-media processing is not enabled automatically.

This native Windows tool creates a virtual review queue. Originals stay in their source folders. It reuses Python 3.12, Pillow, FFmpeg/ffprobe/FFplay and the installed local Ollama vision model. No training, cloud fallback, Google credentials, file moves or deletion are implemented.

## Open the harmless demo

From the repository root:

```powershell
powershell -NoProfile -File scripts/local-media-privacy/start-review.ps1 -Demo
```

The demo creates its own harmless image, labels its model result as synthetic, and disables source picking and export matching. It does not run inference. Reveal the image, choose Keep private, or explicitly approve local archive use. Close the window to remove the generated demo directory.

## Real-media prerequisites

The normal launcher opens a locked window until its read-only isolation checks pass:

1. Set `MEDIA_PRIVACY_HOME` to an existing encrypted directory outside the repository, Documents, Desktop and known OneDrive roots. The default is `%LOCALAPPDATA%\ChefFlowMediaPrivacy`.
2. The directory must be on a fully encrypted BitLocker volume with protection on and encryption at 100%. Its root ACL must disable inherited permissions and allow only the current owner, SYSTEM and Administrators. Every existing descendant is checked for broader permissions and reparse points, including a reused archive database. Custom sync software and backup exclusions must be checked separately; the program cannot discover every third-party sync configuration.
3. All effective Windows firewall profiles must be enabled. The Python, resolved FFmpeg, ffprobe and FFplay executables, and the process listening on `127.0.0.1:11434` must have effective outbound block rules covering all non-loopback addresses. The verifier accepts a program-wide `Any` block or the exact IPv4 ranges `0.0.0.0-126.255.255.255`, `128.0.0.0-255.255.255.255` and IPv6 `::/0`.
4. For archive consumption, set `MEDIA_PRIVACY_PYTHON` to the absolute Python 3.12 executable. The consuming Node executable must also pass the outbound-block check. Use a dedicated executable for this workload: applying rules to the shared Node binary can interrupt unrelated ChefFlow network operations.

The build does not change encryption, firewall rules, permissions, backup jobs or existing services. Those machine-level changes require a concrete configuration pass. A localhost URL alone does not prove zero egress. Effective firewall inspection is not packet-capture proof, and the current checks do not claim protection against same-user malware, administrator changes or unknown backup agents.

Once the prerequisites pass, open the normal launcher and choose one source folder. Nothing starts automatically. Work runs in batches of at most 100 files and 120 new frames per file, with a single-worker lock, a two-GiB free-space stop, a one-GiB available-memory stop and a pause control. No decision is granted by an inspection result.

Use **Resume** to continue the last source after restarting the app. Successful frame checkpoints survive process interruption. **Review > Retry failed files in last source** retries from the last saved frame; **Restart selected inspection** discards that file's inspection progress. Complete unchanged files are skipped. Changes to a file, companion, model digest or checkpoint policy invalidate saved inference. Removal-review exclusions survive source and companion changes. They also hold overlapping companion bundles, including an already-approved companion. Only an explicit owner decision on the excluding asset releases that exclusion; resetting another companion does not. Progress shows the current phase, saved frames, elapsed time and pause state. An active model request can take up to its request timeout before pausing.

## Review meaning

| Model signal | Your decision | General archive access |
| --- | --- | --- |
| Any signal, including no_signal | Unreviewed | Blocked |
| Any | Keep private | Blocked |
| Any | Exclude / removal review | Blocked |
| Any | Explicit complete human review and approval | Local use only, while bytes and companions remain unchanged |

Potential under-18 sexual material belongs in Exclude / removal review. That state suppresses previews, the full-review checklist and subsequent inference. The model never estimates age, identity or consent. No private media is needed for developer tests.

Approvals are signed locally and bound to source identity, complete file hashes, companion hashes and review revision. Approval also requires a signed review checklist and a separate owner confirmation for every supported part. Checking the final approval box without those confirmations is blocked. Earlier approvals without this new evidence are held until reviewed through the new workflow. Direct OCR and extraction consumers consult this store again. An edited JSON allowlist cannot grant access. Runtime signing keys and review records never belong in git or a shared diagnostic report.

## Coverage and current limits

- Images: Pillow-supported JPEG, PNG, GIF, WebP, BMP and TIFF. Animated images inspect every frame across resumable batches. Unsupported HEIC/RAW and decoder failures remain unknown. Images above 64 MiB compressed or 32 million decoded pixels are held.
- Videos: FFmpeg enumerates and processes each video track sequentially, with frame indices saved after successful inference. Decoding uses two queued 384-by-384 RGB frames, one decoder thread, a 30-second frame-read timeout and no extracted frame files. A resume redecodes the earlier prefix to reach the exact saved frame; it does not repeat that prefix's inference. Only clean decoder EOF on every video track establishes complete visual coverage.
- Nonvisual content: audio, subtitles, data streams and attachments are not analyzed. Their presence keeps whole-file coverage partial even after video frames finish. Same-stem companions are fingerprinted and separately inventoried, not semantically cleared as a group.
- Owner review: **Review file and companions** opens the complete local checklist. Still images and individual animation/TIFF frames have fit and actual-pixel views. UTF-8 text/JSON/XMP companions are shown as plain text, capped at 1 MiB. Every video and audio track opens separately in the installed local FFplay player. Each part requires an explicit owner confirmation after viewing. Closing a viewer or finishing playback does not confirm review. Video/audio decoding and playback do not estimate age or identify people.
- Unsupported review content: embedded subtitle, attachment and data streams; unknown formats; unreadable files; over-limit images/text; and unsupported companions prevent whole-bundle approval. They stay available for private/excluded decisions. The software does not claim to discover arbitrary hidden/steganographic content.
- Player lifecycle: only one player is owned by the review dialog. Stop or close ends owned playback; a helper watches the parent pipe and terminates playback if the parent disappears. A failed shutdown keeps a usable retry action and retains the worker slot until playback ends. All decoder/player subprocesses remove inherited report and proxy settings. No frames, audio copies or decoder reports are saved. Decoder and player protocols are restricted to local file/pipe, with external-reference playlist demuxers excluded.
- Linked files: same-stem companions and direct sidecars are fingerprinted. Arbitrary embedded content or unrelated derivative filenames are not discovered. Unsupported containers stay excluded.
- Detector limits: the model receives resized images. A completed scan does not mean that every sensitive detail was found or that a file is safe to share. The installed model returned a neutral signal for one harmless generated image in 44.39 seconds. This is a functioning-inference check, not an accuracy benchmark or sustained throughput claim. Exhaustive long-video processing may be impractically slow on this configuration.
- Resource proof: disk and memory stops, bounded frame queues and per-frame checkpoints have fixture coverage. Sustained CPU/GPU/memory behavior on large workloads still needs measurement before bulk operation.

## Existing archive integration

The existing archive ingest, low-level OCR, classification and extraction now require approval and signed text provenance. The local archive migration only adds metadata and a nullable receipt column. It does not delete or rewrite legacy source records.

Old derived clients, timelines and exports are held because historical provenance cannot be established by approving a source today. A fresh archive database is confined to the verified `MEDIA_PRIVACY_HOME/archive` directory. Arbitrary `ARCHIVE_DATA_DIR` overrides are rejected. Local JSON export is disabled pending separate destination verification. Existing legacy records need a separate reconstruction pass; the build never silently releases them.

The former network archive API now serves loopback health only and returns 403 for archive data routes. Personal media has no cloud publication permission. General `parseWithOllama` image arguments are blocked until they use the dedicated local review flow; this intentionally affects existing image callers. Restricted dispatch also rejects missing local runtimes and cloud/remote overrides.

Local export matching uses full-byte SHA-256 equality and records candidates privately. Select a file and choose **View local export matches** to see paths and their last verification status. Confirmation rehashes both local files; changed candidates become stale. A prior confirmation is historical, not a permanent identity guarantee. It cannot confirm a live Google Photos item or delete it. Filenames and dates are not identity. Recompressed or edited copies require separate candidate matching and manual confirmation.

## Verify without private data

```powershell
py -3.12 -m unittest discover -s tests/local-media-privacy -v
node --test tests/local-media-privacy/archive-gate.test.mjs
powershell -NoProfile -File tests/local-media-privacy/test-storage-policy.ps1
powershell -NoProfile -File tests/local-media-privacy/test-firewall-policy.ps1
py -3.12 scripts/local-media-privacy/probe-model.py
```

The native tests create harmless fixtures, exercise real SQLite and Tkinter, and remove their temporary files. The probe makes one request using a generated geometric image and reports only the neutral result and elapsed time. It is not an accuracy benchmark or proof that explicit content will always be detected.

The archive model adapter uses direct HTTP to the single verified `127.0.0.1:11434` listener. Alternate local ports, environment proxies, redirects and remote model metadata cannot select another transport.

Technical references: [FFplay controls and stream selection](https://ffmpeg.org/ffplay.html), [FFmpeg stream selection](https://ffmpeg.org/ffmpeg.html), [FFmpeg frame trimming](https://ffmpeg.org/ffmpeg-filters.html), [Ollama cloud execution](https://docs.ollama.com/cloud), [Windows firewall rules](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule), [effective address filters](https://learn.microsoft.com/en-us/powershell/module/netsecurity/get-netfirewalladdressfilter).

## Read-only setup check

`scripts/local-media-privacy/inspect-readiness.ps1` reports administrator state, system-volume encryption, default runtime presence/permissions, the fixed local listener, and executable firewall blocks. It reports no media paths, hashes, catalog contents or keys. It changes no encryption, ACLs, rules or services. Some checks require an administrator PowerShell session; unverified results never unlock the app.

```powershell
powershell -NoProfile -File scripts/local-media-privacy/inspect-readiness.ps1
```

A Windows elevation prompt is needed for the privileged read-only check in this remote session. Approving that check is not an instruction to change shared Python, Node or Ollama firewall behavior. A dedicated-runtime configuration must be reviewed against active services before changes are applied.
