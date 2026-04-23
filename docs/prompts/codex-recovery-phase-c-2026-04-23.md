# Codex Recovery: Phase C - Compliance Audit

You are continuing the Codex Recovery process for ChefFlow. Phases A (inventory) and B (memory reconstruction) are complete. Your job is Phase C only.

---

## MANDATORY FIRST STEPS

1. Read `CLAUDE.md` at the project root. It is the law of this codebase. Every rule in it overrides your own instincts.
2. Read `docs/CLAUDE-ARCHITECTURE.md` for architecture patterns you will audit against.
3. Read the completed Phase A inventory: `docs/changes/2026-04-23-codex-recovery-inventory.md`.
4. Skim `docs/prompts/codex-recovery-2026-04-23.md` (Phase C section) for the original spec.

Do NOT run `scripts/session-briefing.sh` or read the session briefing. You do not need startup context; you need the inventory and the rules.

---

## SITUATIONAL CONTEXT

From April 19 to April 23, Codex (GPT-5.4) worked unsupervised on ChefFlow. It produced 7 commits (98 files) and 508 uncommitted file changes across 10 work units. Phase A inventoried everything. Phase B created memory entries.

**Your job: audit every post-baseline change against CLAUDE.md rules and flag violations.** Do not fix anything. Produce a report.

### The 10 work units

| # | Unit | Status |
|---|------|--------|
| 1 | Privileged mutation policy (auth inventory) | Committed (4427048f0, 96deee3c0) |
| 2 | Quote draft prefill unification | Committed (f361f6e1d) |
| 3 | Client interaction ledger | Committed (77c52a867) |
| 4 | Task-todo contract drift fix | Committed (195d0713f) |
| 5 | Client profile engine | Committed (150ad5152) |
| 6 | Operator walkthrough lane | Committed (bf4ebd24d) |
| 7 | Canonical intake lanes | Uncommitted |
| 8 | Ledger-backed next best action | Uncommitted |
| 9 | Tasks create path reliability | Uncommitted |
| 10 | Public intent hardening | Uncommitted |

### High-risk files to prioritize

From the Phase A inventory, these are the files that MUST be reviewed:

**CRITICAL (auth, security, public API, finance):**
- `middleware.ts`
- `lib/auth/get-user.ts`
- `lib/auth/route-policy.ts`
- `lib/security/public-intent-guard.ts` (NEW, ~300 lines, security-critical)
- `lib/booking/instant-book-actions.ts` (anonymous intent dedup, Stripe idempotency)
- `lib/stripe/checkout.ts` (payment status check broadened)
- `app/api/book/route.ts`, `app/api/book/parse/route.ts`
- `app/api/embed/inquiry/route.ts`, `app/api/kiosk/inquiry/route.ts`
- `lib/inquiries/public-actions.ts`
- `lib/sharing/actions.ts`, `lib/proposals/client-proposal-actions.ts`
- `lib/finance/forecast-calculator.ts`, `lib/finance/profit-loss-report-actions.ts`, `lib/finance/revenue-forecast-actions.ts`
- `app/api/auth/google/connect/callback/route.ts`
- `app/api/webhooks/email/inbound/route.ts`, `app/api/webhooks/resend/route.ts`, `app/api/webhooks/twilio/route.ts`

**HIGH (database schema, db layer):**
- `lib/db/schema/schema.ts` (+326 lines)
- `lib/db/compat.ts` (major refactor: nested join handling, cardinality detection)
- `lib/db/index.ts`
- `lib/db/migrations/0001_event_shell_unknown_core_facts.sql`

---

## YOUR TASKS

### C1. Automated Scans

Run these three scans and capture their full output:

```bash
bash scripts/compliance-scan.sh
```
Checks: em dashes, OpenClaw in UI, @ts-nocheck exports, 'use server' non-async exports, raw styled elements.

