# MemPalace Reconstruction Plan

Plan ID: `p8k3x1`

Date: 2026-04-21  
Status: planning only  
Scope: define a deterministic export plan for reconstructing MemPalace drawers into human-readable Obsidian notes.  
Non-goals for this phase:

- do not modify source data
- do not write any export notes yet
- do not summarize or rewrite source content
- do not begin AnythingLLM work

## Planning Baseline

This plan uses the Phase 1 inventory in [analysis_report.md](/c:/Users/david/Documents/CFv1/analysis_report.md).

Facts carried forward from Phase 1:

- Canonical grouping signal: `source_file`
- Canonical chunk ordering signal: `chunk_index`
- `chunk_index` is zero-based, unique, and contiguous for every indexed source file inspected
- `room` is not a valid grouping key for conversations or sessions
- `mempalace_compressed` is derived text and must never be merged into canonical raw note bodies
- Live conversation/session drawers are not guaranteed to be byte-exact mirrors of underlying source files
- Source-first export is the canonical path when the source file still exists
- Drawer-text fallback is required only when the source path is missing

## 1. Grouping Strategy

### 1.1 Canonical grouping rule

One output note is created per canonical source file identity, not per drawer.

Canonical note identity:

`export_namespace + normalized_source_file`

Where:

- `export_namespace` is the human-facing category in Obsidian
- `normalized_source_file` is the absolute `source_file` path normalized with:
  - `Path.GetFullPath`
  - known root validation
  - path comparison using Windows case-insensitive semantics

Case-preserving display path:

- grouping compares paths case-insensitively
- displayed path keeps the first canonical spelling after sorting by:
  1. `palace2` before `palace`
  2. existing source path before missing source path
  3. lexical `source_file`

This prevents duplicate notes caused by path casing differences while preserving a stable display form.

### 1.2 Export namespaces

| Export namespace | Included MemPalace records | Canonical source root | Grouping key | Output root |
| --- | --- | --- | --- | --- |
| `cfv1` | live `mempalace_drawers` with `wing=cfv1` from `palace2` and `palace` | `C:\Users\david\Documents\CFv1` | normalized `source_file` relative to repo root | `/obsidian_export/cfv1/` |
| `claude-conversations` | live `mempalace_drawers` with `wing=chefflow-conversations` from `palace2` and `palace` | `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1` | normalized `source_file` relative to Claude root | `/obsidian_export/claude-conversations/` |
| `codex-conversations` | live active `wing=codex-conversations` plus live legacy `wing=codex-sessions` | `C:\Users\david\.codex\archived_sessions` | normalized `source_file` relative to Codex archive root | `/obsidian_export/codex-conversations/` |
| `cfv1-derived-compressed` | `palace2 / mempalace_compressed / wing=cfv1` only | `C:\Users\david\Documents\CFv1` | normalized `source_file` relative to repo root | `/obsidian_export/cfv1-derived-compressed/` |
| `unresolved` | records that cannot be safely normalized into one of the namespaces above | none | deterministic fallback identity | `/obsidian_export/unresolved/` |

### 1.3 Category-specific grouping behavior

#### Conversations: Claude

- Group by exact normalized `source_file`
- Do not split by `room`
- `.jsonl`, `.txt`, `.md`, and `.json` artifacts remain separate notes if they were separate source files
- tool-result artifacts stay grouped by their own source path, not by parent conversation ID

#### Conversations/Sessions: Codex

- Normalize both `codex-conversations` and `codex-sessions` into one namespace: `codex-conversations`
- Group by exact normalized `source_file`
- Keep both original wing labels in provenance when both active and legacy records exist
- Do not create separate notes for active vs legacy when they point to the same archived session path

#### Repo files: `cfv1`

- Group by exact normalized repo path
- Preserve repo-relative path under `/obsidian_export/cfv1/`
- Logs and generated artifacts that live under the repo remain in the repo namespace:
  - `logs/**`
  - `test-results/**`
  - `*.log`
  - `*.out`
  - `*.err`
- Do not move repo-local files into a generic top-level logs bucket because the source path is the stronger identity

#### Derived layer: compressed `cfv1`

