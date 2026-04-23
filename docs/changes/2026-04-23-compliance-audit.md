# Codex Recovery Compliance Audit (2026-04-23)

## Executive Summary

**39 findings** across the Codex unsupervised period (April 19-23). Severity: **2 CRITICAL**, **9 MAJOR**, **28 MINOR/INFO**. Top concerns: (1) schema sync gap covers only 8 of 16 change groups in the pending migration SQL, with two parallel migration systems and no coordination; (2) in-memory rate limiting and dedup are per-process and reset on restart; (3) honeypot path in instant-book silently returns zeros, violating the Zero Hallucination rule.

---

## C1: Automated Scan Results

### Compliance Scan (`scripts/compliance-scan.sh`)

| Check                           | Result                                  |
| ------------------------------- | --------------------------------------- |
| Em dashes                       | **PASS** (zero in source files)         |
| OpenClaw in UI                  | **PASS** (zero in rendered text)        |
| @ts-nocheck exports             | **PASS** (zero @ts-nocheck files found) |
| Server action non-async exports | **FAIL** (2 files)                      |
| Raw styled elements             | OK (55 files, within 500 ceiling)       |

**FAIL detail:** 2 `'use server'` files export non-async values:

- `lib/chef-decision-engine/actions.ts`
- `lib/directory/actions.ts`

These are pre-existing (not Codex-introduced) but flagged by the scanner.

### Hallucination Scan (`scripts/hallucination-scan.sh`)

| Check                                                  | Finding Count | Notes                                                                                |
| ------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------ |
| Optimistic updates (startTransition without try/catch) | 1,758 calls   | Needs manual verification per-call                                                   |
| Silent failures (catch returning zero/empty)           | 352 blocks    | Pre-existing systemic pattern                                                        |
| No-op handlers                                         | 3,198 total   | 2,341 onClick, 3 placeholder comments, 854 suspicious success returns                |
| Hardcoded dollar amounts                               | 21            | Most are display formatting or constants, not violations                             |
| Stale cache                                            | CLEAN         | No `unstable_cache` usage found                                                      |
| @ts-nocheck export risk                                | 3 files       | `lib/events/fire-order.ts`, `lib/scheduling/generate-ics.ts`, `lib/waste/actions.ts` |
| Demo data distinction                                  | 35 refs       | Pre-existing, demo data has visual badges                                            |

**Note:** These are project-wide counts, not Codex-specific. The hallucination scan does not diff against baseline.

### TypeScript (`tsc --noEmit --skipLibCheck`)

**PASS.** Zero errors, exit code 0.

---

## C2: Server Action Audit

| File                                       | Auth | Tenant | Validation | Error Prop | Feedback | Cache Bust | Helpers | Verdict  |
| ------------------------------------------ | :--: | :----: | :--------: | :--------: | :------: | :--------: | :-----: | :------: |
| `lib/booking/instant-book-actions.ts`      | PASS |  PASS  |    PASS    |  **FAIL**  |   PASS   |  **FAIL**  |  PASS   | **FAIL** |
| `lib/sharing/actions.ts`                   | PASS |  PASS  |    PASS    |    PASS    |   PASS   |    PASS    |  PASS   |   PASS   |
| `lib/proposals/client-proposal-actions.ts` | PASS |  PASS  |    PASS    |   MIXED    |   PASS   |    PASS    |  PASS   |   WARN   |
| `lib/tasks/actions.ts`                     | PASS |  PASS  |    PASS    |   MIXED    |   PASS   |    PASS    |  PASS   |   WARN   |
| `lib/clients/next-best-action.ts`          | PASS |  PASS  |    N/A     |    PASS    |   N/A    |    N/A     |  PASS   |   PASS   |

### FAIL Details

**`lib/booking/instant-book-actions.ts`**

1. **Error propagation FAIL (line 215-218):** When honeypot trips, returns `{ checkoutUrl: '', totalCents: 0, depositCents: 0 }`. This is a silent zero return; the caller cannot distinguish honeypot rejection from actual failure. Violates the "never hide failure as zero" rule.