```bash
bash scripts/hallucination-scan.sh
```
Checks: optimistic updates without try/catch, catch blocks returning zeros, no-op handlers, hardcoded dollar amounts, stale cache, @ts-nocheck exports, demo data without distinction.

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | head -200
```
Type safety. Capture error count. If more than 200 lines, note total count and show first 200.

Record ALL output verbatim in the audit report.

### C2. Server Action Audit (Manual)

Find every file with `'use server'` that was created or significantly modified since baseline. The Phase A inventory lists them:

| File | Change Type |
|------|------------|
| `lib/booking/instant-book-actions.ts` | Major expansion |
| `lib/sharing/actions.ts` | Rate limits added |
| `lib/proposals/client-proposal-actions.ts` | Rate limits added |
| `lib/tasks/actions.ts` | Updated |
| `lib/clients/next-best-action.ts` | Rebased |

Also check any NEW files that contain `'use server'`. Run:
```bash
grep -rl "'use server'" lib/ app/ components/ --include="*.ts" --include="*.tsx" | head -100
```
Cross-reference against the inventory to identify which ones were modified post-baseline.

For each modified server action file, check the **Server Action Quality Checklist** from CLAUDE.md:

1. **Auth gate** - Calls `requireChef()`, `requireClient()`, or `requireAuth()`?
2. **Tenant scoping** - `tenant_id` derived from session, never from request body?
3. **Input validation** - Inputs validated (Zod, manual checks)?
4. **Error propagation** - Returns `{ success, error? }`, never silently returns zero?
5. **Mutation feedback** - Provides feedback to caller?
6. **Cache busting** - After mutations, calls `revalidatePath`/`revalidateTag`?
7. **Internal functions** - Non-exported helpers in separate non-`'use server'` files?

Record each file's checklist verdict in the audit table.

### C3. Architecture Coherence

Read the post-baseline changes and check against CLAUDE.md architecture patterns:

1. **Financial state derived, never stored?** Check `lib/finance/forecast-calculator.ts` and any new financial logic. Amounts in cents (integers)?
2. **Non-blocking side effects wrapped in try/catch?** Check any new notification, email, or activity log calls in the modified files.
3. **No forced onboarding gates in chef layout?** Check `app/(chef)/layout.tsx` for any new redirect or blocker.
4. **Monetization model respected?** No locked buttons, no Pro badges in new UI? Check new components.
5. **Button/Badge variants correct?** Only allowed values from CLAUDE.md used?
6. **Tenant ID from session, not request?** Check all new server actions and API routes.
7. **AI never generates recipes?** Check any AI file changes.
8. **Formula over AI?** Check if any new AI call could be replaced by deterministic code.

### C4. Security Boundary Audit

For every public API route modified or created:

1. **Rate limiting present?** Check the `guardPublicIntent` integration.
2. **Input sanitization?** Especially for routes that parse JSON bodies.
3. **No tenant data leakage?** Public routes should never return tenant-scoped data without proper token/auth gating.
4. **Stripe idempotency correct?** Check `instant-book-actions.ts` implementation.
5. **Anonymous intent dedup sound?** Check the in-memory Map with TTL. Is it actually cleaned up? Memory leak risk?

For `lib/security/public-intent-guard.ts` specifically:
- Read the entire file.
- Check rate limit implementation (is it per-process only? Does it reset on restart?).
- Check honeypot implementation.
- Check the Turnstile integration.
- Check for any bypass conditions.

For `lib/auth/get-user.ts`:
- The `React.cache` was replaced with a `stableCache` polyfill. Is this safe? Does it preserve the same per-request caching semantics?

For `middleware.ts`:
- What new paths were added to skip-auth?
- Are they all genuinely public?

For `lib/auth/route-policy.ts`:
- What new paths were added?
- Are client/staff paths properly gated?

### C5. Schema Sync Gap Assessment

This is the CRITICAL finding from Phase A. Check:

1. Read `lib/db/schema/schema.ts` and identify all tables/columns that were added by Codex.
2. Read `lib/db/migrations/0001_event_shell_unknown_core_facts.sql` to confirm what it actually does.
3. Check if there are any other migration files that might cover the gap.
4. List exactly which schema additions have NO migration SQL.
5. Check `lib/db/compat.ts` changes: is the refactored join handling correct? Does it break existing queries?

Do NOT attempt to fix the gap or generate migrations. Just document it precisely.

### C6. Cross-Cutting Concerns

Check these files that were modified across multiple work units:

1. **Navigation (10 files):** Are new nav items correctly gated (adminOnly where needed)?
2. **Package.json:** Any new dependencies added? Are they necessary?
3. **Playwright config:** Any test config changes that could affect CI?
4. **tsconfig changes:** Anything that weakens type checking?

---

## OUTPUT FORMAT

Write the complete audit to `docs/changes/2026-04-23-codex-recovery-audit.md`:

```markdown
# Codex Recovery Audit (2026-04-23)