- Group by exact normalized repo path
- Keep separate from canonical `cfv1` notes even when `source_file` and `chunk_index` match live drawers
- Export namespace is separate because the content is derived, not original

### 1.4 Output path mapping

For every grouped note:

1. Identify namespace root.
2. Compute source-relative path under the namespace's canonical source root.
3. Preserve the relative directory tree exactly.
4. Write note filename as:
   - keep `.md` if the original filename already ends in `.md`
   - otherwise append `.md` to the original filename

Examples:

- `C:\Users\david\Documents\CFv1\app\page.tsx`  
  -> `/obsidian_export/cfv1/app/page.tsx.md`
- `C:\Users\david\.codex\archived_sessions\rollout-2026-01-17T15-34-09.jsonl`  
  -> `/obsidian_export/codex-conversations/rollout-2026-01-17T15-34-09.jsonl.md`
- `C:\Users\david\Documents\CFv1\README.md`  
  -> `/obsidian_export/cfv1/README.md`

### 1.5 Fallback logic when grouping is ambiguous

No heuristic grouping is allowed.

Fallback rules:

1. If `source_file` exists and matches a known root, group by normalized `source_file`.
2. If `source_file` exists but does not fall under the expected root for that wing, do not guess another root.
   - route to `/obsidian_export/unresolved/grouping/`
   - note id = short hash of `root + collection + wing + source_file`
3. If `source_file` is missing or empty, do not infer grouping from `room`, timestamps, or filenames.
   - create a singleton unresolved note keyed by `embedding_id`
4. If two normalized output paths collide after case-insensitive normalization or filename sanitization:
   - keep the lexically first path unchanged
   - suffix later colliding paths with `__<shortsha1(relative_source_path)>`
   - log the collision

This keeps grouping deterministic and prevents accidental merges.

## 2. Ordering Logic

### 2.1 Canonical content ordering

There are two note modes.

#### Mode A: source-backed note

Use the source file itself as the canonical body when the source path exists and is readable.

- body order = exact on-disk source order
- drawer ordering is recorded in provenance only
- no chunk concatenation is used for the canonical body

This is required because live conversation/session drawers are not guaranteed to mirror source files exactly.

#### Mode B: drawer-fallback note

Use drawer text only when the source path is missing.

Primary order:

1. `chunk_index` ascending

Chunk-level tie-break order:

1. root priority: `palace2` before `palace`
2. collection priority: `mempalace_drawers` before any derived collection
3. normalized wing priority:
   - `cfv1`
   - `chefflow-conversations`
   - `codex-conversations`
   - `codex-sessions`
4. `filed_at` ascending
5. `embedding_id` ascending
6. integer `id` ascending

### 2.2 Duplicate chunk keys across active/legacy

If the same canonical note has multiple records with the same `chunk_index`:

- if `chroma:document` is identical, emit one chunk body and record all contributing drawers in the drawer map
- if `chroma:document` differs and no source file exists to arbitrate:
  - do not flatten to one guessed text body
  - emit the chunk index once with ordered variants:
    - `variant_01` = highest-priority source by tie-break rules above
    - `variant_02+` = remaining distinct texts in deterministic order
  - mark the note `ordering_status: variant_conflict`
  - append an issue entry to `/obsidian_export/import_log.md`

This preserves all content and avoids silent data loss.

### 2.3 Timestamp-based ordering

`filed_at` is never the primary chunk order for normal notes because Phase 1 proved `chunk_index` is reliable everywhere it exists.

`filed_at` is used only as:

- a tie-breaker inside duplicate chunk variants
- a provenance range summary (`filed_at_min`, `filed_at_max`)
- the ordering key for singleton unresolved notes when no chunk sequence exists

### 2.4 Filename sequencing

Filename sequencing is used only for:

- the order of notes in batch manifests
- export path generation
- deterministic selection of colliding unresolved notes

It is not used to infer chunk order inside a note.

### 2.5 Fallback when ordering is unclear

No guessing.

Rules:

1. If all records for a grouped note have valid `chunk_index`, use `chunk_index`.
2. If a note has exactly one contributing drawer and no `chunk_index`, emit it as a singleton unresolved note.
3. If a note has multiple contributing drawers and any chunk order cannot be derived from `chunk_index`, do not flatten the body.
   - route to `/obsidian_export/unresolved/ordering/`
   - log as `ordering_ambiguous`

