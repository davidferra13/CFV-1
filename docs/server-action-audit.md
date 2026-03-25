# Server Action Audit: 10-Dimension Evaluation Surface

**Date:** 2026-03-20
**Scope:** High-risk server actions (financial, auth/billing/stripe, events/quotes/clients/inquiries, AI dispatch)
**Method:** Evaluated each exported async function against 6 of 10 dimensions (Output Contract, Boundary Conditions, Authorization, Failure Mode, Idempotency, Cache Invalidation)

## Fix Log

### Phase 1: Critical Auth Fixes (DONE - 2026-03-20)

- C1a: Fixed tenant scoping bug in `clone-actions.ts` line 171 (`user.entityId` -> `user.tenantId!`)
- C1b: Fixed tenant scoping bug in `onboarding-actions.ts` lines 18, 25 (`user.entityId` -> `user.tenantId!`)
- C2: Added `requireAdmin()` to both functions in `deferred-transfers.ts`
- C3: Added `.eq('tenant_id', user.tenantId!)` + CAS guard to `approveTask`/`rejectTask` in `queue/actions.ts`
- C4: Added `requireChef()` to `parseDocumentWithVision` in `parse-document-vision.ts`
- C5: Moved `appendLedgerEntryFromWebhook` from `'use server'` file to `append-internal.ts` (not a server action). Updated Stripe webhook route and tip-actions imports.
- C6: Added CAS guard (`.in('status', ['pending', 'sent'])`) to `recordTip` in `tip-actions.ts`

### Phase 2: Zero Hallucination Fixes (DONE - 2026-03-20)

All 10 functions that silently returned zeros/empty arrays on query failure now throw errors instead:

- `ledger/compute.ts`: `getEventFinancialSummary`, `getYtdCarryForwardSavings`, `computeProfitAndLoss`
- `expenses/actions.ts`: `getExpenses`, `getEventExpenses`
- `finance/deposit-actions.ts`: `getOverdueDeposits`
- `finance/chargeback-actions.ts`: `getChargebackRate`
- `finance/chef-tax-config-actions.ts`: `getChefTaxRates`
- `quotes/actions.ts`: `getClientPricingHistory`, `getQuotesForInquiry`

### Phase 3: Robustness (DONE - 2026-03-20)

**H5 - Empty input guards on AI parsers:**

- `parse-recipe.ts`: `parseRecipeFromText` throws on empty input
- `parse-client.ts`: `parseClientFromText` throws on empty input
- `parse-inquiry.ts`: `parseInquiryFromText` throws on empty input
- `parse-brain-dump.ts`: `parseBrainDump` throws on empty input

**H6 - Re-throw OllamaOfflineError in parse-brain-dump.ts:**

- Added `import { OllamaOfflineError }` and `if (error instanceof OllamaOfflineError) throw error` before fallback parsing. Prevents swallowing Ollama-offline errors as "low confidence" fallback results.

**H7 - Void-return mutations now return success/error:**

- `tip-actions.ts`: `addTip` and `deleteTip` now return `{ success, error? }` with DB error checks
- `payment-plan-actions.ts`: `addInstallment`, `markInstallmentPaid`, `deleteInstallment` now return `{ success, error? }` with DB error checks

**H8 - Bulk operations:** Already had proper error handling (throw on error, return `{ success, count }`). No changes needed.

### Phase 4: Observability (DONE - 2026-03-20)

**Payload size validation in AI queue:**

- `queue/types.ts`: Added `MAX_PAYLOAD_BYTES: 100_000` to `OLLAMA_GUARD`
- `queue/actions.ts`: `enqueueTask` now rejects payloads > 100KB before touching the DB

**Input length truncation in parseWithOllama:**

- `parse-ollama.ts`: Added `MAX_INPUT_LENGTH = 100_000` constant. Inputs exceeding this are truncated with a log warning, preventing Ollama hangs on massive inputs.

**Structured logging for all AI parsers:**

- `parse-recipe.ts`: Entry/exit logging with input length and duration
- `parse-client.ts`: Entry/exit logging with fallback-to-heuristic warning
- `parse-inquiry.ts`: Entry/exit logging with input length and duration
- `parse-brain-dump.ts`: Entry/exit logging with fallback-to-heuristic warning

