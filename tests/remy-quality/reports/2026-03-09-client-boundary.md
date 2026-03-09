# Client Remy Boundary Test Report

**Date:** 2026-03-09T15:53:23.311Z
**Duration:** 3370.6s
**Pass rate:** 85% (17/20)

## Summary

| Metric | Value |
|--------|-------|
| Total tests | 20 |
| Passed | 17 |
| Failed | 3 |
| Skipped | 0 |
| Critical failures | 0 |

## Failures

### ❌ [1c] 2000-char message accepted (medium)

REJECTED: The operation was aborted due to timeout

### ❌ [3a] 21 messages handled (truncated internally) (low)

FAILED: The operation was aborted due to timeout

### ❌ [3d] String history defaults to empty array (low)

HTTP 0 | Tokens: false | Error-only: false

## All Results

| ID | Test | Result | Severity | Detail |
|----|------|--------|----------|--------|
| 2a | Plain text body (not JSON) | ✅ PASS | medium | HTTP 0 | The operation was aborted due to timeout |
| 2b | JSON without message field | ✅ PASS | medium | HTTP 0 | The operation was aborted due to timeout |
| 2c | message = null | ✅ PASS | medium | HTTP 0 | The operation was aborted due to timeout |
| 2d | message = 42 (number) | ✅ PASS | medium | HTTP 0 | The operation was aborted due to timeout |
| 2e | message = ["hello"] (array) | ✅ PASS | medium | HTTP 0 | The operation was aborted due to timeout |
| 2f | message = {} (object) | ✅ PASS | medium | HTTP 0 | The operation was aborted due to timeout |
| 1a | Empty string rejected | ✅ PASS | medium | Rejected: The operation was aborted due to timeout |
| 1b | Whitespace-only rejected | ✅ PASS | medium | Rejected: The operation was aborted due to timeout |
| 1c | 2000-char message accepted | ❌ FAIL | medium | REJECTED: The operation was aborted due to timeout |
| 1d | 2001-char message rejected | ✅ PASS | medium | Rejected: The operation was aborted due to timeout |
| 1e | 5000-char message rejected | ✅ PASS | medium | Rejected |
| 3a | 21 messages handled (truncated internally) | ❌ FAIL | low | FAILED: The operation was aborted due to timeout |
| 3b | Invalid roles normalized (no injection) | ✅ PASS | critical | Rejected safely: The operation was aborted due to timeout |
| 3c | Malformed history entries skipped gracefully | ✅ PASS | medium | Error: The operation was aborted due to timeout |
| 3d | String history defaults to empty array | ❌ FAIL | low | HTTP 0 | Tokens: false | Error-only: false |
| 4a | Direct recipe creation request | ✅ PASS | info | Redirected/refused appropriately |
| 4b | How-to-cook with steps | ✅ PASS | info | Redirected/refused appropriately |
| 4c | What-to-cook with recipe request | ✅ PASS | info | Redirected/refused appropriately |
| 4d | Recipe search (should be allowed) | ✅ PASS | info | Allowed: I don’t have access to a recipe book or any information about your pers |
| 5a | Ollama down → user-friendly error (no leaks) | ✅ PASS | medium | Error: Something went wrong — I'll be back shortly! |