## 3. Output Structure (Obsidian)

Planned vault structure:

```text
/obsidian_export/
  import_log.md
  /cfv1/
    <repo-relative-path>.md
  /claude-conversations/
    <claude-relative-path>.md
  /codex-conversations/
    <codex-relative-path>.md
  /cfv1-derived-compressed/
    <repo-relative-path>.md
  /unresolved/
    /grouping/
    /ordering/
    /decode/
    /path-collisions/
  /_manifests/
    batch-0001.md
    batch-0002.md
    ...
```

Why this structure is optimal:

- it maps directly to the observed source roots and MemPalace wings
- it keeps canonical raw notes separate from derived compressed notes
- it preserves original relative paths, which is the strongest human-readable organization available
- it avoids mixing repo files, Claude artifacts, and Codex sessions into one flat archive
- it gives unresolved items an explicit quarantine area instead of silently dropping or misgrouping them
- it keeps the import log and batch manifests inside the vault for auditability

## 4. File Format Specification

### 4.1 Shared note wrapper

Every exported note is UTF-8 markdown with YAML frontmatter.

Required frontmatter fields:

```yaml
---
mempalace_export_version: 1
note_type: source-backed | drawer-fallback | derived-compressed | unresolved
export_namespace: cfv1 | claude-conversations | codex-conversations | cfv1-derived-compressed | unresolved
canonical_source_file: "C:\\absolute\\path\\to\\source"
relative_source_path: "path/inside/namespace"
source_exists: true | false
content_authority: source-file | mempalace-drawers | mempalace-compressed | none
roots_present: [palace2, palace]
collections_present: [mempalace_drawers]
wings_present: [cfv1]
drawer_record_count: 0
unique_chunk_count: 0
filed_at_min: "..."
filed_at_max: "..."
ordering_status: ordered | variant_conflict | ordering_ambiguous | unresolved
content_sha256: "<sha256 of exact exported content payload>"
export_id: "<namespace>::<normalized_source_file>"
---
```

Optional frontmatter fields when needed:

- `source_size_bytes`
- `source_sha256`
- `source_extension`
- `source_read_error`
- `path_collision_suffix`
- `variant_chunk_indexes`
- `original_path_spellings`

### 4.2 Note title

First heading:

`# <relative_source_path>`

This makes every note legible in Obsidian without hiding the underlying source identity.

### 4.3 Source-backed note body

Structure:

1. `## Content`
2. exact source content inside a dynamic-length fenced code block
3. `## Drawer Map`
4. ordered per-chunk provenance table

Example skeleton:

````markdown
## Content
````<language>
<exact source file text, written without textual transformation>
````

## Drawer Map
| chunk_index | root | collection | wing | room | filed_at | embedding_id | drawer_id |
| ---: | --- | --- | --- | --- | --- | --- | ---: |
| 0 | palace2 | mempalace_drawers | cfv1 | hooks | 2026-04-10T16:28:39.372962 | drawer_cfv1_hooks_9647a6b888cfac35 | 2 |
````

Rules:

- the fenced block must contain the exact source payload and nothing else
- source-backed exports must not normalize line endings, trim whitespace, or add a trailing newline inside the fenced payload
- fence length = `max(4, longest_backtick_run_in_content + 1)`
- language tag comes from source extension when known, otherwise `text`
- chunk labels are not inserted inside the canonical content block
- traceability is preserved in `Drawer Map`, not by modifying the content body

### 4.4 Drawer-fallback note body

Used only when the source file is missing.

Structure:

1. `## Reconstructed Chunks`
2. one subsection per ordered `chunk_index`
3. each chunk subsection contains:
   - chunk label
   - provenance line(s)
   - exact drawer text in a dynamic-length fenced block
4. `## Drawer Map`

Example skeleton:

````markdown
## Reconstructed Chunks

### Chunk 0000
source: palace2 / mempalace_drawers / chefflow-conversations
embedding_id: drawer_...
drawer_id: 12345

````text
<exact chroma:document text>
````

### Chunk 0001
...

