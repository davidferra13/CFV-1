# Research: NPM Supply Chain & Dependency Security Audit

> **Date:** 2026-03-29
> **Question:** What is the npm supply chain attack surface, are there vulnerable dependencies, hardcoded secrets, or leaked credentials?
> **Status:** complete

## Summary

The ChefFlow repository has **one critical security issue**: the GitHub repo (`davidferra13/CFV1`) is **public** and contains the developer's **real account password** (`[REDACTED]` for `davidferra13@gmail.com`) hardcoded in 5 committed files across git history. This password must be rotated immediately. Additionally, there are 17 npm vulnerabilities (6 moderate, 11 high), one dependency (`xlsx`) with no fix available and known prototype pollution, and 49+ files with hardcoded agent/test credentials.

---

## CRITICAL: Exposed Developer Password in Public Repo

**Severity: CRITICAL - Requires immediate action**

The GitHub repository is **public** (confirmed via `https://api.github.com/repos/davidferra13/CFV1` returning `"private": false, "visibility": "public"`).

The developer's **real email and password** are hardcoded in these committed files:

| File                            | Content                                                   |
| ------------------------------- | --------------------------------------------------------- |
| `scripts/app-walkthrough.ts:23` | `email: 'davidferra13@gmail.com', password: '[REDACTED]'` |
| `scripts/test-auth.ts:9`        | `email: 'davidferra13@gmail.com', password: '[REDACTED]'` |
| `tests/auth-test.mjs`           | Same credentials                                          |
| `tests/full-walkthrough.mjs`    | Same credentials                                          |
| `tests/debug-signin.mjs`        | Same credentials                                          |

These files are in git history (commits `58985670`, `7226678c`). Even if deleted from the working tree, they remain accessible in the public git history.

**Required actions:**

1. **Rotate the password immediately** (ChefFlow app account, and if reused, Gmail and any other service)
2. Either make the repo private, or use `git filter-repo` / BFG Repo Cleaner to purge the password from all history
3. Move all credentials to `.auth/` directory (already gitignored) or `.env` files

---

## Hardcoded Test/Agent Credentials (49+ files)

