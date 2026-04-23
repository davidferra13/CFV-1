# MemPalace Inventory Report

Date: 2026-04-21  
Scope: read-only analysis of `C:\Users\david\.mempalace\palace2` and `C:\Users\david\.mempalace\palace`

## 1. Executive Summary

MemPalace is stored as two local Chroma persistence roots:

- `palace2` = active root
- `palace` = legacy root

The active root contains:

- `293,511` live drawer records in `mempalace_drawers`
- `112,658` compressed records in `mempalace_compressed`
- `406,169` total indexed records

The legacy root contains:

- `44,422` live drawer records in `mempalace_drawers`

Combined exact counts:

- `337,933` live drawer records across both roots
- `112,658` compressed records
- `450,591` total indexed records

The strongest reconstruction key is `source_file`.  
`chunk_index` is fully reliable for ordered reconstruction inside each source file: every indexed source file in both roots has zero-based, unique, contiguous chunk indexes with no anomalies detected.

Critical finding:

- `mempalace_compressed` is not a raw duplicate of live drawer text. It overlaps all `112,658` active compressed chunk keys with live `cfv1` chunk keys, but `0` overlapping documents are identical.
- `chefflow-conversations` and `codex` conversation/session drawers are not guaranteed to be byte-exact mirrors of underlying `.jsonl` source files.
- A source-first export is the safest path for strict content preservation where source files still exist; drawer-text fallback is required only for missing source paths.

## 2. Physical Storage Structure

### `palace2`

Top-level contents:

- `chroma.sqlite3`
- `901596a2-e03c-4314-a7e9-e3d252aafb3c/`
- `d03d8f8e-1286-4af0-a0a6-490f09ec7d7c/`

Physical file counts:

- `.sqlite3`: `1`
- `.bin`: `8`
- `.pickle`: `2`

Each UUID directory contains:

- `header.bin`
- `data_level0.bin`
- `length.bin`
- `link_lists.bin`
- `index_metadata.pickle`

### `palace`

Top-level contents:

- `chroma.sqlite3`
- `a0c98c92-5cba-4f81-9c45-e0814ef89104/`

Physical file counts:

- `.sqlite3`: `1`
- `.bin`: `4`
- `.pickle`: `1`

### Chroma schema detected in both roots

Key tables:

- `collections`
- `segments`
- `embeddings`
- `embedding_metadata`
- `embedding_metadata_array`
- `collection_metadata`
- Chroma FTS / queue / maintenance tables

Observed content model:

- each drawer/compressed entry is a row in `embeddings`
- document text is stored in `embedding_metadata` under key `chroma:document`
- reconstruction metadata is also stored in `embedding_metadata`
- vector index files on disk are HNSW artifacts, not human-readable source content

## 3. Collection Breakdown

### `palace2`

| Collection | Segment type | Records |
| --- | --- | ---: |
| `mempalace_drawers` | metadata/sqlite | 293,511 |
| `mempalace_drawers` | vector/hnsw-local-persisted | 0 |
| `mempalace_compressed` | metadata/sqlite | 112,658 |
| `mempalace_compressed` | vector/hnsw-local-persisted | 0 |

### `palace`

| Collection | Segment type | Records |
| --- | --- | ---: |
| `mempalace_drawers` | metadata/sqlite | 44,422 |
| `mempalace_drawers` | vector/hnsw-local-persisted | 0 |

## 4. Wing Breakdown

### Active root: `palace2`

| Collection | Wing | Drawers | Distinct source files | Distinct rooms |
| --- | --- | ---: | ---: | ---: |
| `mempalace_drawers` | `chefflow-conversations` | 149,945 | 8,339 | 5 |
| `mempalace_drawers` | `cfv1` | 128,288 | 7,237 | 15 |
| `mempalace_drawers` | `codex-conversations` | 15,278 | 469 | 4 |
| `mempalace_compressed` | `cfv1` | 112,658 | 6,571 | 15 |

