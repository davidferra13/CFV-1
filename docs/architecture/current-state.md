# ChefFlow V1 - Current State Assessment

Generated: 2026-03-26

## Executive Summary

ChefFlow is a Next.js application that has grown to ~50GB across 7 directory copies, with ~14GB of build artifacts and dead scaffolds inside the main repo alone. The codebase is functional but severely fragmented: features exist in code that are not visible in the UI, multiple "environments" duplicate the entire repo, abandoned experiments sit alongside production code, and instruction files contradict each other.

There are zero real users. All data is mock/seed. This is a single-developer system.

## 1. Filesystem Fragmentation

### 7 Copies of ChefFlow on Disk

| Directory               | Size (est.)                                  | Purpose                         | Git Repo       | Status                         |
| ----------------------- | -------------------------------------------- | ------------------------------- | -------------- | ------------------------------ |
| `CFv1`                  | ~15GB (6.5GB .next, 2.6GB tauri, 5.1GB heap) | Main development                | Yes            | **Active - source of truth**   |
| `CFv1-beta`             | ~5.4GB                                       | Beta deployment copy            | No             | **Redundant** - rsync of CFv1  |
| `CFv1-prod`             | ~5.4GB                                       | Prod deployment copy            | No             | **Redundant** - rsync of CFv1  |
| `CFv1-refine`           | ~6.3GB                                       | Experimental nav refactor       | Yes (separate) | **Stale** - last commit Mar 21 |
| `CFv1-openclaw-clone`   | ~5GB+                                        | OpenClaw integration experiment | Yes (separate) | **Abandoned**                  |
| `CFv1-openclaw-sandbox` | ~48MB                                        | OpenClaw sandbox                | No             | **Abandoned**                  |
| `CFv1-archive`          | ~556KB                                       | Old documentation               | No             | **Obsolete**                   |
| `CFv1.7z`               | Unknown                                      | Compressed archive              | N/A            | **Obsolete**                   |

**Total estimated disk usage: ~40-50GB for what is a single Next.js app.**

### Inside CFv1 - Dead Weight

| Item                                    | Size     | Status                                    |
| --------------------------------------- | -------- | ----------------------------------------- |
| `.next/` (build cache)                  | 6.5GB    | Regenerated on every build                |
| `src-tauri/target/` (Rust build)        | 2.6GB    | Unused Tauri scaffold                     |
| `Heap.*.heapsnapshot`                   | 5.1GB    | One-time debug artifact                   |
| `mission-control.log`                   | 79MB     | Stale log                                 |
| `android/`                              | 408KB    | Unused Capacitor scaffold                 |
| `ios/`                                  | 302KB    | Unused Capacitor scaffold                 |
| `pages/`                                | 3KB      | Legacy Pages Router (app uses App Router) |
| `worker/`                               | 8KB      | Unused edge worker scaffold               |
| `messages/` (i18n JSON)                 | 32KB     | Unused - app is English only              |
| `i18n/`                                 | 4KB      | Unused i18n config                        |
| `plans/`                                | 176KB    | Historical planning docs                  |
| `.next-dev-pw-*` (31 dirs)              | Variable | Stale Playwright temp dirs                |
| `tmp_*.*` (66 files)                    | Variable | Stale temp/debug files                    |
| `backup-*.sql` (9 files)                | ~2MB     | Old DB backups in root                    |
| `build-*.log`, `dev-*.log`, `tsc-*.log` | Variable | Stale build logs                          |

## 2. Instruction File Conflicts

### CLAUDE.md (root, 1500+ lines)

- **Mandates 3-environment architecture** (dev/beta/prod on 3 ports)
- **Contains 106 em-dashes** while having a "ZERO TOLERANCE" rule against em-dashes
- References files that don't exist (`CHEFFLOW_V1_SCOPE_LOCK.md`, `memory/action-inventory.md`)
- Defines multi-agent mode, deploy scripts, session close-out procedures for a system that doesn't need them

### AGENTS.md (root)

