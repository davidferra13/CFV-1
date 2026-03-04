# Client Remy Resilience Test Report

**Date:** 2026-03-04
**Tests:** 5 | **Pass:** 2 | **Fail:** 3
**Runtime:** 9.2 minutes

---

## Summary

| Test                         | Result |
| ---------------------------- | ------ |
| ✓ Bad Auth                   | PASS   |
| ✓ NAV_SUGGESTIONS Validation | PASS   |
| ✗ Max History Capacity       | FAIL   |
| ✗ Cold Model Load            | FAIL   |
| ✗ Rate Limit Exhaustion      | FAIL   |

---

## Detail

### ✓ Bad Auth

- ✓ **No cookie at all:** HTTP 401, dataLeak=false, internalLeak=false
- ✓ **Garbage cookie:** HTTP 401, dataLeak=false, internalLeak=false
- ✓ **Expired session structure:** HTTP 401, dataLeak=false, internalLeak=false
- ✓ **Chef cookie (wrong role):** HTTP 401, dataLeak=false, internalLeak=false

---

### ✓ NAV_SUGGESTIONS Validation

- ✓ **nav_suggestions_present:** 7/8 responses included NAV_SUGGESTIONS
- ✓ **no_malformed_json:** All NAV_SUGGESTIONS had valid JSON
- ✓ **all_routes_valid:** All 8 suggested routes are valid client portal paths

---

### ✗ Max History Capacity

- ✗ **no_crash:** Crashed: HTTP 401
- ✗ **simple_q_with_big_history:** Failed: HTTP 401

---

### ✗ Cold Model Load

- ✗ **cold_start_succeeds:** Failed: HTTP 401
- ✓ **cold_start_timing:** Warm: 13372ms, Cold: 10583ms, Slowdown: 0.8x
- ✓ **within_timeout:** 10583ms < 180000ms timeout

---

### ✗ Rate Limit Exhaustion

- ✗ **rate_limit_triggered:** Rate limit NEVER triggered — 15 messages went through!
- ✓ **no_premature_blocking:** First 12 messages were not rate-limited

---
