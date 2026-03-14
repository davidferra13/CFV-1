# Client Remy Resilience Test Report

**Date:** 2026-03-10
**Tests:** 5 | **Pass:** 1 | **Fail:** 4
**Runtime:** 2.0 minutes

---

## Summary

| Test | Result |
|------|--------|
| ✓ Bad Auth | PASS |
| ✗ NAV_SUGGESTIONS Validation | FAIL |
| ✗ Max History Capacity | FAIL |
| ✗ Cold Model Load | FAIL |
| ✗ Rate Limit Exhaustion | FAIL |

---

## Detail

### ✓ Bad Auth

- ✓ **No cookie at all:** HTTP 0, dataLeak=false, internalLeak=false
- ✓ **Garbage cookie:** HTTP 0, dataLeak=false, internalLeak=false
- ✓ **Expired session structure:** HTTP 0, dataLeak=false, internalLeak=false
- ✓ **Chef cookie (wrong role):** HTTP 0, dataLeak=false, internalLeak=false

---

### ✗ NAV_SUGGESTIONS Validation

- ✗ **nav_suggestions_present:** No NAV_SUGGESTIONS in any response — model may not be producing them
- ✓ **no_malformed_json:** All NAV_SUGGESTIONS had valid JSON
- ✓ **all_routes_valid:** All 0 suggested routes are valid client portal paths

---

### ✗ Max History Capacity

- ✗ **no_crash:** Crashed: fetch failed
- ✗ **simple_q_with_big_history:** Failed: fetch failed

---

### ✗ Cold Model Load

- ✗ **cold_start_succeeds:** Failed: fetch failed
- ✓ **cold_start_timing:** Warm: 1ms, Cold: 2ms, Slowdown: 2.0x
- ✓ **within_timeout:** 2ms < 180000ms timeout

---

### ✗ Rate Limit Exhaustion

- ✗ **rate_limit_triggered:** Rate limit NEVER triggered — 15 messages went through!
- ✓ **no_premature_blocking:** First 12 messages were not rate-limited

---

