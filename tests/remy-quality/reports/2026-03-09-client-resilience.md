# Client Remy Resilience Test Report

**Date:** 2026-03-09
**Tests:** 5 | **Pass:** 4 | **Fail:** 1
**Runtime:** 14.3 minutes

---

## Summary

| Test | Result |
|------|--------|
| ✓ Bad Auth | PASS |
| ✓ NAV_SUGGESTIONS Validation | PASS |
| ✓ Max History Capacity | PASS |
| ✓ Cold Model Load | PASS |
| ✗ Rate Limit Exhaustion | FAIL |

---

## Detail

### ✓ Bad Auth

- ✓ **No cookie at all:** HTTP 401, dataLeak=false, internalLeak=false
- ✓ **Garbage cookie:** HTTP 401, dataLeak=false, internalLeak=false
- ✓ **Expired session structure:** HTTP 401, dataLeak=false, internalLeak=false
- ✓ **Chef cookie (wrong role):** HTTP 401, dataLeak=false, internalLeak=false

---

### ✓ NAV_SUGGESTIONS Validation

- ✓ **nav_suggestions_present:** 8/8 responses included NAV_SUGGESTIONS
- ✓ **no_malformed_json:** All NAV_SUGGESTIONS had valid JSON
- ✓ **all_routes_valid:** All 9 suggested routes are valid client portal paths

---

### ✓ Max History Capacity

- ✓ **no_crash:** Request completed
- ✓ **produced_response:** 700 chars
- ✓ **no_internal_leak:** Clean
- ✓ **no_think_leak:** Clean
- ✓ **reasonable_timing:** 30704ms
- ✓ **simple_q_with_big_history:** 435 chars in 30168ms

---

### ✓ Cold Model Load

- ✓ **cold_start_succeeds:** Got 579 chars in 21573ms
- ✓ **cold_start_timing:** Warm: 29672ms, Cold: 21573ms, Slowdown: 0.7x
- ✓ **within_timeout:** 21573ms < 180000ms timeout
- ✓ **no_think_leak:** Clean

---

### ✗ Rate Limit Exhaustion

- ✗ **rate_limit_triggered:** Rate limit NEVER triggered — 15 messages went through!
- ✓ **no_premature_blocking:** First 12 messages were not rate-limited

---

