# System Interrogation Protocol

> **Purpose:** 25 high-leverage questions that expose every unverified assumption in ChefFlow. Each question either proves the system works or reveals exactly where it doesn't. Ordered by blast radius (financial/security first, UX last).
>
> **How to use:** Run `npm run test:system-integrity` to execute all automated checks. Questions without test files require manual audit (marked below).
>
> **Existing coverage:** Q1-Q80 (80 specs). This protocol adds Q81-Q100 targeting gaps the first 80 don't reach.

---

## TIER 1: FINANCIAL TRUTH (blast radius: money)

### Q81: Silent Catch-Return-Default

**Question:** Are there server actions that catch database errors and silently return empty arrays, zero, null, or false instead of surfacing the failure to the UI?

**Why it matters:** A chef sees "$0.00 revenue" instead of "failed to load." They make wrong business decisions. This is the #1 Zero Hallucination violation pattern.

**Known surface:** 31 files identified with `catch (e) { return [] }` or equivalent patterns in `lib/`. Each one is a potential silent lie.

**Verification:** Static analysis. Scan every `catch` block in `lib/**/*.ts` server action files. Flag any that return `[]`, `{}`, `0`, `null`, `false`, or `""` without also calling `toast.error`, throwing, or returning `{ success: false, error }`.

**Pass criteria:** Zero silent catch-return-default patterns in server action files. Non-blocking side effects (notifications, emails) may catch-and-log, but data-fetching functions must never swallow errors as empty data.

**Test file:** `tests/system-integrity/q81-silent-catch-return-default.spec.ts`

---

### Q82: Optimistic Rollback Completeness

**Question:** Of the 968 `startTransition` / `useTransition` calls across 250 components, how many have proper try/catch with state rollback on failure?

**Why it matters:** Every unguarded optimistic update is a potential hallucination. User sees success, server failed, UI never corrects. The Zero Hallucination rule requires every single one to have rollback.

**Known surface:** 250 `.tsx` files containing `startTransition` or `useTransition`. Need to verify each wraps the server call in try/catch and restores previous state on error.

**Verification:** AST-level analysis or regex scan. For every `startTransition(async () => { ... })` block, verify it contains a `try/catch` where the catch either: (a) restores previous state, (b) calls `toast.error` or equivalent, or (c) throws to an error boundary.

**Pass criteria:** 100% of startTransition blocks that call server actions have error handling. Client-only transitions (no server call) are exempt.

**Test file:** `tests/system-integrity/q82-optimistic-rollback-completeness.spec.ts`

---

### Q86: Financial Arithmetic Purity

**Question:** Are there any code paths where monetary amounts (cents) pass through floating-point division, multiplication with decimals, or `parseFloat` before being stored or displayed?

**Why it matters:** `Math.round(10.1 * 100)` = 1010, but `Math.round(1.005 * 100)` = 100 (not 101). Float corruption in money paths causes pennies to vanish or appear. All financial math must stay in integer cents.

**Verification:** Scan all files in `lib/ledger/`, `lib/finance/`, `lib/quotes/`, `lib/commerce/`, `lib/pricing/`, `lib/billing/` for: `parseFloat` applied to monetary values, division of cent amounts without `Math.round`/`Math.floor`/`Math.ceil`, multiplication by decimal constants (tax rates, percentages) without integer rounding.

**Pass criteria:** Every monetary calculation that involves division or percentage multiplication wraps the result in `Math.round()`, `Math.floor()`, or `Math.ceil()` before storage or display. No raw `parseFloat` on cent values.

**Test file:** `tests/system-integrity/q86-financial-arithmetic-purity.spec.ts`

---

### Q78b: Financial Display Source Truth (extended)