## Executive Summary
[2-3 sentences: how many findings, severity distribution, top concerns]

## Automated Scan Results

### Compliance Scan
[full output from scripts/compliance-scan.sh]

### Hallucination Scan
[full output from scripts/hallucination-scan.sh]

### TypeScript
[error count, notable errors]

## Server Action Audit

| File | Auth | Tenant | Validation | Error Prop | Cache Bust | Internal Helpers | Verdict |
|------|------|--------|------------|------------|------------|------------------|---------|
| [each file] | PASS/FAIL | PASS/FAIL | ... | ... | ... | ... | OK/WARN/FAIL |

[For any FAIL, include the specific line numbers and what is wrong]

## Architecture Violations

| File:Line | Rule Violated | Severity | Description |
|-----------|---------------|----------|-------------|
| [each violation] | [CLAUDE.md rule name] | CRITICAL/MAJOR/MINOR | [what is wrong] |

## Security Findings

| File:Line | Issue | Severity | Description |
|-----------|-------|----------|-------------|
| [each finding] | [short name] | CRITICAL/MAJOR/MINOR | [what is wrong and why it matters] |

### public-intent-guard.ts Deep Review
[Dedicated section for this security-critical file. Implementation quality, bypass risks, memory leak risks, rate limit durability.]

### Auth Changes Review
[get-user.ts stableCache polyfill, middleware skip-auth paths, route-policy new paths]

## Schema Sync Gap Detail

### Tables/columns defined in schema.ts without migration SQL:
[exact list with column names and types]

### compat.ts refactor assessment:
[is it safe? what changed? any regression risk?]

### Migration status:
[what has been applied, what hasn't, what is unknown]

## Cross-Cutting Findings

### Navigation changes
[any gating issues]

### Dependencies
[new packages, necessity assessment]

### Config changes
[anything that weakens safety]

## Severity Summary

| Severity | Count | Action Required |
|----------|-------|-----------------|
| CRITICAL | ? | Must fix before any new work |
| MAJOR | ? | Fix before next deploy |
| MINOR | ? | Fix when convenient |
```

---

## SEVERITY DEFINITIONS

- **CRITICAL**: Data loss risk, security hole, auth bypass, financial calculation error, missing tenant scoping on mutations.
- **MAJOR**: Violates an explicit CLAUDE.md rule but does not create immediate data/security risk. Examples: em dashes, wrong button variants, missing cache busting, silent error swallowing.
- **MINOR**: Style, convention, or best practice deviation that does not violate a specific rule. Examples: missing JSDoc on a public function, suboptimal but functional code.

---

## GROUND RULES

1. **Read CLAUDE.md first.** It overrides everything.
2. **No em dashes in YOUR output.** Use commas, semicolons, colons, or separate sentences.
3. **Phase C only.** Do not fix code, do not refactor, do not create PRs. Audit and report.
4. **Do not edit source code.** The only file you create is the audit report.
5. **Do not delete or modify any existing files.** Read only, plus the audit output.
6. **Every finding must cite file path and line number.** No citation = not verified.
7. **Read before judging.** Do not flag a file without reading the relevant section. False positives waste developer time.
8. **Be precise about severity.** CRITICAL means "stop and fix now." Do not cry wolf.
9. **Note when you cannot determine something.** "Unable to verify because X" is better than guessing.
10. **The schema sync gap is the #1 concern.** Give it thorough treatment.

---

## AFTER PHASE C

Report: total finding count by severity, top 3 concerns, and any areas where you had insufficient information to make a judgment. Then stop and wait for developer review before Phase D.

Phase D (commit and close) will be handled by Claude Code, not Codex.