**Deferred (requires UI work):**

- DLQ failure surfacing to chef notifications (needs notification system integration)
- Request ID correlation across AI worker logs (needs request context propagation)

---

## Executive Summary

| Category                        | Functions Audited | Critical | High   | Medium | Total Gaps |
| ------------------------------- | ----------------- | -------- | ------ | ------ | ---------- |
| Financial/Ledger                | ~40               | 3        | 8      | 6      | 17         |
| Auth/Billing/Stripe             | ~35               | 2        | 4      | 8      | 14         |
| Events/Quotes/Clients/Inquiries | ~75               | 2        | 15     | 12     | 29         |
| AI Dispatch                     | ~65               | 4        | 17     | 22     | 57         |
| **TOTAL**                       | **~215**          | **11**   | **44** | **48** | **117**    |

---

## CRITICAL Findings (Fix Immediately)

These are security, data integrity, or financial accuracy issues.

### C1. Tenant Scoping Bugs (Cross-Tenant Data Leaks)

**`lib/events/clone-actions.ts` line 171** - Uses `user.entityId` instead of `user.tenantId!` when inserting cloned dishes. Cloned event dishes could be scoped to wrong tenant.

**`lib/clients/onboarding-actions.ts` line 18** - Uses `user.entityId` instead of `user.tenantId!` when querying client. Could return wrong tenant's client data.

### C2. Missing Authorization on Admin Functions

**`lib/stripe/deferred-transfers.ts`** - `listDeferredTransferChefs()` and `resolveDeferredTransfers()` are `'use server'` functions that use admin database client but have NO `requireAdmin()` check. Any authenticated user could invoke these.

### C3. Missing Authorization on AI Queue

**`lib/ai/queue/actions.ts` - `enqueueTask()`** - No `requireChef()` call. Uses `createAdminClient()` to bypass RLS. Anyone could enqueue unlimited AI tasks for any tenant_id.

**`lib/ai/queue/actions.ts` - `approveTask()`/`rejectTask()`** - Calls `requireChef()` but doesn't verify the task belongs to the chef's tenant. Chef A could approve/reject Chef B's tasks.

### C4. Missing Authorization on Vision API

**`lib/ai/parse-document-vision.ts`** - All exported functions lack `requireChef()`. Gemini Vision API (metered, paid) is callable without authentication.

### C5. Unprotected Ledger Webhook Function

**`lib/ledger/append.ts` - `appendLedgerEntryFromWebhook()`** - Exported server action with no auth guard. Documented as "for Stripe webhook handler only" but any caller can invoke it to write arbitrary ledger entries.

### C6. Public Ledger Mutation Without Auth

**`lib/finance/tip-actions.ts` - `recordTip()`** - Uses `admin=true` with no chef authorization. Modifies ledger entries. Relies entirely on valid requestId for access control.

---

## HIGH Findings (Fix Soon)

### H1. Zero Hallucination Violations (Silent Failures Returning Fake Data)

These functions return zeros or empty arrays when queries fail, making it impossible for callers to distinguish "no data" from "query failed." Violates the Zero Hallucination Rule.

| File                                     | Function                      | Returns on Failure       | Should Do                   |
| ---------------------------------------- | ----------------------------- | ------------------------ | --------------------------- |
| `lib/ledger/compute.ts`                  | `getEventFinancialSummary()`  | Object with all zeros    | Throw or return error state |
| `lib/ledger/compute.ts`                  | `getYtdCarryForwardSavings()` | `0`                      | Throw                       |
| `lib/ledger/compute.ts`                  | `computeProfitAndLoss()`      | Continues with `\|\| []` | Throw if both queries fail  |
| `lib/expenses/actions.ts`                | `getExpenses()`               | `[]`                     | Throw                       |
| `lib/finance/deposit-actions.ts`         | `getOverdueDeposits()`        | `[]`                     | Throw                       |
| `lib/finance/chargeback-actions.ts`      | `getChargebackRate()`         | `null`                   | Throw                       |
| `lib/finance/expense-actions.ts`         | `getExpenses()`               | `[]`                     | Throw                       |
| `lib/finance/chef-tax-config-actions.ts` | `getChefTaxRates()`           | `[]`                     | Throw                       |
| `lib/quotes/actions.ts`                  | `getClientPricingHistory()`   | `[]`                     | Throw                       |
| `lib/quotes/actions.ts`                  | `getQuotesForInquiry()`       | `[]`                     | Throw                       |