## Drawer Map
| chunk_index | variant | root | collection | wing | room | filed_at | embedding_id | drawer_id |
| ---: | --- | --- | --- | --- | --- | --- | --- | ---: |
| 0 | variant_01 | palace2 | mempalace_drawers | chefflow-conversations | summary | ... | ... | ... |
````

Rules:

- chunk text is copied exactly from `chroma:document`
- no chunk text rewriting or joining across ambiguous duplicate variants
- if a chunk has multiple distinct texts, each variant gets its own labeled block

### 4.5 Derived-compressed note body

Same structure as drawer-fallback notes, except:

- `note_type: derived-compressed`
- `content_authority: mempalace-compressed`
- each chunk includes `original_tokens` and `compression_ratio` in the drawer map
- derived notes live only under `/obsidian_export/cfv1-derived-compressed/`

### 4.6 Traceability requirements

Every exported note must preserve traceability back to source drawers by including:

- `embedding_id`
- integer `drawer_id` from `embeddings.id`
- `root`
- `collection`
- `wing`
- `room`
- `chunk_index`
- `filed_at`

No drawer may contribute content without appearing in the note's `Drawer Map` or an issue log entry.

## 5. Scale Plan

### 5.1 Expected note counts

Default canonical export scope:

- `cfv1`: `7,341` notes
- `claude-conversations`: `8,395` notes
- `codex-conversations`: `469` notes
- canonical total: `16,205` notes

Optional derived companion layer:

- `cfv1-derived-compressed`: `6,571` notes
- canonical + derived total: `22,776` notes

This satisfies the target scale of roughly `10k` to `30k` files.

### 5.2 Average chunks per file

Canonical live corpus, using path-deduped notes:

- `cfv1`: `18.63` unique chunk positions per note on average
- `claude-conversations`: `18.04` unique chunk positions per note on average
- `codex-conversations`: `32.58` unique chunk positions per note on average
- canonical overall: `19.59` unique chunk positions per note on average

Raw provenance burden including active/legacy duplicates:

- canonical live drawer records: `337,933`
- canonical note count: `16,205`
- average drawer references per note: `20.85`

Optional derived layer:

- compressed notes average: `17.14` chunks per note

### 5.3 Estimated size

Observed current source-backed corpus size for existing live source paths:

- `cfv1` existing source bytes: `89,695,317`
- `claude-conversations` existing source bytes: `4,882,658,173`
- `codex-conversations` existing source bytes: `1,030,484,490`
- canonical existing-source subtotal: `6,002,837,980` bytes

Observed missing-path fallback payload if rebuilt from live drawers:

- missing canonical notes: `1,075`
- unique fallback chunk positions: `16,316`
- fallback text subtotal: `25,531,568` characters

Planned export size estimate:

- canonical export: approximately `6.1 GB` to `6.4 GB`
- if derived compressed notes are added later: approximately `6.2 GB` to `6.5 GB`

The estimate includes note wrappers, drawer maps, and import manifests.

## 6. Batch Execution Plan

### 6.1 Batch size

Standard batch:

- target `500` notes per batch
- hard cap `250 MB` estimated payload per batch
- if a single note exceeds `250 MB`, it becomes a singleton batch

Expected batch counts:

- canonical export only: about `33` batches
- canonical + derived compressed: about `46` batches

### 6.2 Deterministic batch selection

Precompute a manifest of all planned notes sorted by:

1. namespace order:
   - `cfv1`
   - `claude-conversations`
   - `codex-conversations`
   - `cfv1-derived-compressed`
   - `unresolved`
2. case-insensitive `relative_source_path`
3. `export_id`

Batching algorithm:

1. walk the sorted manifest in order
2. add notes to the current batch until either:
   - `500` notes are reached, or
   - projected payload exceeds `250 MB`
3. start the next batch at the next note

This makes reruns and partial restarts reproducible.

### 6.3 Progress tracking

`/obsidian_export/import_log.md` is append-only and must be updated after every batch.

Required log fields per batch:

- `batch_id`
- `status` (`planned`, `running`, `completed`, `completed_with_issues`, `failed`)
- `started_at`
- `finished_at`
- `namespace_range`
- `first_export_id`
- `last_export_id`
- `planned_note_count`
- `written_note_count`
- `skipped_note_count`
- `issue_count`
- `written_bytes`
- `manifest_path`