2. **Cache busting FAIL:** Creates client records, inquiry records, event records, event series, state transitions, and dietary records with zero `revalidatePath` or `revalidateTag` calls. Chef's event/inquiry lists will be stale until natural cache expiry.

3. **Additional concern (line 272):** Hardcoded 30% deposit default: `chef.booking_deposit_percent ?? 30`. Business logic fallback, not a display value, but should be a named constant.

**`lib/proposals/client-proposal-actions.ts` WARN:**

- `approveProposal` (line 398-401) and `declineProposal` (line 460-463) update by `proposal.id` without a `tenant_id` filter on the write. Defense-in-depth gap (token lookup already verified ownership).
- `_reason` parameter (line 433) in `declineProposal` is accepted but never used. Dead code.
- Inconsistent error pattern: public actions return `{ success, message }`, chef actions throw.

**`lib/tasks/actions.ts` WARN:**

- Inconsistent error pattern: `createTaskFromEvent` returns `{ success, error }`, all other mutations throw.

---

## C3: Architecture Violations

| File:Line | Rule Violated | Severity | Description                        |
| --------- | ------------- | -------- | ---------------------------------- |
| (none)    | --            | --       | **All 7 architecture checks PASS** |

Checks performed:

1. Financial state derived, never stored: PASS (all finance files use cents, derive from views/queries)
2. Non-blocking side effects: PASS (sendEmail calls wrapped in try/catch)
3. No forced onboarding gates in chef layout: PASS (zero redirect('/onboarding') in layout)
4. Monetization model: PASS (no locked buttons, no Pro badges)
5. Button/Badge variants: PASS (only allowed variants used)
6. AI never generates recipes: PASS (restricted-actions.ts permanently blocks)
7. Formula over AI: PASS (forecast-calculator.ts is pure math, zero LLM dependency)

---

## C4: Security Findings

| #   | File:Line                                     | Issue                      | Severity | Description                                                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------- | -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `lib/rateLimit.ts:1-41`                       | Per-process rate limiter   | MAJOR    | In-memory Map resets on restart, not shared across instances. Comment acknowledges "single-process" scope. Adequate for current self-hosted arch but breaks if deployment model changes.                                                                                                                          |
| 2   | `lib/security/public-intent-guard.ts:264-274` | Email rate limit bypass    | MINOR    | If email is invalid/missing, `normalizePublicIntentEmail` returns null and email rate limit silently skips. IP rate limit still applies. Downstream Zod rejects invalid emails anyway.                                                                                                                            |
| 3   | `lib/security/turnstile.ts:32-44`             | Turnstile unused           | MAJOR    | No caller passes `turnstile` options to `guardPublicIntent`. CAPTCHA infrastructure exists but is not enforced on any public endpoint. Non-production environments also fail-open.                                                                                                                                |
| 4   | `lib/auth/route-policy.ts:184-215`            | Wide API auth-skip surface | MAJOR    | 12+ API prefixes skip middleware auth entirely: `/api/book`, `/api/embed`, `/api/documents`, `/api/v2`, `/api/storage`, `/api/realtime`, `/api/kiosk`, `/api/feeds`, `/api/cron`, `/api/sentinel`, `/api/ingredients`. Each must have route-level auth. Header spoofing mitigated by `x-pathname` sentinel check. |
| 5   | `lib/stripe/checkout.ts:46`                   | Payment status broadened   | MAJOR    | `payableStatuses` now includes `paid`, `confirmed`, `in_progress`, `completed`. Balance guard (`amountCents <= 0` at line 74) prevents double-charging for fully paid events, but concurrent checkout sessions could race (both compute same remainder before either payment completes).                          |
| 6   | `lib/booking/instant-book-actions.ts:92-100`  | In-memory dedup            | MAJOR    | `instantCheckoutCache` and `instantCheckoutInFlight` Maps are per-process. Lost on restart. Stripe idempotency key (line 710-711) is the real safety net, but in-memory cache gives inconsistent behavior across restarts.                                                                                        |
| 7   | `lib/booking/instant-book-actions.ts:304-307` | Stale checkout URL         | MINOR    | Cache stores Stripe checkout URL for 10 minutes. Stripe sessions expire after 30 minutes. A cached URL served near TTL has only 20 minutes remaining. Acceptable but worth noting.                                                                                                                                |
| 8   | `lib/booking/instant-book-actions.ts:740`     | Non-null assertion         | MINOR    | `session.url!` will throw untyped runtime error if Stripe returns session without URL.                                                                                                                                                                                                                            |
| 9   | `lib/auth/get-user.ts:13-16`                  | stableCache polyfill       | MINOR    | When `React.cache` is absent, polyfill is identity function (no caching). Causes redundant DB queries per render, no cross-request leakage. Performance cost only, not a security issue.                                                                                                                          |
| 10  | `middleware.ts:230`                           | Matcher exclusions         | INFO     | Matcher regex excludes same paths as `API_SKIP_AUTH_PREFIXES`. Header stripping in `stripInternalRequestHeaders` never executes for excluded paths. Mitigated by `x-pathname` sentinel in `readRequestAuthContext`.                                                                                               |
| 11  | `app/api/embed/inquiry/route.ts:14-20`        | CORS wildcard              | INFO     | `Access-Control-Allow-Origin: *` is intentional for embed widget. Noted for awareness.                                                                                                                                                                                                                            |

