# ChefFlow Archive Graveyard Inventory (BillyBob + Legacy Roots)

Capture window: February 27-28, 2026
Source: Local filesystem scan on this machine
Primary objective: Preserve all known archive roots and scrapped project variants related to ChefFlow, with special focus on the `Billybob` graveyard.

## Scope

- This inventory captures archive structures and density signals (folder counts, file counts, bytes, modification times).
- It is forensic metadata, not a full file-content export.

## Primary External Archive Root

Path: `C:\Users\david\Desktop\_ChefFlow_OLD`

| Name                                  | Type |  Files |      Bytes | Size (GB) | Last Modified       |
| ------------------------------------- | ---- | -----: | ---------: | --------: | ------------------- |
| Billybob                              | dir  | 185702 | 4160689846 |     3.875 | 2026-02-11 14:18:53 |
| ChefFlow                              | dir  |  51211 |  971790281 |     0.905 | 2026-02-13 04:38:30 |
| ChefFlow_MASTER                       | dir  |  51471 |  954356149 |     0.889 | 2026-02-13 04:41:52 |
| ChefFlow Tools                        | dir  |      8 |      45501 |         0 | 2026-02-22 21:47:44 |
| ChefFlow_Archive_2026-02-13           | dir  |      5 |       1780 |         0 | 2026-02-13 04:26:15 |
| ChefFlow_uncommitted_2026-02-13.patch | file |      1 |      90846 |         0 | 2026-02-13 04:15:18 |
| ChefFlow Dev Server.bat               | file |      1 |        245 |         0 | 2026-02-22 21:55:04 |
| ChefFlow.lnk                          | file |      1 |       1503 |         0 | 2026-02-13 04:25:43 |
| Ping Pi Ollama.lnk                    | file |      1 |        904 |         0 | 2026-02-22 23:03:32 |
| Raspberry Pi Desktop.bat              | file |      1 |        371 |         0 | 2026-02-23 19:48:17 |
| Restart ChefFlow Beta.bat             | file |      1 |        456 |         0 | 2026-02-26 13:55:38 |
| Restart ChefFlow Pi Servers.bat       | file |      1 |        186 |         0 | 2026-02-25 12:04:19 |

## BillyBob Graveyard (Full Version Census)

Path: `C:\Users\david\Desktop\_ChefFlow_OLD\Billybob`

Totals across BillyBob1-14:

- Versions: 14
- Files: 185,700
- Bytes: 4,160,662,296
- Approx size: 3.87 GB

| Version    | Directories | Files |      Bytes | Size (GB) | Last Modified       |
| ---------- | ----------: | ----: | ---------: | --------: | ------------------- |
| BillyBob1  |           0 |    40 |     273669 |         0 | 2026-01-16 13:34:56 |
| BillyBob2  |        2686 | 25297 | 1030030110 |     0.959 | 2026-01-31 15:33:46 |
| BillyBob3  |          13 |    49 |      60417 |         0 | 2026-01-08 23:37:45 |
| BillyBob4  |        2748 | 26018 |  782504455 |     0.729 | 2026-01-27 21:28:34 |
| BillyBob5  |        8174 | 60711 |  526665544 |      0.49 | 2026-01-02 21:19:44 |
| BillyBob6  |           1 |     1 |         54 |         0 | 2026-01-31 21:28:11 |
| BillyBob7  |          21 |    30 |     271731 |         0 | 2026-01-14 22:15:51 |
| BillyBob8  |        2927 | 27474 |  813627095 |     0.758 | 2026-01-27 18:03:23 |
| BillyBob9  |        1607 | 12965 |  299234122 |     0.279 | 2025-08-08 16:26:42 |
| BillyBob10 |        2069 | 20118 |  406848642 |     0.379 | 2026-01-17 12:15:02 |
| BillyBob11 |           0 |     1 |    1822933 |     0.002 | 2025-09-03 02:54:14 |
| BillyBob12 |           1 |     1 |         54 |         0 | 2026-01-23 18:15:35 |
| BillyBob13 |           1 |     1 |         54 |         0 | 2026-02-12 03:37:22 |
| BillyBob14 |        1634 | 12994 |  299323416 |     0.279 | 2025-08-08 15:34:56 |

Top 5 heaviest BillyBob versions by bytes:

1. BillyBob2 (1,030,030,110 bytes)
2. BillyBob8 (813,627,095 bytes)
3. BillyBob4 (782,504,455 bytes)
4. BillyBob5 (526,665,544 bytes)
5. BillyBob10 (406,848,642 bytes)

## Additional External Archive Root

Path: `C:\Users\david\Desktop\Archive PRojects`

| Name                        | Type | Notes                                                              |
| --------------------------- | ---- | ------------------------------------------------------------------ |
| OLD_Project_V1_DO_NOT_TOUCH | dir  | 10,646 files; 272,134,220 bytes; last modified 2026-01-26 12:05:25 |
| Chef Flow Master 1.0.lnk    | file | Shortcut in archive container                                      |

## Repo-Local Archive Loci (Inside CFv1)

- `supabase/migrations/archive/`
  - `20260213000001_initial_schema.sql`
  - `20260213000002_rls_policies.sql`
  - `20260214000000_add_menu_dishes.sql`
- Legacy extraction and archive evidence docs:
  - `docs/LEGACY_CODEBASE_EXTRACTION.md`
  - `docs/google-drive-chefflow-verbatim-capture-2026-02-28.md`
  - `docs/google-ai-studio-archived-chefflow-verbatim-capture-2026-02-28.md`
  - `docs/chatgpt-chefflow-timeline-verbatim-capture-2026-02-28.md`

## Interpretation Notes

- The BillyBob graveyard is not trivial leftover material; it is a large, multi-version prototype lineage with substantial volume.
- This archive evidence supports the claim that major effort occurred before current repo stability and before consistent commit history.