Batch manifest files under `/obsidian_export/_manifests/` should list every note in that batch with:

- `export_id`
- output path
- note type
- source path
- chunk count
- content hash
- status

## 7. Failure Handling

### 7.1 Grouping failures

If grouping fails:

- never merge by `room`
- never merge by timestamp
- never infer grouping from filename fragments alone
- create an unresolved note only if a deterministic fallback identity exists
- otherwise skip the record and log:
  - root
  - collection
  - wing
  - `embedding_id`
  - integer `drawer_id`
  - reason

### 7.2 Ordering ambiguity

If ordering cannot be proven:

- source-backed notes:
  - keep the source file as the canonical body
  - log the drawer-order anomaly in `import_log.md`
- drawer-fallback notes:
  - if duplicate chunk variants differ, preserve all variants
  - if chunk order cannot be derived, route to `/unresolved/ordering/`
  - do not flatten a guessed body

### 7.3 Corrupted or unreadable source files

If the source path exists but cannot be read safely as text:

- do not rewrite or repair the source
- do not silently substitute drawer text as if it were the original file
- create an unresolved decode issue under `/obsidian_export/unresolved/decode/`
- log the failure and continue

### 7.4 Corrupted or unreadable drawer records

If a drawer record is corrupt:

- if the note is source-backed, keep exporting the source-backed note and log the bad drawer in the drawer map issue list
- if the note is drawer-fallback and a required chunk is unreadable:
  - mark the note `ordering_status: unresolved`
  - route to `/unresolved/decode/`
  - log the missing or corrupt chunk

### 7.5 Output safety

To prevent corrupt output:

- write notes atomically to temporary files inside the export root, then rename
- never overwrite an existing completed note unless the batch is explicitly rerun
- never delete source files
- never mutate MemPalace databases
- if a batch fails mid-run, only incomplete temp files are discarded

## 8. Validation Strategy

### 8.1 Pre-export validation

Before any batch executes:

1. build a full manifest of planned note identities
2. verify every contributing record maps to exactly one planned note or one unresolved bucket
3. verify known-root normalization for every planned canonical note
4. verify there are no unresolved output path collisions after suffix rules

### 8.2 Per-note validation

For each source-backed note:

1. hash the exact source payload before wrapping it
2. write `source_sha256` for the raw source bytes and `content_sha256` for the embedded fenced payload
3. after write, re-read the note and verify the fenced content payload hashes to `content_sha256`
4. verify drawer map chunk indexes are sorted and complete for the grouped drawer set

For each drawer-fallback or derived note:

1. verify chunk labels are strictly ordered by `chunk_index`
2. verify the number of emitted chunk blocks equals the number of selected unique chunk keys
3. hash each exact emitted chunk payload
4. verify every contributing drawer appears in `Drawer Map`

### 8.3 Batch validation

After every batch:

1. compare written note count to planned note count
2. compare total written bytes to projected range
3. verify every batch manifest entry has:
   - output path
   - content hash
   - status
4. verify every skipped note has a logged reason

### 8.4 End-to-end validation

At the end of the full export:

1. output note count must equal manifest note count plus unresolved note count
2. every input drawer id from `embeddings.id` must appear in either:
   - one exported note's drawer map, or
   - one unresolved issue entry
3. every `embedding_id` must be recoverable from the export metadata
4. every canonical source-backed note must retain both:
   - `source_sha256` matching the on-disk source bytes used during export
   - `content_sha256` matching the embedded fenced payload in the note
5. no compressed drawer may appear in canonical live note content
6. no note may be missing its provenance fields

### 8.5 Success criteria

The reconstruction is valid only if all of the following hold:

- files are complete
- ordering is deterministic and auditable
- no content is silently dropped
- every exported note can be traced back to its source drawers
- canonical live content and derived compressed content remain separated

## Execution Decision For Phase 3

When execution begins later, the default run mode should be:

- export canonical live notes only
- use source-backed bodies wherever the source file exists
- use drawer-fallback only for missing source paths
- keep compressed notes disabled unless explicitly included as a separate derived namespace

This is the only plan supported by the observed data that is loss-aware, deterministic, and safe for Obsidian import.