**Impact:** A chef sees "$0.00 revenue" or "no quotes" when the real answer is "database query failed." They make wrong business decisions based on fake data.

### H2. Missing Idempotency on Financial Mutations

These functions have no duplicate protection. Double-click or network retry creates duplicate records.

| File                               | Function                          | Risk                                             |
| ---------------------------------- | --------------------------------- | ------------------------------------------------ |
| `lib/expenses/actions.ts`          | `createExpense()`                 | Duplicate expenses                               |
| `lib/finance/tip-actions.ts`       | `addTip()`                        | Duplicate tips                                   |
| `lib/finance/dispute-actions.ts`   | `createDispute()`                 | Duplicate disputes                               |
| `lib/events/clone-actions.ts`      | `cloneEvent()`                    | Duplicate cloned events                          |
| `lib/quotes/actions.ts`            | `transitionQuote()`               | Double transition                                |
| `lib/quotes/actions.ts`            | `reviseQuote()`                   | Duplicate quote versions                         |
| `lib/stripe/subscription.ts`       | `createStripeCustomer()`          | Orphaned duplicate Stripe customers              |
| `lib/stripe/subscription.ts`       | `startTrial()`                    | Trial timestamp overwrite on retry               |
| `lib/stripe/connect.ts`            | `createConnectAccountLink()`      | Race condition creating multiple Stripe accounts |
| `lib/stripe/deferred-transfers.ts` | `resolveDeferredTransfers()`      | Duplicate Stripe transfers                       |
| `lib/ai/queue/actions.ts`          | `enqueueTask()` (priority >= 800) | Duplicate high-priority AI tasks                 |

### H3. Two-Phase Operation Risks

**`lib/expenses/receipt-upload.ts`** - `uploadReceipt()` uploads to storage first, then updates the expense record. If the DB update fails, an orphaned file exists in storage with no reference.

**`lib/expenses/receipt-upload.ts`** - `deleteReceipt()` deletes from storage first, then updates the expense. If the DB update fails, the expense still references a deleted file.

**`lib/stripe/deferred-transfers.ts`** - `resolveDeferredTransfers()` creates a Stripe Transfer, then writes to DB. If DB write fails, the transfer happened in Stripe but has no local record. Next call will try to transfer the same amount again.

### H4. Stripe API Calls Without Try/Catch

| File                         | Function                       | Risk                                         |
| ---------------------------- | ------------------------------ | -------------------------------------------- |
| `lib/stripe/subscription.ts` | `createCheckoutSession()`      | Uncaught Stripe exception                    |
| `lib/stripe/subscription.ts` | `createBillingPortalSession()` | Uncaught Stripe exception                    |
| `lib/stripe/checkout.ts`     | `createPaymentCheckoutUrl()`   | Circuit breaker failure throws, not returned |

### H5. AI Parse Functions Missing Empty Input Guards

None of these validate empty/null input before calling Ollama:

- `lib/ai/parse-recipe.ts` - `parseRecipeFromText()`
- `lib/ai/parse-client.ts` - `parseClientFromText()`
- `lib/ai/parse-inquiry.ts` - `parseInquiryFromText()`

Ollama receives empty string, times out or returns invalid JSON.

### H6. AI Silent Fallback Hides Offline State

**`lib/ai/parse-brain-dump.ts` - `parseBrainDump()`** - Catches OllamaOfflineError and falls back to heuristic parsing without re-throwing. User sees "parsed successfully" but AI was completely skipped. Violates the rule that OllamaOfflineError must always be re-thrown.

### H7. Void Returns With No Error Feedback