The agent password `AgentChefFlow!2026` appears in **49 files** across scripts, tests, and harnesses. While these are test account credentials (not the developer's personal account), they are exposed in a public repo.

Files with agent credentials include: `scripts/test-remy.mjs`, `scripts/beta-login.mjs`, `tests/security/access-control-*.mjs`, `scripts/launcher/open-login.mjs`, and many more.

Other hardcoded passwords found:

- `CHEF.jdgyuegf9924092.FLOW` in 7 files (local dev seed scripts, docs)
- `DemoChefFlow!2026`, `DemoClientFlow!2026`, `DemoStaffFlow!2026`, etc. in `scripts/setup-demo-accounts.ts`
- `E2eClientTest!2026`, `E2eChefTest!2026` in test harnesses

**Recommendation:** Move all credentials to `.env` or `.auth/` files. Reference `process.env.AGENT_PASSWORD` instead of hardcoding.

---

## NPM Vulnerability Report

`npm audit` reports **17 vulnerabilities: 6 moderate, 11 high**.

### High Severity

| Package                          | Vulnerability                                                                                        | Fix Available?                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `next` (14.x)                    | DoS via Image Optimizer, HTTP request smuggling, disk cache exhaustion, insecure RSC deserialization | Yes, but breaking (Next.js 16.x)                 |
| `glob` (10.x)                    | Command injection via `--cmd` with `shell:true`                                                      | Yes, but breaking (`eslint-config-next` upgrade) |
| `xlsx` (0.18.5)                  | Prototype pollution, ReDoS                                                                           | **No fix available** (last release: March 2022)  |
| `serialize-javascript` (<=7.0.4) | RCE via RegExp.flags, CPU exhaustion DoS                                                             | Yes, but breaking (`next-pwa` upgrade)           |
| `picomatch` (<=2.3.1)            | Method injection in POSIX character classes, ReDoS                                                   | Yes, via `npm audit fix`                         |

### Moderate Severity

| Package                      | Vulnerability                                    | Fix Available?                              |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------- |
| `brace-expansion` (<=1.1.12) | Zero-step sequence causes hang/memory exhaustion | Yes, via `npm audit fix`                    |
| `esbuild` (<=0.24.2)         | Dev server allows any website to send requests   | Yes, but breaking (`drizzle-kit` downgrade) |
| `yaml` (2.0.0-2.8.2)         | Stack overflow via deeply nested YAML            | Needs manual upgrade                        |

### Special Concern: `xlsx` (SheetJS)

- **Last published:** March 2022 (4 years ago)
- **Known vulnerabilities:** Prototype pollution (GHSA-4r6h-8v6p-xvw6), ReDoS (GHSA-5pgg-2g8v-p4x9)
- **No fix available** from npm. The SheetJS team moved to a proprietary distribution model.
- **Recommendation:** Replace with `xlsx-populate`, `exceljs`, or `sheetjs` (from their CDN if license permits). This is the highest-risk dependency with no remediation path via npm.

---

## Postinstall Scripts in Dependencies

5 packages have `postinstall` scripts that execute code during `npm install`:

| Package         | Postinstall Command                                 | Risk Assessment                                                     |
| --------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| `core-js`       | `node -e "try{require('./postinstall')}catch(e){}"` | **Low** - well-known polyfill, displays funding message             |
| `esbuild`       | `node install.js`                                   | **Low** - downloads platform-specific binary (standard for esbuild) |
| `protobufjs`    | `node scripts/postinstall`                          | **Low** - downloads prebuilt binaries                               |
| `tesseract.js`  | `opencollective-postinstall \|\| true`              | **Low** - displays opencollective funding message                   |
| `unrs-resolver` | `napi-postinstall unrs-resolver 1.11.1 check`       | **Low** - checks for prebuilt native addon                          |

All postinstall scripts are from well-known, reputable packages. No suspicious behavior detected.

---

## Package Lock Integrity

- `package-lock.json` uses lockfileVersion 3 (npm v9+)
- Contains **1,754 integrity hashes** across 24,824 lines
- Integrity hashes are present, which protects against tampered packages during install

---

## .gitignore Assessment

The `.gitignore` is comprehensive (224 lines). Key security-relevant entries:

**Properly ignored:**

- `.env*.local`, `.env`, `.env.local.prod.backup`, `.env.local.dev`, `.env.local.beta`, `.env.local.prod` - all env variants covered
- `/.auth/` - session tokens and credentials
- `/storage/` - uploaded files
- `backup-*.sql`, `backups/` - database dumps
- `/data/email-references/` - raw email exports with PII
- `*.pem` - private keys
- `.vscode/*` (except extensions.json)

**Potential gaps:**

- No explicit ignore for `*.key`, `*.p12`, `*.pfx` (certificate files)
- No ignore for `credentials.json` or `service-account.json` (Google service accounts)
- No ignore for `.npmrc` (could contain npm auth tokens)

---

## Git History - Environment Files

`git log --all --oneline -- "*.env*" ".env*"` shows **16 commits** that touched env-related files. These include:

- Commits related to `.env.local.example` and `.env.example` (safe, template files)
- Commits from early project history that may have included actual env values before `.gitignore` was comprehensive

The `.env.local.example` file is committed (intentionally, as a template) and contains `AgentChefFlow!2026` as the example agent password value. Since the repo is public, this is exposed.

---

## Dependency Health Concerns

### Unmaintained / Stale Packages

| Package     | Last Release  | Concern                                                                    |
| ----------- | ------------- | -------------------------------------------------------------------------- |
| `xlsx`      | March 2022    | Abandoned on npm, known vulnerabilities, no fix path                       |
| `next-auth` | beta.30       | Running a beta version in production. v5 has been in beta for over a year. |
| `pluralize` | v8.0.0 (2019) | Stable and complete, low risk despite age                                  |

### Beta/Pre-release in Production

- `next-auth@5.0.0-beta.30` - authentication library running a beta version. Auth is critical infrastructure; beta versions may have undiscovered security issues.

---

## Recommendations (Priority Order)

### P0 - Immediate (Do Today)

1. **Rotate the developer's password** (`[REDACTED]`) on ChefFlow, Gmail, and any service where it is reused
2. **Make the repo private** on GitHub, or use BFG Repo Cleaner to purge the password from git history
3. **Rotate the agent password** (`AgentChefFlow!2026`) since it is exposed in 49+ files in a public repo

### P1 - This Week

4. **Replace `xlsx`** with a maintained alternative (`exceljs` is the most common drop-in). No security fix is available.
5. **Move all hardcoded passwords** to `.env` or `.auth/` files. Grep for `password:` and `password =` across all `.ts`, `.tsx`, `.js`, `.mjs` files and replace with env variable references.
6. **Run `npm audit fix`** to patch `brace-expansion` and `picomatch` (non-breaking fixes available)

### P2 - This Month

7. **Add `.npmrc` and `credentials.json` to `.gitignore`** as preventive measures
8. **Plan Next.js upgrade** from 14.x to address 4 high-severity vulnerabilities (breaking change, requires testing)
9. **Evaluate `next-auth` stability** - consider whether v5 beta is acceptable for production auth
10. **Add `npm audit` to CI** to catch new vulnerabilities automatically
11. **Add a pre-commit hook** that scans for password patterns (e.g., using `detect-secrets` or a simple grep guard)

### P3 - Nice to Have

12. **Pin exact dependency versions** in `package.json` (replace `^` with exact versions) to prevent unexpected updates
13. **Consider `npm-audit-resolver`** for tracking accepted risks (like `xlsx` until replaced)

---

## Gaps and Unknowns

- Could not authenticate with `gh` CLI to confirm repo settings beyond the API check. The unauthenticated API returning 200 with `"private": false` confirms the repo is public.
- Did not audit transitive dependencies beyond what `npm audit` reports. A deeper audit with `npm ls --all` could reveal more issues.
- Did not check if the developer's password is reused on other services (outside scope, but the recommendation to rotate everywhere stands).
- The `.env.local` file itself was not read (correctly gitignored), so production API keys and secrets stored there were not audited for strength or rotation policy.
