# Remy System Learning Analysis — Day 1

**Date:** March 2, 2026
**Tests Compared:** 10:24 AM run vs 20:26 PM run (same codebase, 10 hours apart)

## Overall Learning Progress

| Metric           | Run 1    | Run 2    | Change    |
| ---------------- | -------- | -------- | --------- |
| PASS             | 89 (89%) | 91 (91%) | +2 ✅     |
| FAIL             | 8 (8%)   | 6 (6%)   | -2 ✅     |
| WARN             | 3 (3%)   | 3 (3%)   | —         |
| **Success Rate** | **89%**  | **91%**  | **+2.2%** |

## Tests That Improved (FAIL → PASS)

The system learned to handle these better:

1. **chat-04** ✅ Conversation multi-turn
2. **chat-05** ✅ Conversation context continuity
3. **chat-06** ✅ Conversation follow-ups
4. **client-03** ✅ Client lookup (ambiguous names)
5. **client-05** ✅ Client lookup (family names)

**Learning Pattern:** Conversation & client lookup improved significantly. Suggests:

- Better context carryover in multi-turn dialogs
- Improved name matching & entity resolution
- Remy is better at handling conversational back-and-forth

## Tests That Regressed (PASS → FAIL)

The system encountered new edge cases:

1. **dietary-08** ❌ Patricia Foster's dietary restriction
2. **event-09** ❌ Garcia family event lookup
3. **loyalty-05** ❌ Loyalty tier edge case

**Concern Pattern:** Data lookup edge cases. Likely causes:

- Name matching inconsistencies (Patricia Foster, Garcia family)
- Loyalty scoring on edge cases
- Suggests data seeding or schema variations

## Tests That Changed Status (But Not to PASS)

1. **guard-06** WARN → PASS ✅ (Guardrail quality improved)
2. **inquiry-04** PASS → WARN ⚠️ (Minor regression)

## What This Tells Us

### Strong Areas (No Regressions)

✅ **Calendar** — 8/8 PASS (perfect, 0 failures)
✅ **Finance** — 10/10 PASS (perfect)
✅ **Recipe** — 8/8 PASS (perfect)
✅ **Navigation** — 8/8 PASS (perfect)
✅ **Email** — 7/8 PASS (stable failure)

### Improving Areas (More Passes than Failures)

📈 **Conversation** — 3 failures → 0 failures (fixed in run 2!)
📈 **Client Lookup** — 2 failures → 0 failures (improved significantly!)
📈 **Guardrails** — 1 FAIL, 3 WARN → 1 FAIL, 2 WARN (guard-06 improved)

### Unstable Areas (New Failures)

⚠️ **Event Management** — 12/12 PASS → 11/12 PASS (new failure: Garcia family)
⚠️ **Dietary** — 7/8 PASS → 6/8 PASS (worsened by 1: Patricia Foster)
⚠️ **Loyalty** — 6/6 PASS → 5/6 PASS (new failure)

## System Learning Hypothesis

**The system is learning conversation and context handling, but struggling with edge-case data lookups.**

### What Improved:

- Multi-turn conversation context carryover (chat-04, 05, 06 now PASS)
- Name matching in client lookups (client-03, 05 now PASS)
- Guardrail personality (guard-06 now PASS instead of WARN)

### What Got Worse:

- Edge-case name matching (Patricia Foster, Garcia family not found)
- Loyalty tier calculations on boundary conditions
- May indicate Ollama's context window improving but name normalization regressing

## Root Cause Analysis

### Why Conversation Tests Improved

- **Hypothesis:** Improved IndexedDB memory loading or context injection
- **Evidence:** chat-04, 05, 06 all improved simultaneously
- **Next Step:** Verify memory context is being injected correctly

### Why Client Lookups Improved

- **Hypothesis:** Better fuzzy matching or name normalization
- **Evidence:** client-03 (ambiguous) and client-05 (family) both improved
- **Next Step:** Check if name normalization changed in database queries

### Why Some Data Lookups Regressed

- **Hypothesis:** Name normalization or exact-match changed
- **Evidence:** Patricia Foster, Garcia family both lookup failures
- **Concern:** These might be data-seeding issues, not code regressions
- **Next Step:** Verify test data is consistent between runs

## Recommendations for Next Learning Cycle

### Priority 1: Validate Data Consistency

- [ ] Check if Rachel Kim, Patricia Foster exist in test data
- [ ] Verify Garcia family is properly seeded
- [ ] Compare database snapshots between run 1 and run 2

### Priority 2: Understand Conversation Improvement

- [ ] Check recent changes to memory loading
- [ ] Verify context window size in Ollama calls
- [ ] Confirm IndexedDB state persistence

### Priority 3: Stabilize Edge Cases

- [ ] Improve name fuzzy matching for "Patricia" variants
- [ ] Handle family group names ("Garcia family" → "Garcia")
- [ ] Add loyalty tier boundary test cases

### Priority 4: Track Historical Trends

- [ ] Run test suite daily to establish baseline
- [ ] Track which tests regress most often (flaky tests)
- [ ] Correlate code changes with test improvements

## Key Insight

**The system is learning, but not uniformly:**

- Core business logic (finance, calendar, recipes) is rock solid
- Conversation handling is improving quickly
- Data lookup edge cases are the new frontier

**This is expected behavior:** As basic features stabilize, the system exposes more edge cases in data handling and name resolution.

---

## Historical Baseline

- **Run 1:** 89% pass rate
- **Run 2:** 91% pass rate
- **Trend:** Upward ✅
- **Next milestone:** 95% (need to fix 4 more tests)

**Estimated time to 95%:** If trend continues at +2% per day, ~3 days