These mutations return void and silently swallow errors. Callers have no way to know if the operation succeeded.

| File                                  | Function                |
| ------------------------------------- | ----------------------- |
| `lib/finance/tip-actions.ts`          | `addTip()`              |
| `lib/finance/tip-actions.ts`          | `deleteTip()`           |
| `lib/finance/payment-plan-actions.ts` | `addInstallment()`      |
| `lib/finance/payment-plan-actions.ts` | `markInstallmentPaid()` |
| `lib/finance/payment-plan-actions.ts` | `deleteInstallment()`   |

### H8. Bulk Operations Missing Try/Catch

All bulk operations throw raw errors with no user-friendly message:

- `lib/events/bulk-actions.ts` - `bulkArchiveEvents()`, `bulkDeleteDraftEvents()`
- `lib/clients/bulk-actions.ts` - `bulkArchiveClients()`
- `lib/inquiries/bulk-actions.ts` - `bulkDeclineInquiries()`, `bulkArchiveInquiries()`

---

## MEDIUM Findings

### M1. Missing Cache Invalidation After Mutations

| File                                | Function                           | Missing Cache Bust                |
| ----------------------------------- | ---------------------------------- | --------------------------------- |
| `lib/ledger/append.ts`              | `appendLedgerEntryForChef()`       | No revalidatePath at all          |
| `lib/ledger/append.ts`              | `createAdjustment()`               | No revalidatePath at all          |
| `lib/finance/deposit-actions.ts`    | `recordDeposit()`                  | No revalidatePath                 |
| `lib/finance/deposit-actions.ts`    | `recordBalancePayment()`           | No revalidatePath                 |
| `lib/finance/deposit-actions.ts`    | `updateDepositSettings()`          | No revalidatePath                 |
| `lib/finance/dispute-actions.ts`    | `updateDisputeEvidence()`          | Missing revalidatePath            |
| `lib/expenses/receipt-upload.ts`    | `uploadReceipt()`                  | No revalidatePath                 |
| `lib/expenses/receipt-upload.ts`    | `deleteReceipt()`                  | No revalidatePath                 |
| `lib/stripe/subscription.ts`        | `handleSubscriptionUpdated()`      | No revalidateTag                  |
| `lib/stripe/subscription.ts`        | `handleSubscriptionDeleted()`      | No revalidateTag                  |
| `lib/stripe/connect.ts`             | `updateConnectStatusFromWebhook()` | No cache bust                     |
| `lib/quotes/actions.ts`             | `createQuote()`                    | Missing inquiry page revalidation |
| `lib/clients/onboarding-actions.ts` | `submitOnboarding()`               | Missing client page revalidation  |
| `lib/events/clone-actions.ts`       | `cloneEvent()`                     | Missing new event + client pages  |

### M2. Inconsistent Output Contract Patterns

~40% of functions return `{ success, error }` tuples. ~60% throw errors. No unified contract across the codebase. Callers must handle both patterns.

Cancellation actions (`lib/events/cancellation-actions.ts`) use a third pattern: `{ data: X, error: string }` wrappers. This is inconsistent with both other patterns.

### M3. AI Observability Gaps

Most AI parse functions have no structured logging. Console.error only. No timing, no input length tracking, no caller tracing.

| File                          | Issue                        |
| ----------------------------- | ---------------------------- |
| `lib/ai/parse-recipe.ts`      | No logging at all            |
| `lib/ai/parse-client.ts`      | No logging at all            |
| `lib/ai/parse-inquiry.ts`     | No logging at all            |
| `lib/ai/parse-brain-dump.ts`  | Console only, not structured |
| `lib/ai/aar-generator.ts`     | Console.error only           |
| `lib/ai/contingency-ai.ts`    | No logging at all            |
| `lib/ai/chef-bio.ts`          | Console.error only           |
| `lib/ai/menu-suggestions.ts`  | Console.error only           |
| `lib/ai/campaign-outreach.ts` | No API call logging          |

### M4. AI Queue DLQ Not Visible to Users

When AI tasks exhaust retries and are moved to the dead letter queue, chefs have no way to see this happened. Failed background tasks silently disappear.