### Legacy root: `palace`

| Collection | Wing | Drawers | Distinct source files | Distinct rooms |
| --- | --- | ---: | ---: | ---: |
| `mempalace_drawers` | `chefflow-conversations` | 21,605 | 985 | 5 |
| `mempalace_drawers` | `codex-sessions` | 13,919 | 434 | 4 |
| `mempalace_drawers` | `cfv1` | 8,898 | 191 | 12 |

## 5. How Drawers Map To Higher-Level Units

### Canonical grouping signal

Every inspected record carries these keys:

- `wing`
- `source_file`
- `room`
- `filed_at`
- `chunk_index`
- `chroma:document`
- `added_by`

Additional keys:

- live conversation wings only: `ingest_mode=convos`, `extract_mode=general`
- compressed entries only: `original_tokens`, `compression_ratio`

### Mapping by wing

| Wing | Likely higher-level unit | Strong grouping key | Notes |
| --- | --- | --- | --- |
| `cfv1` | repo files / docs / scripts | `source_file` | source paths rooted at `C:\Users\david\Documents\CFv1` |
| `chefflow-conversations` | Claude conversations / conversation artifacts | `source_file` | mostly `.jsonl` under `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1` |
| `codex-conversations` | Codex archived sessions | `source_file` | all active files are `.jsonl` under `C:\Users\david\.codex\archived_sessions` |
| `codex-sessions` | legacy Codex archived sessions | `source_file` | same source path family as active Codex sessions |
| `mempalace_compressed / cfv1` | derived compressed file projections | `source_file` + `chunk_index` | not original text, should not be merged into canonical raw export body |

### Ordering reliability

`chunk_index` validation across every indexed source file:

| Root / collection / wing | Source files | Zero-based contiguous files | Ordering anomalies |
| --- | ---: | ---: | ---: |
| `palace2 / mempalace_drawers / cfv1` | 7,237 | 7,237 | 0 |
| `palace2 / mempalace_drawers / chefflow-conversations` | 8,339 | 8,339 | 0 |
| `palace2 / mempalace_drawers / codex-conversations` | 469 | 469 | 0 |
| `palace2 / mempalace_compressed / cfv1` | 6,571 | 6,571 | 0 |
| `palace / mempalace_drawers / cfv1` | 191 | 191 | 0 |
| `palace / mempalace_drawers / chefflow-conversations` | 985 | 985 | 0 |
| `palace / mempalace_drawers / codex-sessions` | 434 | 434 | 0 |

Conclusion:

- `source_file` is the correct grouping key
- `chunk_index` is the correct primary ordering key
- `filed_at` is useful as provenance and tie-break metadata, not as the main reconstruction order

### `room` is not a grouping key

Files with multiple `room` values:

| Root / wing | Source files | Multi-room source files | Max rooms in one file |
| --- | ---: | ---: | ---: |
| `palace2 / cfv1` | 7,237 | 0 | 1 |
| `palace2 / chefflow-conversations` | 8,339 | 6,071 | 5 |
| `palace2 / codex-conversations` | 469 | 424 | 4 |
| `palace / cfv1` | 191 | 0 | 1 |
| `palace / chefflow-conversations` | 985 | 769 | 5 |
| `palace / codex-sessions` | 434 | 389 | 4 |

Conclusion:

- for conversations/sessions, `room` behaves like classification or tagging
- grouping by `room` would incorrectly fragment many single source conversations into multiple output files

## 6. File Format Breakdown

### Active live drawers: `palace2 / mempalace_drawers`

#### `cfv1` distinct source files by extension

| Extension | Files |
| --- | ---: |
| `.ts` | 3,224 |
| `.tsx` | 2,855 |
| `.md` | 903 |
| `.py` | 88 |
| `.json` | 74 |
| `.sh` | 34 |
| `.js` | 27 |
| `.html` | 11 |
| `.txt` | 9 |
| `.yml` | 4 |
| `.css` | 2 |
| `.toml` | 2 |
| `.go` | 1 |
| `.java` | 1 |
| `.rb` | 1 |
| `.rs` | 1 |

