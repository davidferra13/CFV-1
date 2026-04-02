# ChefFlow Repo Structure and Navigation Map

Date: 2026-04-02
Status: reference-only, foundational archive
Purpose: canonical map of the full workspace structure for future research and navigation

## Why This Exists

The current-state baseline explains what ChefFlow is and what it has built, but it is still product-centric. This document complements that baseline by mapping the actual workspace structure so a future agent or teammate can understand the whole folder without re-measuring or guessing.

This file is intentionally folder-centric, not feature-centric.

## Validation Summary

Measured on 2026-04-02:

- total size: **46.853 GiB**
- total files: **209,301**
- total directories: **38,103**

Requested validation bounds:

- size: 45-50 GiB
- files: 190,000-230,000
- directories: 34,000-42,000

Result: all three measurements are within the requested bounds.

## Reading Rule

Use this document to understand where things live.

Use [ChefFlow Current State Baseline](./2026-04-02-chefflow-current-state-baseline.md) to understand what the system is trying to do.

## Top-Level Structure by Role

The top level of the workspace falls into four practical categories:

1. Product source and business logic
2. Reference and research material
3. Operational state, integration mirrors, and local assets
4. Generated artifacts, caches, and QA outputs

## 1. Product Source and Business Logic

These directories are the primary source-of-truth for application behavior.

| Folder        | Role                                           | Notes                                                                                                                                 |
| ------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `app/`        | Next.js route tree                             | Main delivery surface definitions, including chef, public, client, admin, partner, staff, API, embed, kiosk, and related route groups |
| `components/` | Shared UI layer                                | Reusable React components used across surfaces                                                                                        |
| `lib/`        | Business logic and services                    | Largest authored logic area outside routes; domain modules, service code, helpers, and integrations                                   |
| `database/`   | Schema and migration history                   | SQL migrations plus database-related assets                                                                                           |
| `docs/`       | Product, architecture, spec, and research docs | Human reference layer for the repo                                                                                                    |
| `scripts/`    | Tooling and operational scripts                | Verification, migration, launch, audit, sync, and utility scripts                                                                     |
| `tests/`      | Automated verification                         | Playwright, unit, integration, and other testing assets                                                                               |
| `public/`     | Static assets                                  | Logos, manifest, offline assets, public metadata, and other shipped static files                                                      |
| `types/`      | Shared type declarations                       | TypeScript support files and generated type helpers                                                                                   |
| `data/`       | Structured runtime and report artifacts        | Stored reports and semi-persistent generated data used by workflows or audits                                                         |
| `hooks/`      | Shared React hooks                             | Small support area for reusable client hooks                                                                                          |
| `features/`   | Feature registry support                       | Currently minimal; contains `registry.ts` rather than a large feature module tree                                                     |

### Source footprint snapshot

- `app/`: 6.74 MB, 1,393 files, 1,181 directories
- `components/`: 10.38 MB, 1,494 files, 144 directories
- `lib/`: 22.03 MB, 1,710 files, 257 directories
- `database/`: 2.40 MB, 678 files, 4 directories
- `docs/`: 6.80 MB, 417 files, 9 directories
- `scripts/`: 49.81 MB, 360 files, 26 directories
- `tests/`: 48.27 MB, 918 files, 45 directories
- `public/`: 77.35 MB, 65 files, 7 directories

## 2. Reference and Research Material

These folders are reference-oriented rather than runtime-critical.

| Folder           | Role                                       | Notes                                                        |
| ---------------- | ------------------------------------------ | ------------------------------------------------------------ |
| `docs/research/` | Long-lived research library                | External research, audits, and foundational archive material |
| `memory/`        | Small project memo area                    | Lightweight project notes plus a `runtime/` subfolder        |
| `prompts/`       | Prompt templates and research instructions | Reusable prompt materials and queue prompts                  |
| `backups/`       | Backup artifacts                           | Snapshot-like support directory                              |

### Important clarification

`memory/` is not a major state store. It is small and currently acts more like a memo shelf than a core data directory.

## 3. Operational State, Mirrors, and Local Assets

These folders matter for local operation, integrations, or local content, but they are not the main product source.

| Folder              | Role                              | Notes                                                                          |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| `.claude/`          | Claude/Codex local workflow state | Large local tooling area with agents, skills, config, and cached support files |
| `.auth/`            | Local auth state                  | Test account and auth/session support material                                 |
| `.cloudflared/`     | Tunnel config/state               | Local Cloudflare tunnel support                                                |
| `.openclaw-build/`  | OpenClaw mirrored build files     | Small local mirror of OpenClaw-side assets and service files                   |
| `.openclaw-deploy/` | OpenClaw deployment artifacts     | Larger sync/deploy mirror and captured deployment state                        |
| `.openclaw-temp/`   | Temporary OpenClaw assets         | Large temporary OpenClaw working area                                          |
| `storage/`          | Local stored assets               | Contains chef profile images and portfolio photos                              |
| `davidfood/`        | Local image asset set             | Appears to be a standalone image collection, not a code directory              |
| `.patches/`         | Patch support                     | Tiny operational support directory                                             |
| `.constraints/`     | Local constraint metadata         | Small tooling/support folder                                                   |

### Operational footprint snapshot