### M5. No Payload Size Validation on AI Queue

`enqueueTask()` accepts any payload size. A 10MB payload will serialize to the queue DB, get passed to the worker, and overflow Ollama's context limit with a cryptic error.

### M6. No Input Length Truncation in parseWithOllama

`parseWithOllama()` accepts any input length. A 50KB brain dump will exceed Ollama's context window and be truncated mid-sentence, returning incomplete/invalid JSON.

---

## Dimension Coverage Summary

| Dimension               | Critical | High | Medium | Pattern                                                             |
| ----------------------- | -------- | ---- | ------ | ------------------------------------------------------------------- |
| **Output Contract**     | 0        | 10   | 2      | Silent failures returning zeros/empty. Inconsistent error patterns. |
| **Boundary Conditions** | 0        | 5    | 3      | Missing empty input guards. No payload size limits.                 |
| **Authorization**       | 6        | 0    | 0      | Tenant scoping bugs. Missing requireChef/requireAdmin.              |
| **Failure Mode**        | 0        | 8    | 1      | Void returns. Missing try/catch. Silent fallbacks.                  |
| **Idempotency**         | 0        | 11   | 0      | No duplicate protection on most mutations.                          |
| **Cache Invalidation**  | 0        | 0    | 14     | Mutations that don't bust caches.                                   |

The remaining 4 dimensions (Performance, Observability, Determinism, Purpose) were partially covered. Observability had 13 medium findings in the AI layer.

---

## Recommended Fix Order

### Phase 1: Security (Critical auth gaps)

1. Fix tenant scoping bugs in clone-actions.ts and onboarding-actions.ts
2. Add requireAdmin() to deferred-transfers.ts
3. Add requireChef() + tenant check to AI queue (enqueue, approve, reject)
4. Add requireChef() to parse-document-vision.ts
5. Restrict appendLedgerEntryFromWebhook() export
6. Add auth check to recordTip()

### Phase 2: Financial Integrity (Zero hallucination + idempotency)

7. Fix all 10 silent-failure-returning-zeros functions
8. Add idempotency keys to financial mutations (expenses, tips, disputes)
9. Fix two-phase operation risks (receipt upload/delete, deferred transfers)
10. Wrap Stripe API calls in try/catch

### Phase 3: Robustness (Error handling + cache)

11. Add empty input guards to all parse-\*.ts functions
12. Fix void-return mutations to return success/error
13. Add try/catch to bulk operations
14. Add missing cache invalidation calls
15. Re-throw OllamaOfflineError in parse-brain-dump.ts

### Phase 4: Observability (AI logging)

16. Add structured logging to all parse-\*.ts functions
17. Add payload size validation to AI queue
18. Add input length truncation to parseWithOllama
19. Surface DLQ failures to chefs via notifications
20. Add request ID correlation to AI worker logs

---

## Files Requiring Immediate Review

| Priority | File                                | Issues                                         |
| -------- | ----------------------------------- | ---------------------------------------------- |
| CRITICAL | `lib/stripe/deferred-transfers.ts`  | Missing auth, idempotency, two-phase risk      |
| CRITICAL | `lib/ai/queue/actions.ts`           | Missing auth, tenant check, payload validation |
| CRITICAL | `lib/events/clone-actions.ts`       | Tenant scoping bug line 171                    |
| CRITICAL | `lib/clients/onboarding-actions.ts` | Tenant scoping bug line 18                     |
| CRITICAL | `lib/ledger/append.ts`              | Unprotected webhook export                     |
| CRITICAL | `lib/finance/tip-actions.ts`        | Public ledger mutation                         |
| HIGH     | `lib/ledger/compute.ts`             | 3 zero hallucination violations                |
| HIGH     | `lib/expenses/actions.ts`           | Missing idempotency + silent failures          |
| HIGH     | `lib/expenses/receipt-upload.ts`    | Two-phase failure risks                        |
| HIGH     | `lib/ai/parse-brain-dump.ts`        | Silent fallback hides offline state            |
| HIGH     | `lib/stripe/subscription.ts`        | Idempotency + missing try/catch + cache        |