- Overlaps ~70% with CLAUDE.md (same rules, different wording)
- Redundant document

### MEMORY.md (root)

- References 10+ memory files (`memory/*.md`) that don't exist on disk
- The memory directory only contains `memory/runtime/remy.json` (empty)

### README.md (root)

- References non-existent `CHEFFLOW_V1_SCOPE_LOCK.md`

### Key Conflicts

1. CLAUDE.md says 3 environments are mandatory; reality is this is a single-dev system with zero users
2. CLAUDE.md says "deploy to beta AND production always"; this creates redundant copies
3. Multi-agent mode rules exist for a workflow that creates more problems than it solves
4. Memory index references files that were never created or were lost

## 3. Code Structure Analysis

### What Exists (Scale)

- **670 page.tsx files** (routes)
- **1,394 component files** across 111 feature directories
- **1,608 lib modules** across 160+ domains
- **625 SQL migration files**
- **154 documentation files**

### Navigation Configuration

The sidebar (`nav-config.tsx`, 1,543 lines) defines:

- 8 primary hubs (Dashboard, Inbox, Events, Clients, Culinary, Finance, Operations, Growth)
- 13 collapsible nav groups with 100+ items
- 91 chef portal feature areas
- 25 admin features
- 6 client portal features
- 5 staff portal features

### Route Access

- 86 chef-protected path prefixes
- 22 public unauthenticated path prefixes
- Middleware enforces role-based access via JWT

### External Dependencies

- **PostgreSQL** (remote, Supabase-hosted) - used via postgres.js + Drizzle ORM (direct TCP, no Supabase SDK)
- **Supabase SDK** (`@supabase/supabase-js`) - only imported in 2 files: `scripts/lib/db.mjs` and `tests/e2e/client_rls_negative.spec.ts`. Not used in production code.
- **Ollama** (local) - private AI, all client data processing
- **Gemini** (cloud) - generic non-PII tasks only
- **Stripe** - payment processing (supporter contributions)
- **Auth.js v5** - authentication
- **Cloudflare Tunnels** - legacy local-port exposure that is being replaced as the public production path

### Deployment Direction Update - 2026-04-30

The target production standard is a dedicated self-hosted production node. Local development remains on the workstation at `localhost:3100`, while public production is served from a controlled Linux host through Caddy, `systemd`, immutable release directories, health checks, and symlink rollback. The developer workstation must not be the public production host.

## 4. Key Problems

### Problem 1: Multi-Environment Waste

Three copies of the same app (CFv1, CFv1-beta, CFv1-prod) consume ~26GB combined. For a single-developer system with zero users, this is pure overhead. The deploy scripts, rollback scripts, and Cloudflare tunnel infrastructure add complexity without value.

### Problem 2: Abandoned Scaffolds

Tauri (2.6GB), Capacitor (android/ios), Pages Router, i18n, edge workers - none of these are used. They were experiments that were never cleaned up.

### Problem 3: Instruction File Bloat

CLAUDE.md is 1500+ lines of rules written for a 10-agent parallel development workflow. Most of these rules are irrelevant for a single developer working on a single app. The rules themselves conflict and reference phantom files.

### Problem 4: Feature Visibility Unknown

With 670 routes and 100+ nav items, the relationship between "code that exists" and "features that are visible and working" is unclear without a full trace. Some routes may be orphaned. Some nav items may point to broken pages.

### Problem 5: Documentation Overhead

154 docs files, many generated by agents documenting their own work. These accumulate without cleanup. The app-complete-audit.md alone is 174KB.

## 5. What Works

Despite the fragmentation, the core system is sound:

- **Database architecture** is clean: layered migrations, immutable ledger, computed financials
- **Auth system** works: Auth.js v5 with role-based access, JWT sessions
- **AI architecture** is well-designed: Ollama for private data, Gemini for generic, clear boundary
- **Navigation config** is centralized and comprehensive
- **The app runs** on localhost:3100 and serves all routes

The problems are organizational and environmental, not architectural.