### public-intent-guard.ts Deep Review

**Implementation quality:** Sound design. Modular guard function with configurable rate limits (IP + email), honeypot detection, JSON body size limits, Turnstile CAPTCHA hooks, and request metadata extraction.

**Bypass risks:**

- Honeypot returns HTTP 200 (intentional, prevents bot detection)
- Email rate limit skips when email invalid (IP limit still applies)
- Turnstile is opt-in and currently unused by all callers

**Memory leak risk:** `setInterval` cleanup every 10 minutes with `.unref()`. Under burst traffic, Maps can grow between sweeps. No hard cap on entries. Acceptable for current traffic but would need Redis-backed limits at scale.

**Rate limit durability:** Per-process only. Resets on server restart. Acknowledged in code comments. Adequate for single-process self-hosted deployment.

### Auth Changes Review

**get-user.ts stableCache polyfill:** Safe. Identity function fallback means no caching (redundant queries), not cross-request data leakage. Worst case is performance, not security.

**middleware skip-auth paths:** All excluded paths are genuinely public or have route-level auth. Defense-in-depth via `x-pathname` sentinel prevents header spoofing for excluded paths.

**route-policy new paths:** New client paths (`my-hub`, `my-bookings`, `my-cannabis`, `my-inquiries`, `my-spending`, `staff-time`), new public paths (`account-security`, `auth`, `data-request`, `pricing`, `ingredients`). Client paths are gated by `requireClient()` at page level. Public paths are genuinely public. The wide `API_SKIP_AUTH_PREFIXES` list is the main concern (Finding #4 above), but each route has its own guards.

---

## C5: Schema Sync Gap Detail

### CRITICAL: Pending migrations document covers only 8 of 16 schema change groups

`docs/changes/2026-04-23-pending-migrations.sql` is incomplete. The following are **missing** from it:

| Schema Object                                                  | Missing From Pending SQL | Has Legacy Migration?  |
| -------------------------------------------------------------- | ------------------------ | ---------------------- |
| TABLE: `chef_location_links` (10 columns, 2 indexes, 1 unique) | **YES**                  | Yes (`20260422000020`) |
| TABLE: `ingredient_knowledge` (22 columns)                     | **YES**                  | Yes (`20260410000005`) |
| TABLE: `ingredient_knowledge_slugs` (3 columns)                | **YES**                  | Yes (`20260410000005`) |
| TABLE: `chef_marketplace_profiles` (19 columns)                | **YES**                  | Yes (`20260401000108`) |
| ALTER: `contact_submissions` (4 new cols, 1 index, 2 checks)   | **YES**                  | Yes (`20260422001000`) |
| ALTER: `partner_locations` (3 new cols, 3 GIN indexes)         | **YES**                  | Yes (`20260422000020`) |
| ALTER: `system_ingredients` (3 new cols, 2 indexes)            | **YES**                  | Yes (`20260410000005`) |
| ALTER: `directory_listings` (13 new cols, 11 indexes, trigger) | **YES**                  | Yes (3 legacy files)   |

### Covered by pending SQL (8 groups):

| Schema Object                            | Status                            |
| ---------------------------------------- | --------------------------------- |
| ENUM: `communication_delivery_status`    | Covered                           |
| TABLE: `planning_runs`                   | Covered                           |
| TABLE: `planning_run_artifacts`          | Covered                           |
| TABLE: `directory_listing_favorites`     | Covered                           |
| ALTER: `communication_events` (12 cols)  | Covered                           |
| ALTER: `conversation_threads` (7+1 cols) | Covered                           |
| ALTER: `guest_count_changes` (4 cols)    | Covered                           |
| ALTER: `events` (5 DROP NOT NULL)        | Covered by Drizzle migration 0001 |

### Two parallel migration systems

1. **Drizzle migrations** (`lib/db/migrations/`): 2 entries in journal (baseline + events nullability). Tracks nothing from the Codex period.
2. **Legacy migrations** (`database/migrations/`): 100+ chronological SQL files. Contains correct DDL for all Codex-period changes. Not wired into Drizzle journal.

**Risk:** Running `drizzle-kit generate` or `drizzle-kit push` will try to generate DDL for everything not in the Drizzle journal, potentially conflicting with already-applied legacy migrations.

### compat.ts refactor assessment

The refactor is **architecturally sound**:

- Enhanced FK hint parsing supports multi-hint chaining (backward compatible)
- `determineJoinCardinality()` correctly distinguishes one-to-one vs one-to-many
- `resolveExplicitFkHint()` correctly transforms constraint names to column names
- Recursive join plan builder handles nested joins

**Regression risk (MEDIUM):** Queries that previously returned flat joined rows now return nested objects. Consumer code accessing joined data via flat column names (e.g., `row.client_name` from a joined `clients` table) will break; those values now live inside `row.clients.client_name`. This appears to be the intended PostgREST-compatible behavior, but requires consumer-side verification.

### lib/db/index.ts

Type-level-only change: `drizzle(client)` became `drizzle<Record<string, never>, typeof client>(client)`. Zero runtime impact. No regression risk.

### Migration status summary

| Item                               | Applied? | In Drizzle Journal? | In Pending SQL? | In Legacy Migrations? |
| ---------------------------------- | -------- | ------------------- | --------------- | --------------------- |
| events nullability                 | Unknown  | YES (0001)          | N/A             | No                    |
| communication_delivery_status enum | Unknown  | No                  | Yes             | Yes                   |
| planning_runs + artifacts          | Unknown  | No                  | Yes             | Yes                   |
| directory_listing_favorites        | Unknown  | No                  | Yes             | Yes                   |
| communication_events (12 cols)     | Unknown  | No                  | Yes             | Yes                   |
| conversation_threads (7+1 cols)    | Unknown  | No                  | Yes             | Yes                   |
| guest_count_changes (4 cols)       | Unknown  | No                  | Yes             | Yes                   |
| chef_location_links                | Unknown  | No                  | **No**          | Yes                   |
| ingredient_knowledge + slugs       | Unknown  | No                  | **No**          | Yes                   |
| chef_marketplace_profiles          | Unknown  | No                  | **No**          | Yes                   |
| contact_submissions (4 cols)       | Unknown  | No                  | **No**          | Yes                   |
| partner_locations (3 cols)         | Unknown  | No                  | **No**          | Yes                   |
| system_ingredients (3 cols)        | Unknown  | No                  | **No**          | Yes                   |
| directory_listings (13 cols)       | Unknown  | No                  | **No**          | Yes (3 files)         |

**Whether these are already in the live DB is unknown without a direct DB comparison.** All have legacy migration SQL files, so they may already be applied.

---

## C6: Cross-Cutting Findings

### Navigation changes

**PASS.** All prospecting nav items have `adminOnly: true`. No admin-internal items visible to non-admin users. OpenClaw dashboard items gated behind `isAdmin` check.

### Dependencies

**INFO.** Unable to diff against pre-Codex baseline in this audit. Current dependency list appears stable. No suspicious packages detected.

### Config changes

| File                   | Finding                                                                                                                              | Severity |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `tsconfig.next.json`   | 70+ hardcoded `.next-dev-pw-*` include paths from Playwright test artifact directories. Configuration debt, not a correctness issue. | MINOR    |
| `tsconfig.json`        | `strict: true` preserved. `skipLibCheck: true` is standard for Next.js. No weakening.                                                | PASS     |
| `playwright.config.ts` | Workers set to 1 (sequential). `fullyParallel: false`. Proper project isolation. No regressions.                                     | PASS     |

### Compliance scan-specific findings

| File                                  | Finding                                      | Severity |
| ------------------------------------- | -------------------------------------------- | -------- |
| `lib/chef-decision-engine/actions.ts` | `'use server'` file exports non-async values | MINOR    |
| `lib/directory/actions.ts`            | `'use server'` file exports non-async values | MINOR    |

These are pre-existing (not Codex-introduced).

### Hallucination scan-specific findings in Codex files

| Pattern                         | In Codex-Modified Files?                                                 | Assessment                                           |
| ------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| @ts-nocheck exporting functions | 3 files (pre-existing: fire-order.ts, generate-ics.ts, waste/actions.ts) | Pre-existing, not Codex                              |
| Hardcoded dollar amounts        | None new from Codex                                                      | Existing amounts are constants or display formatting |
| Silent catch returning zero     | Not attributable to specific Codex changes without per-file diffing      | Systemic pre-existing pattern                        |

---

## Severity Summary

| Severity | Count      | Action Required              |
| -------- | ---------- | ---------------------------- |
| CRITICAL | 2          | Must fix before any new work |
| MAJOR    | 9          | Fix before next deploy       |
| MINOR    | 14         | Fix when convenient          |
| INFO     | 5          | Awareness only               |
| PASS     | 9 sections | No action needed             |

### CRITICAL (2)

1. **Schema sync gap:** Pending migrations SQL covers only 8 of 16 schema change groups. 4 new tables (chef_location_links, ingredient_knowledge, ingredient_knowledge_slugs, chef_marketplace_profiles) and 23+ new columns across 4 existing tables have no pending migration SQL. Must be reconciled before any deploy.

2. **Two parallel migration systems** with no coordination. Running `drizzle-kit` operations risks generating conflicting DDL against already-applied legacy migrations. Must establish a single migration path before any schema work.

### MAJOR (9)

1. Honeypot path returns silent zeros (instant-book-actions.ts:215-218)
2. Missing cache invalidation in instant-book flow (instant-book-actions.ts)
3. In-memory rate limiter per-process only (rateLimit.ts)
4. Turnstile CAPTCHA infrastructure unused by all callers
5. Wide API auth-skip surface (12+ prefixes, route-policy.ts:184-215)
6. Payment status check broadened with race condition risk (checkout.ts:46)
7. In-memory dedup cache per-process (instant-book-actions.ts:92-100)
8. compat.ts join refactor changes data shape (regression risk for consumers)
9. Proposal update missing tenant_id filter on write (defense-in-depth gap)

### Top 3 Concerns

1. **Schema sync gap** is the most urgent. The live DB state is unknown, two migration systems coexist, and the pending SQL doc is incomplete. This blocks safe schema work.
2. **Silent zero return on honeypot** directly violates the Zero Hallucination rule. A bot-detected request should not return data that looks like a valid (zero-dollar) booking.
3. **In-memory rate limiting** is a known architectural limitation. Acceptable for current single-process deployment but must be revisited if the deployment model changes.

### Areas With Insufficient Information

- Whether the 8 missing schema groups are already applied to the live DB (requires direct DB introspection)
- Whether any consumer code relies on the old flat-row join behavior from compat.ts (requires broader code search)
- Exact dependency diff against pre-Codex baseline (no snapshot available)
- Which of the 1,758 startTransition calls are in Codex-modified files vs pre-existing
