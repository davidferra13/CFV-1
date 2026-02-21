# Build: Phase 7b — Test Quality Cleanup

**Branch:** `feature/scheduling-improvements`
**Date:** 2026-02-20
**Status:** Complete — test suite closed out

---

## What Changed

A post-Phase-7 audit found 76 instances of `const _ = X` across 23 spec files. This pattern assigns a value to a throwaway variable and asserts nothing — tests using it always pass regardless of what the page actually renders.

### Fix Applied

Two-rule treatment applied to all 76 occurrences:

**REMOVED** (conditional UI — element only appears in certain data states):

- `const _ = isVisible` — 44 instances (buttons like "Send to Client", "Convert to Inquiry", etc.)
- `const _ = hasCampaignContent` — campaign UI depends on having campaigns seeded
- `const _ = hasPriceComparison` — depends on API keys being configured
- `const _ = hasMealMe` — optional third-party integration
- `const _ = hasWix` — optional Wix integration
- `const _ = hasUpload` — upload UI varies by implementation
- `const _ = hasInvoice` — invoice only exists after creation
- `const _ = hasField` — form field labels vary

**CONVERTED TO REAL ASSERTIONS** (element is guaranteed to exist):

- `const _ = hasContent` → `expect(hasContent, 'page should display relevant content').toBeTruthy()`
- `const _ = hasMenuContent` → `expect(hasMenuContent, 'menu section should be visible').toBeTruthy()`
- `const _ = hasPaymentContent` → `expect(hasPaymentContent, 'payment section should be visible').toBeTruthy()`
- `const _ = expenseVisible` → `expect(expenseVisible, 'created expense should appear in list after save').toBeTruthy()`
- `const _ = hasStep1` → `expect(hasStep1, 'close-out step 1 should render content').toBeTruthy()`
- `const _ = hasWarning` → `expect(hasWarning, 'delete account page must show danger warning').toBeTruthy()`
- `const _ = hasFinancialContent` → `expect(hasFinancialContent, 'financial content should be visible').toBeTruthy()`

### Files Modified (23)

12, 14, 16, 22, 23, 24, 25, 26, 27, 28, 29, 31, 35, 36, 37, 38, 39, 40, 41, 42, 46, 47, 48

---

## Final Test Count

```
1,486 real tests across 73 spec files
```

(Slight decrease from 1,495 reflects removal of dead `const _ =` blocks that were counted as test lines by grep but contained no assertions.)

---

## Test Suite Status: CLOSED

All discoverable chef-facing routes now have at least one test. All tests contain real assertions. The suite is ready for CI integration.

| Layer                     | Files  | Tests     |
| ------------------------- | ------ | --------- |
| Smoke                     | 1      | 6         |
| E2E                       | 17     | 127       |
| Coverage                  | 6      | 377       |
| Interactions (all phases) | 49     | ~976      |
| **Total**                 | **73** | **1,486** |