#### `chefflow-conversations` distinct source files by extension

| Extension | Files |
| --- | ---: |
| `.jsonl` | 6,842 |
| `.txt` | 1,407 |
| `.md` | 78 |
| `.json` | 12 |

#### `codex-conversations` distinct source files by extension

| Extension | Files |
| --- | ---: |
| `.jsonl` | 469 |

### Active compressed: `palace2 / mempalace_compressed / cfv1`

| Extension | Files |
| --- | ---: |
| `.ts` | 2,946 |
| `.tsx` | 2,743 |
| `.md` | 713 |
| `.json` | 63 |
| `.sh` | 28 |
| `.py` | 27 |
| `.js` | 25 |
| `.html` | 11 |
| `.txt` | 9 |
| `.yml` | 3 |
| `.css` | 2 |
| `.toml` | 1 |

### Legacy live drawers: `palace / mempalace_drawers`

#### `cfv1`

| Extension | Files |
| --- | ---: |
| `.json` | 56 |
| `.md` | 51 |
| `.ts` | 49 |
| `.sh` | 15 |
| `.txt` | 10 |
| `.js` | 4 |
| `.yml` | 4 |
| `.sql` | 2 |

#### `chefflow-conversations`

| Extension | Files |
| --- | ---: |
| `.jsonl` | 887 |
| `.txt` | 95 |
| `.json` | 3 |

#### `codex-sessions`

| Extension | Files |
| --- | ---: |
| `.jsonl` | 434 |

## 7. Source Path Roots

Observed source path roots are cleanly separated by wing:

| Wing | Root path | Distinct source files |
| --- | --- | ---: |
| active `cfv1` | `C:\Users\david\Documents\CFv1` | 7,237 |
| active `chefflow-conversations` | `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1` | 8,339 |
| active `codex-conversations` | `C:\Users\david\.codex\archived_sessions` | 469 |
| active compressed `cfv1` | `C:\Users\david\Documents\CFv1` | 6,571 |
| legacy `cfv1` | `C:\Users\david\Documents\CFv1` | 191 |
| legacy `chefflow-conversations` | `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1` | 985 |
| legacy `codex-sessions` | `C:\Users\david\.codex\archived_sessions` | 434 |

## 8. Source File Availability

### Active root

| Collection / wing | Existing source files | Missing source files |
| --- | ---: | ---: |
| `mempalace_drawers / cfv1` | 6,694 | 543 |
| `mempalace_drawers / chefflow-conversations` | 7,863 | 476 |
| `mempalace_drawers / codex-conversations` | 469 | 0 |
| `mempalace_compressed / cfv1` | 6,029 | 542 |

### Legacy root

| Wing | Existing source files | Missing source files |
| --- | ---: | ---: |
| `cfv1` | 191 | 0 |
| `chefflow-conversations` | 748 | 237 |
| `codex-sessions` | 434 | 0 |

### Union counts

If deduped by exact `source_file` path only across active live + legacy:

- `16,205` distinct source files
- `15,130` existing source files
- `1,075` missing source files

If kept as `wing + source_file` export identities:

- `16,639` distinct export candidates
- `15,564` existing source-backed candidates
- `1,075` missing-path candidates

Missing active source files by extension:

| Collection / wing | Extension | Missing files |
| --- | --- | ---: |
| `mempalace_drawers / cfv1` | `.ts` | 453 |
| `mempalace_drawers / cfv1` | `.tsx` | 86 |
| `mempalace_drawers / cfv1` | `.css` | 1 |
| `mempalace_drawers / cfv1` | `.md` | 1 |
| `mempalace_drawers / cfv1` | `.py` | 1 |
| `mempalace_drawers / cfv1` | `.toml` | 1 |
| `mempalace_drawers / chefflow-conversations` | `.txt` | 329 |
| `mempalace_drawers / chefflow-conversations` | `.jsonl` | 144 |
| `mempalace_drawers / chefflow-conversations` | `.json` | 3 |