- `.claude/`: 0.814 GiB, 32,204 files, 8,547 directories
- `.auth/`: 0.090 GiB, 49 files, 5 directories
- `.openclaw-deploy/`: 0.045 GiB, 4,252 files, 372 directories
- `.openclaw-temp/`: 0.327 GiB, 3 files
- `storage/`: 0.001 GiB, 12 files, 4 directories

## 4. Generated Artifacts, Caches, and QA Output

These folders dominate disk usage but are not the authoritative source of product intent.

| Folder family                                                                                                                              | Role                              | Notes                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------ |
| `.next*`                                                                                                                                   | Next.js build and probe artifacts | Main cause of repo size growth                         |
| `node_modules/`                                                                                                                            | Installed dependencies            | Standard dependency tree                               |
| `.git/`                                                                                                                                    | Repository history and objects    | Large because of long-running history                  |
| `.ts-trace/`                                                                                                                               | TypeScript trace output           | Debug artifact area                                    |
| `test-results/`, `results/`                                                                                                                | Test run outputs                  | Result bundles from verification work                  |
| `screenshots/`, `qa-screenshots/`, `.qa-screenshots/`, `test-screenshots/`, `tmp-screenshots/`, `screenshots-e2e-verify/`, `.screenshots/` | Screenshot evidence sprawl        | Important for debugging, but fragmented for navigation |
| `.tmp-qa/`                                                                                                                                 | Temporary QA output               | Small transient support area                           |

### Largest generated contributors

- `.next/`: 10.313 GiB
- `.next-test/`: 6.520 GiB
- `.next-verify-verify-47376-1772737124159/`: 5.658 GiB
- `.next-verify-verify-36364-1772738832833/`: 5.045 GiB
- `.next-verify-verify-29908-1772755092884/`: 4.985 GiB
- `.next-verify-verify-35932-1772756163856/`: 4.984 GiB
- `.next-dev/`: 1.868 GiB
- `.next-web-beta-probe/`: 1.003 GiB
- `.next-dev-pin-smoke/`: 0.424 GiB
- `.next-runtime-probe-1773704223873/`: 0.246 GiB

Combined `.next*` footprint: **41.046 GiB**

## Folder Navigation Map

If you are trying to answer a question, start here:

### "How does the product work?"

Start with:

- `docs/`
- `app/`
- `lib/`
- `components/`

### "What routes and surfaces exist?"

Start with:

- `app/`
- `docs/feature-inventory.md`
- `docs/system-architecture.md`

### "Where is the business logic?"

Start with:

- `lib/`
- `app/api/`
- `database/`

### "Where are scripts, checks, and automation?"

Start with:

- `scripts/`
- `tests/`
- `app/api/scheduled/`
- `app/api/v2/`

### "Where is reference research?"

Start with:

- `docs/research/`
- `docs/research/foundations/`

### "Why is the repo so large?"

Start with:

- `.next*`
- `node_modules/`
- `.git/`
- `.claude/`

## Areas That Are Structurally Clear

These parts of the repo are easy to interpret:

- `app/`, `components/`, `lib/`, `database/`, `docs/`, `scripts/`, `tests/`
- the research library inside `docs/research/`
- the distinction between authored source and generated `.next*` residue

## Areas That Are Structurally Incomplete or Ambiguous

These are the places where navigation can still be improved:

### 1. Screenshot and evidence directories are fragmented

There are many screenshot and evidence folders at the root:

- `screenshots/`
- `.screenshots/`
- `qa-screenshots/`
- `.qa-screenshots/`
- `test-screenshots/`
- `tmp-screenshots/`
- `screenshots-e2e-verify/`
- `results/`
- `test-results/`

These are understandable individually, but collectively they are harder to navigate than they need to be.

### 2. Some top-level support folders are under-explained by name alone

These names do not clearly communicate their purpose unless you inspect them:

- `davidfood/`
- `memory/`
- `prompts/`
- `.constraints/`
- `.patches/`
- `.openclaw-build/`
- `.openclaw-deploy/`
- `.openclaw-temp/`

### 3. `features/` is smaller than its name suggests

`features/` currently contains only `registry.ts`. That is not wrong, but it can mislead someone expecting a large feature-module tree.

### 4. `config/` currently provides no meaningful structure

`config/` exists but is empty. As a navigation landmark, it is presently not useful.

### 5. Root-level loose files remain noisy

The root contains many logs, screenshots, probes, test scripts, and operational artifacts alongside canonical files like `package.json`, `README.md`, `CLAUDE.md`, and config files. This does not break understanding, but it weakens discoverability.

## Practical Interpretation

The workspace is structurally understandable once grouped, but it is not self-explanatory if someone only scans the root.

The most important truth is:

- the system itself lives in `app/`, `components/`, `lib/`, `database/`, `docs/`, `scripts/`, and `tests/`
- the enormous storage footprint mostly lives in `.next*`, `node_modules/`, `.git/`, and `.claude/`
- several operational and evidence directories exist at the root and should be treated as support material, not primary product structure

## Recommended Reading Order for New Agents

1. [ChefFlow Current State Baseline](./2026-04-02-chefflow-current-state-baseline.md)
2. `docs/research/README.md`
3. `docs/system-architecture.md`
4. `docs/feature-inventory.md`
5. `app/`, `lib/`, and `components/`
6. this repo-structure map when navigation or storage questions come up

## Supersession Rule

If the top-level workspace changes materially, create a new dated repo-structure map rather than silently overwriting this one. Update the research index and link the new map from the current-state baseline.