**Question:** Does every dollar amount, percentage, or count displayed in the chef dashboard, event detail, quote detail, and financial pages derive from a database query or ledger view (never a hardcoded value, localStorage, or component state that isn't synced)?

**Covered partially by:** Q78 (financial display derivation). This extends to cover ALL financial surfaces, not just the ones Q78 checked.

**Status:** Extend Q78 if gaps found. No new test file unless Q78 is insufficient.

---

## TIER 2: SECURITY BOUNDARIES (blast radius: data exposure)

### Q85: @ts-nocheck Export Safety

**Question:** Do any `@ts-nocheck` files export functions that other modules import and call? If so, those exports will crash at runtime because the types are wrong and the code was never validated.

**Why it matters:** `@ts-nocheck` suppresses all type errors. If the file exports a server action, any caller can hit a runtime crash (wrong column name, nonexistent table, undefined property). CLAUDE.md explicitly bans this.

**Known surface:** 17 files with `@ts-nocheck`. Most are scripts/tests (safe). Need to verify none are in `lib/` with `export async function`.

**Verification:** Find all files with `@ts-nocheck` that also have `export`. Check if any are imported by production code (not just tests/scripts).

**Pass criteria:** Zero `@ts-nocheck` files in `lib/`, `app/`, or `components/` that export callable functions. Scripts and test helpers are exempt.

**Test file:** `tests/system-integrity/q85-ts-nocheck-export-safety.spec.ts`

---

### Q87: Server Action Auth Coverage

**Question:** Does every exported async function in a `'use server'` file start with `requireChef()`, `requireClient()`, `requireAdmin()`, or `requireAuth()`? Are there any that skip authentication entirely?

**Why it matters:** A server action without auth is callable by anyone. An unauthenticated user could mutate data, read private records, or trigger side effects. Existing Q6 covers some but not all 250+ action files.

**Verification:** For every file containing `'use server'`, find every `export async function`. Check that the function body starts with one of the auth guards (within first 5 lines). Functions that are intentionally public must have a `// public: <reason>` comment.

**Pass criteria:** 100% of exported server action functions have auth guards or explicit public documentation.

**Test file:** `tests/system-integrity/q87-server-action-auth-completeness.spec.ts`

---

### Q89: Tenant Scoping Exhaustiveness

**Question:** Does every database query in every server action include tenant scoping (`.where(eq(table.tenant_id, tenantId))` or `.where(eq(table.chef_id, chefId))`)? Are there any queries that read or write without filtering by tenant?

**Why it matters:** A missing tenant filter means Chef A can see or modify Chef B's data. This is the most catastrophic security failure possible in a multi-tenant app.

**Covered partially by:** Q7 (tenant isolation). This extends to a comprehensive scan of ALL query sites, not just the ones Q7 sampled.

**Verification:** For every `db.select()`, `db.insert()`, `db.update()`, `db.delete()` call in `lib/` server action files, verify that a `tenant_id` or `chef_id` filter is present. Tables that are genuinely global (like `auth_users`, `user_roles`, system config) are exempt.

**Pass criteria:** Every tenant-scoped table query includes the tenant filter. Exemption list is explicit and reviewed.

**Test file:** `tests/system-integrity/q89-tenant-scoping-exhaustiveness.spec.ts`

---

### Q90: AI Response Sanitization

**Question:** Are AI-generated strings (Remy responses, chef bio drafts, contract text) sanitized before being rendered in the UI? Could a crafted AI response inject HTML or JavaScript?

**Why it matters:** If Ollama returns `<script>alert('xss')</script>` in a chat response and the UI renders it with `dangerouslySetInnerHTML`, that's XSS. React auto-escapes JSX, but markdown renderers, `innerHTML`, and rich text editors may not.

**Verification:** Find all places where AI output is rendered. Check whether any use `dangerouslySetInnerHTML`, markdown-to-HTML without sanitization, or `innerHTML` assignment. Verify React's default escaping handles the rest.

**Pass criteria:** Zero unsanitized AI output paths. All markdown rendering uses a sanitizer (DOMPurify or equivalent). All plain text AI output uses React's default JSX escaping.

**Test file:** `tests/system-integrity/q90-ai-response-sanitization.spec.ts`

---

## TIER 3: DATA CONSISTENCY (blast radius: stale/wrong data)

### Q83: unstable_cache Tag Pairing

**Question:** For every `unstable_cache` call in the codebase, is there a matching `revalidateTag` call in every server action that mutates the cached data?

**Why it matters:** `revalidatePath` does NOT bust `unstable_cache` tags. If a mutation writes to a table that's cached by `unstable_cache` but only calls `revalidatePath`, the cache serves stale data indefinitely. Users see old data that contradicts what they just changed.

**Known surface:** 9 files use `unstable_cache`. Need to map each cache tag to its data source, then verify every mutation on that data source calls `revalidateTag` with the correct tag.

**Verification:** Build a map: `{ cacheTag -> dataSource -> [mutation files that write to dataSource] }`. For each mutation file, verify it calls `revalidateTag(cacheTag)`.

**Pass criteria:** Every cache tag has complete mutation coverage. No mutation can change cached data without busting the relevant cache.

**Test file:** `tests/system-integrity/q83-unstable-cache-tag-pairing.spec.ts`

---

### Q84: No-Op Success Return Detection

**Question:** Are there server actions that return `{ success: true }` without actually persisting anything to the database?

**Why it matters:** A function that says "success" but doesn't write is a hallucination by definition. The UI shows a success toast, but nothing changed. Zero Hallucination Law 1: never show success without confirmation.

**Known surface:** 250+ files return `{ success: true }`. Need to verify each one is preceded by an actual database write (insert/update/delete) that succeeded.

**Verification:** For every `return { success: true }` in server action files, trace backward in the function. Verify that at least one database mutation (`db.insert`, `db.update`, `db.delete`, or a called function that performs one) precedes the return.

**Pass criteria:** Every `{ success: true }` return is preceded by a confirmed database write or a legitimate non-DB action (email sent, file written, external API called). Pure no-ops are flagged.

**Test file:** `tests/system-integrity/q84-noop-success-return.spec.ts`

---

### Q88: CAS Guard Exhaustiveness

**Question:** For every state-changing mutation where double-execution would cause harm (FSM transitions, payment recording, ledger appends), is there a CAS guard (`.where(eq(status, expectedStatus))`) that prevents duplicate execution?

**Why it matters:** Without CAS, a network retry or double-click can: transition an event twice (draft -> proposed -> accepted in one click), record a payment twice (double charge), or append duplicate ledger entries.

**Covered partially by:** Q68 (CAS guard coverage). This extends to verify ALL state mutations, not just the ones Q68 sampled.

**Verification:** Identify all mutations that change a `status` column or append to an append-only table. Verify each has a CAS guard or idempotency key.

**Pass criteria:** Every status mutation uses CAS. Every ledger append uses an idempotency key or transaction guard.

**Test file:** `tests/system-integrity/q88-cas-guard-exhaustiveness.spec.ts`

---

### Q91: Ollama Offline Error Propagation

**Question:** When Ollama is unreachable, does every AI-powered feature fail visibly with a user-friendly error, or do some silently return empty/default results?

**Why it matters:** If Remy goes quiet without explanation, the chef thinks the feature is broken or they did something wrong. If a bio generator returns "" instead of an error, the chef sees a blank field and doesn't know to retry.

**Verification:** For every function that calls `parseWithOllama`, trace the error path. Verify that `OllamaOfflineError` propagates to the UI as a visible error (toast, error boundary, inline message). No function should catch `OllamaOfflineError` and return a default.

**Pass criteria:** Every AI feature shows a clear "AI unavailable" message when Ollama is down. Zero silent failures.

**Test file:** `tests/system-integrity/q91-ollama-offline-propagation.spec.ts`

---

## TIER 4: STATE MACHINE INTEGRITY (blast radius: impossible states)

### Q92: FSM Transition Exhaustiveness

**Question:** For every FSM in the system (events, quotes, invoices), is every possible (state, action) pair explicitly handled, including the invalid ones?

**Why it matters:** An unhandled transition means the system silently allows an impossible state change, or throws an unhandled error. Both are bad. Invalid transitions must be explicitly rejected with a clear error.

**Covered partially by:** Q4 (event FSM), Q22 (quote FSM), Q39 (terminal states). This checks ALL FSMs comprehensively.

**Verification:** For each FSM, enumerate all states and all actions. Build a matrix. Verify every cell is either: (a) a valid transition with the target state defined, or (b) explicitly rejected. No undefined cells.

**Pass criteria:** Complete transition matrices for all FSMs. Zero undefined (state, action) pairs.

**Test file:** `tests/system-integrity/q92-fsm-transition-exhaustiveness.spec.ts`

---

### Q93: Soft Delete Filter Completeness (extended)

**Question:** For every table with a `deleted_at` or `archived_at` column, does every SELECT query filter out soft-deleted records by default?

**Covered partially by:** Q65. This extends to verify ALL query sites, not just the ones Q65 sampled.

**Verification:** Find all tables with `deleted_at`/`archived_at` columns. Find all queries on those tables. Verify each includes `WHERE deleted_at IS NULL` (or equivalent). Explicit "include deleted" queries must have a comment explaining why.

**Pass criteria:** 100% of queries on soft-deletable tables filter by default. Admin/audit queries that intentionally include deleted records are documented.

**Status:** Extend Q65 if gaps found.

---

## TIER 5: CACHE & REVALIDATION (blast radius: stale UI)

### Q94: Mutation-Revalidation Completeness

**Question:** After every server action that mutates data, is there a `revalidatePath` or `revalidateTag` call that covers every page/component that reads that data?

**Covered partially by:** Q80 (revalidation after mutation). This checks whether the revalidation targets are COMPLETE (not just present).

**Verification:** For each mutation, identify all pages that render the mutated data. Verify that the revalidation call covers all of them (path revalidation covers the page, tag revalidation covers the cache).

**Pass criteria:** No page can show stale data after a mutation completes. Every mutation's revalidation targets are exhaustive.

**Status:** Extend Q80 if gaps found.

---

### Q95: SSE Reconnection State Consistency

**Question:** After an SSE connection drops and reconnects, does the client receive the complete current state, or can it miss events that occurred during the disconnection?

**Why it matters:** If a chef's browser loses connection for 30 seconds during event creation, they might miss the "event created" broadcast and see a stale list until they manually refresh.

**Verification:** Simulate SSE disconnect/reconnect in a test. Mutate data during the disconnection. Verify the client's state is correct after reconnection.

**Pass criteria:** After reconnection, the client either: (a) receives all missed events (replay), or (b) triggers a full data refresh. No stale state after reconnect.

**Test file:** Manual verification required. Consider adding to experiential tests.

---

## TIER 6: INPUT BOUNDARIES (blast radius: crashes, corruption)

### Q96: File Upload Boundary Validation

**Question:** Does the storage upload path validate file size, file type, and content-type header before accepting a file? Can an attacker upload a 10GB file or an executable?

**Covered partially by:** Q25 (storage security), Q47 (path traversal). This checks upload-time validation specifically.

**Verification:** Read the upload handler (`lib/storage/index.ts` and `app/api/storage/` routes). Verify: max file size enforced, allowed MIME types whitelist, content-type header validated against actual file content.

**Pass criteria:** Upload rejects files over size limit, rejects disallowed types, validates content matches declared type.

**Status:** Extend Q25 if gaps found.

---

### Q97: Zod Schema Coverage

**Question:** Does every server action that accepts user input validate it with a Zod schema before any database operation?

**Covered partially by:** Q30 (input validation surface), Q71 (Zod schema input boundary). This verifies COMPLETENESS.

**Verification:** For every exported server action with parameters, verify a Zod `.parse()` or `.safeParse()` call exists before the first database operation. Raw `input.field` access without validation is a flag.

**Pass criteria:** 100% of server actions with user input have Zod validation. Functions that only read from session (no user input) are exempt.

**Status:** Extend Q71 if gaps found.

---

## TIER 7: UI TRUTHFULNESS (blast radius: misleading UX)

### Q98: Dead Button Detection

**Question:** Are there any visible, enabled buttons in the UI whose onClick handler is empty, calls a stub function, or navigates to an unimplemented route?

**Why it matters:** Zero Hallucination Law 3: never render a non-functional feature as functional. A button that looks clickable but does nothing is a lie.

**Verification:** Scan all `.tsx` files for: `onClick={() => {}}`, `onClick={() => null}`, `onClick={noop}`, buttons with `href` pointing to `#` or unimplemented routes, buttons whose handler calls a function that immediately returns without doing anything.

**Pass criteria:** Every visible, enabled button does something meaningful. Disabled buttons have a tooltip explaining why. Coming-soon features are either hidden or visually distinguished.

**Test file:** `tests/system-integrity/q98-dead-button-detection.spec.ts`

---

### Q99: Error Boundary Coverage

**Question:** Does every major page/layout have a React Error Boundary that catches render errors and shows a recovery UI instead of a blank screen?

**Why it matters:** Without error boundaries, a single component crash blanks the entire page. The chef sees nothing, can't navigate, doesn't know what happened.

**Verification:** Check that `app/(chef)/layout.tsx`, `app/(client)/layout.tsx`, `app/(public)/layout.tsx`, and `app/(admin)/layout.tsx` have error boundary wrappers. Check that individual high-risk pages (dashboard, events, financials) have local error boundaries.

**Pass criteria:** All layout files have error boundaries. The 10 highest-traffic pages have page-level error boundaries. Error UI shows a retry button and clear message.

**Test file:** `tests/system-integrity/q99-error-boundary-coverage.spec.ts`

---

### Q100: Loading State Completeness

**Question:** Does every page that fetches data show a loading state while the fetch is in progress, and does that loading state eventually resolve (no infinite spinners)?

**Covered partially by:** Experiential test `08-loading-state-audit.spec.ts`. This verifies exhaustiveness.

**Verification:** For every `async` page component and every `useEffect` that fetches data, verify: (a) a loading state is shown during fetch, (b) the loading state resolves on success AND on error, (c) there is no code path where the loading state can persist indefinitely.

**Pass criteria:** Zero pages that show blank content during data fetch. Zero infinite loading states.

**Status:** Extend experiential test 08 if gaps found.

---

## EXECUTION PRIORITY

| Priority | Questions          | Why first                                     |
| -------- | ------------------ | --------------------------------------------- |
| **P0**   | Q81, Q82, Q84, Q87 | Financial lies + auth gaps = existential risk |
| **P1**   | Q83, Q85, Q86, Q88 | Data consistency + type safety = trust        |
| **P2**   | Q89, Q90, Q91, Q92 | Security + state integrity = correctness      |
| **P3**   | Q98, Q99, Q100     | UX truthfulness = user confidence             |
| **P4**   | Q93-Q97            | Extensions of existing coverage               |

---

## RUNNING THE SUITE

```bash
# Run all system integrity tests (Q1-Q100)
npm run test:system-integrity

# Run only the new interrogation tests (Q81-Q100)
npx playwright test --config=playwright.system-integrity.config.ts --grep "Q8[1-9]|Q9[0-9]|Q100"

# Run by tier
npx playwright test --config=playwright.system-integrity.config.ts --grep "Q8[1246]"  # Financial
npx playwright test --config=playwright.system-integrity.config.ts --grep "Q8[579]|Q90"  # Security
```

---

_Protocol created 2026-04-15. Covers gaps not reached by Q1-Q80._