## 9. Relationship Between Active, Legacy, and Compressed Layers

### Active vs compressed

Exact overlap checks inside `palace2`:

- overlapping `wing + source_file + chunk_index` keys: `112,658`
- overlapping `wing + source_file` keys: `6,571`
- same documents among overlapping chunk keys: `0`
- different documents among overlapping chunk keys: `112,658`

Compressed metadata stats:

| Metric | Value |
| --- | ---: |
| entries | 112,658 |
| min `original_tokens` | 17 |
| avg `original_tokens` | 229.15 |
| max `original_tokens` | 266 |
| min `compression_ratio` | 0.4 |
| avg `compression_ratio` | 6.9805 |
| max `compression_ratio` | 19.0 |

Conclusion:

- compressed entries are derived alternate texts keyed to a subset of active `cfv1` chunk identities
- they should not be merged into a canonical raw-content export body

### Active vs legacy

Exact overlap checks:

- overlapping chunk keys with same `wing + source_file + chunk_index`: `20,519`
- legacy-only chunk keys: `23,903`
- overlapping `wing + source_file`: `1,016`
- legacy-only `wing + source_file`: `594`
- overlapping `source_file` paths ignoring wing label: `1,450`

Important identity note:

- active uses `codex-conversations`
- legacy uses `codex-sessions`
- all `434` legacy Codex source paths overlap active Codex source paths when compared by `source_file` path alone

Conclusion:

- legacy is not a pure duplicate
- but it is also not isolated
- it must be kept provenance-aware during export

## 10. Ingestion Windows

`filed_at` ranges:

| Root / collection / wing | Earliest filed_at | Latest filed_at |
| --- | --- | --- |
| `palace2 / mempalace_compressed / cfv1` | `2026-04-10T16:28:39.063791` | `2026-04-10T22:13:43.905119` |
| `palace2 / mempalace_drawers / cfv1` | `2026-04-10T16:28:39.063791` | `2026-04-18T16:59:35.613441` |
| `palace2 / mempalace_drawers / chefflow-conversations` | `2026-04-11T04:06:56.872742` | `2026-04-18T18:30:30.596712` |
| `palace2 / mempalace_drawers / codex-conversations` | `2026-04-11T23:06:15.653849` | `2026-04-12T02:40:59.702018` |
| `palace / mempalace_drawers / cfv1` | `2026-04-07T18:01:41.687306` | `2026-04-07T18:57:16.269721` |
| `palace / mempalace_drawers / chefflow-conversations` | `2026-04-07T16:59:15.137852` | `2026-04-07T18:56:50.738432` |
| `palace / mempalace_drawers / codex-sessions` | `2026-04-07T16:59:06.827042` | `2026-04-07T19:06:26.853101` |

## 11. Spot Checks Against Live Source Files

These checks were used only to validate reconstruction strategy, not to interpret content.

| Sample | Joined live drawer text length | Raw source length | Exact match |
| --- | ---: | ---: | --- |
| `cfv1 / .chefflow-windows.json` | 155 | 156 | No |
| `codex-conversations / rollout-2026-01-17T15-34-09-...jsonl` | 857,700 | 858,011 | No |
| `chefflow-conversations / 00495879-63f5-4ce5-89f6-4913429568ce.jsonl` | 6,731 | 9,411,442 | No |

Interpretation of those checks:

- `cfv1` live drawers can be very close to source text but are not guaranteed byte-exact
- active Codex session drawers are not byte-exact mirrors either
- active Claude conversation drawers can be heavily reduced semantic extracts rather than raw `.jsonl`

