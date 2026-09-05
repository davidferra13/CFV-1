# Direct JSON corpus ingestion checkpoint

Date: 2026-09-05 UTC. Worker: Codex corpus_preservation_resume.
Context bus session: `54ab448f-2a0d-42b9-88ee-1ee97547eeaf` (DFPC).
Controller: DFPC self-email build swarm. Parent reserved and reviewed this exact slice.

## Scope and source

Direct evidence: owner authorized using self-emails as build plans, then said proceed. Gmail source `1a06f8a88975fe2c`, “DFPC handoff: complete corpus research + algorithm-based operations”, includes proposed R01 source preservation and ingestion accounting. Email source metadata identified `scripts/import-chatgpt-export-to-obsidian.mjs` with Git blob `32eb144928b64db792c8d314b1c526a418f4ceb9`.

Saved-project discovery found the same blob in `C:/Users/david/Documents/CFv1`. Source commit: `7924ac43024e4e21b205b0925492fb6faad6590e`. This proves local source identity; current deployment and canonical corpus importer status remain unverified.

Worktree: `C:/Users/david/Documents/CFv1-email-corpus-json-20260905`.
Branch: `codex/email-corpus-json-20260905`.
Shared checkout contains unrelated dirty/untracked work, including studio routes. Exact importer/test targets were clean, with no matching in-flight reservation found. Shared bytes preserved. Existing dependencies reused through an ignored worktree junction; no dependencies installed or modified.

## Proved defect and fix

Direct evidence: documented CLI accepts `conversations.json`; package script `obsidian:import:chatgpt` invokes this importer. The direct JSON loader returned `conversations`, while the importer iterated `source.batchLoaders`. Real exported importer with synthetic input failed with `source.batchLoaders is not iterable`. No source deletion or false completion was observed.

Fix: direct JSON now returns the same lazy `batchLoaders` and `cleanup` contract used by folder ingestion. Existing parsing, selected-path transcript, alternate-branch accounting, output naming, and attachment markers remain unchanged.

Exact write set:

- `scripts/import-chatgpt-export-to-obsidian.mjs`
- `tests/unit/chatgpt-obsidian-import.test.ts`
- `docs/handoffs/handoff-2026-09-05-email-corpus-json.md`

## Verification

- Before edits: original three importer tests passed, covering folder, nested ZIP, and batched ZIP input.
- Added direct JSON array and envelope tests: both failed before the fix with the exact loader error; original three still passed.
- After fix: all five tests passed via `node --test --import tsx tests/unit/chatgpt-obsidian-import.test.ts`.
- New tests prove exact input-byte preservation, short correction and full long text retention, direct-file/folder byte-identical note output, attachment marker retention, unchanged 5 total / 4 visible / 1 omitted branch counts, and repeat-import idempotence.
- `node --check scripts/import-chatgpt-export-to-obsidian.mjs` and `git diff --check` passed.
- Parent independently reviewed the diff against the source commit and found no actionable issue before commit.

Native application gate is incomplete and must not be reported green:

- `npm run test:affected` fails because package.json defines no such script: `Missing script: "test:affected"`.
- Native firewall chef navigation audit fails on seven baseline links without committed routes: `/studio`, `/studio/analytics`, `/studio/branding`, `/studio/domain`, `/studio/media`, `/studio/pages`, `/studio/seo`.
- Wiring audit completed: 982 routes, 979 wired, zero weak, zero orphans, three skipped. Its generated tracked report was restored to the clean baseline; it is outside this write set.
- Windows npm argument forwarding dropped flags on the first attempt; that run was interrupted before runtime work. Direct Node invocation then carried verified `--no-restart --skip-route-probes --step-timeout-ms 90000` flags.
- Per controller instruction, stopped the second run during broad app typecheck after the known failed gate, before runtime verification. No gate processes remained. App typecheck/runtime proof incomplete; no runtime restarted, no route probe or deployment performed.

## Preservation accounting and limits

Direct evidence from bounded read-only inspection of the separate DFPC snapshot:

- `local-archives/chatgpt/index/conversation-records.jsonl`: 2,519 normalized conversations and 59,152 messages; every message has `node_id` and `parent_id`; source provenance covers 26 ZIP entries.
- Role counts: 26,996 user, 30,132 assistant, 2,024 tool. 6,774 retained message texts are shorter than 50 characters.
- Records contain full `text` fields plus previews. These counts and observed long/short text do not prove equality to missing original export bytes.
- Manifest SHA-256 remains `A2A2E220C8AD6FB14731F98678B9467228230A76262E3A16F84F3CCB420F9F88`; normalized-records SHA-256 remains `4BE02CA5861BB5E4C9619554A8E01E15FA5052FD40156F95B526E77448A8CDE0`, matching recorded snapshot values.
- Original ZIP is absent at the manifest's Downloads path. DFPC `exports/` contains only `.gitkeep`. Message records have no structured asset fields. Original bytes, complete source role/branch membership, asset bytes, and explicit unresolved asset records cannot be fully reconciled from this snapshot.
- CFv1 Obsidian notes intentionally show selected paths and report omitted branch counts. Classifier/extractor filters operate on derived output. Those filters are not proof that original source was deleted.

Inference: this fix closes one documented direct-JSON ingestion failure. It does not implement immutable source storage or complete R01. No real private corpus was imported or changed; no private text was committed. No business rules, communications, culinary content, migrations, credentials, infrastructure, client contact, or deployment changed.

## Remaining work

Keep this as a verified local CLI checkpoint, with full application release blocked by the above gates. Parent owns landing order, controller status, shared logs, and continuing email intake. Before expanding R01, locate/acquire original source files and verify current canonical ingestion ownership; then reconcile originals, all message roles/branches, asset pointers and bytes, ingestion errors, and separate discovered/imported/read/reconciled/validated coverage. Do not infer corpus completion from this repair.

Context-mode initially indexed guidance, then repeated search/execute calls stalled. Bounded read-only shell analysis substituted; raw private conversation text was not printed.