## 12. Grouping Strategy Options

### Option A: Drawer-first reconstruction

Method:

- group by `wing + source_file`
- order by `chunk_index`
- concatenate `chroma:document`
- include drawer IDs inline

Pros:

- pure MemPalace projection
- direct drawer traceability
- works even when source file path is missing

Cons:

- fails strict content preservation for many source types
- conversation/session wings are not guaranteed raw transcript mirrors
- active compressed layer would inject derived text unless explicitly separated

Assessment:

- not safe as the default canonical export strategy

### Option B: Source-file-first reconstruction

Method:

- group by `source_file` or `wing + source_file`
- read original source file content from disk
- attach ordered drawer references and metadata as provenance

Pros:

- best match to strict lossless content preservation
- avoids semantic truncation in conversation/session drawers
- keeps drawer traceability without using drawers as the authoritative text body

Cons:

- requires source file still to exist
- `1,075` distinct source paths are missing and would need fallback handling
- must preserve provenance when one source path appears in both active and legacy indexes

Assessment:

- safest default for canonical export

### Option C: Hybrid export

Method:

- use source-file-first export where source file exists
- use drawer-first reconstruction only for missing source paths
- keep compressed entries in a clearly separate derived namespace

Pros:

- satisfies strict preservation for the large majority of content
- still covers missing paths
- keeps compressed data available without contaminating canonical raw bodies

Cons:

- mixed provenance modes must be clearly labeled

Assessment:

- best overall strategy

## 13. Risks And Ambiguities

1. `mempalace_compressed` is derived text, not raw source text.
   Every overlapping compressed chunk differs from its active live counterpart.

2. Conversation/session drawers are not uniformly raw transcript slices.
   `chefflow-conversations` in particular appears to store extracted semantic text rather than full `.jsonl` payloads.

3. Some source paths no longer exist.
   Exact count by source path union: `1,075` missing files.

4. Legacy and active roots partially overlap.
   Blind merging would lose provenance and may duplicate source-backed exports.

5. Wing naming is not fully stable across roots.
   `codex-sessions` in legacy aligns with `codex-conversations` in active by source path.

6. Very large source files exist.
   Maximum chunks per file observed:
   - active live: `5,919`
   - active compressed: `5,919`
   - legacy live: `2,962`

## 14. Recommended Reconstruction Strategy

Recommended for Phase 2:

1. Treat `source_file` as the canonical reconstruction unit for conversations, repo files, and sessions.

2. Use a hybrid export:
   - source-file-first for every existing source path
   - drawer-text fallback only for missing source paths

3. Keep provenance explicit on every exported note:
   - root: `palace2` or `palace`
   - collection: `mempalace_drawers` or `mempalace_compressed`
   - wing
   - source path
   - ordered drawer IDs
   - chunk indexes
   - filed-at range

4. Do not use `room` to split files.
   Use it only as metadata/tags or per-chunk annotations.

5. Do not merge `mempalace_compressed` into the canonical content body.
   Export it, if approved later, as a separate derived companion layer for the `cfv1` subset.

6. Preserve active and legacy provenance even when deduping by source path.
   The safest model is one canonical note body per source path, plus explicit index references showing whether it was present in active, legacy, or both.

7. Expected output scale for a source-first export:
   - `16,205` files if deduped by source path across active live + legacy
   - `16,639` files if kept as separate `wing + source_file` identities
   - `22,776` if compressed is later added as a separate companion layer on top of path-deduped live/legacy export

## 15. Recommendation Summary

Recommended default for approval:

- canonical export body = original source file content
- grouping = `source_file`
- ordering inside provenance list = `chunk_index`
- missing-path fallback = ordered drawer text
- compressed collection = separate derived namespace only
- active and legacy = provenance-aware, not blindly merged

This is the only strategy supported by the observed data that preserves content correctly while still retaining traceability back to original drawers.
