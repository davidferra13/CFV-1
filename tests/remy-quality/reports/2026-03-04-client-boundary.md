# Client Remy Boundary Test Report

**Date:** 2026-03-04T17:55:25.155Z
**Duration:** 173.1s
**Pass rate:** 75% (15/20)

## Summary

| Metric            | Value |
| ----------------- | ----- |
| Total tests       | 20    |
| Passed            | 15    |
| Failed            | 5     |
| Skipped           | 0     |
| Critical failures | 1     |

## Failures

### ❌ [1c] 2000-char message accepted (medium)

REJECTED: HTTP 401: {"error":"Unauthorized"}

### ❌ [3a] 21 messages handled (truncated internally) (low)

FAILED: HTTP 401: {"error":"Unauthorized"}

### ❌ [3b] Invalid roles normalized (no injection) (critical)

Role injection safely ignored

### ❌ [3d] String history defaults to empty array (low)

HTTP 401 | Tokens: false | Error-only: false

### ❌ [4d] Recipe search (should be allowed) (medium)

BLOCKED (false positive): HTTP 401: {"error":"Unauthorized"}

## All Results

| ID  | Test                                         | Result  | Severity | Detail                                                                           |
| --- | -------------------------------------------- | ------- | -------- | -------------------------------------------------------------------------------- | ------------- | ----------------- |
| 2a  | Plain text body (not JSON)                   | ✅ PASS | medium   | HTTP 0                                                                           | fetch failed  |
| 2b  | JSON without message field                   | ✅ PASS | medium   | HTTP 0                                                                           | fetch failed  |
| 2c  | message = null                               | ✅ PASS | medium   | HTTP 0                                                                           | fetch failed  |
| 2d  | message = 42 (number)                        | ✅ PASS | medium   | HTTP 0                                                                           | fetch failed  |
| 2e  | message = ["hello"] (array)                  | ✅ PASS | medium   | HTTP 0                                                                           | fetch failed  |
| 2f  | message = {} (object)                        | ✅ PASS | medium   | HTTP 0                                                                           | fetch failed  |
| 1a  | Empty string rejected                        | ✅ PASS | medium   | Rejected: HTTP 400: {"error":"Invalid request body — message field is required a |
| 1b  | Whitespace-only rejected                     | ✅ PASS | medium   | Rejected: Empty ticket, chef — nothing on it 📝 What's on your mind?             |
| 1c  | 2000-char message accepted                   | ❌ FAIL | medium   | REJECTED: HTTP 401: {"error":"Unauthorized"}                                     |
| 1d  | 2001-char message rejected                   | ✅ PASS | medium   | Rejected: HTTP 401: {"error":"Unauthorized"}                                     |
| 1e  | 5000-char message rejected                   | ✅ PASS | medium   | Rejected                                                                         |
| 3a  | 21 messages handled (truncated internally)   | ❌ FAIL | low      | FAILED: HTTP 401: {"error":"Unauthorized"}                                       |
| 3b  | Invalid roles normalized (no injection)      | ❌ FAIL | critical | Role injection safely ignored                                                    |
| 3c  | Malformed history entries skipped gracefully | ✅ PASS | medium   | Error: HTTP 401: {"error":"Unauthorized"}                                        |
| 3d  | String history defaults to empty array       | ❌ FAIL | low      | HTTP 401                                                                         | Tokens: false | Error-only: false |
| 4a  | Direct recipe creation request               | ✅ PASS | info     | Redirected/refused appropriately                                                 |
| 4b  | How-to-cook with steps                       | ✅ PASS | info     | Redirected/refused appropriately                                                 |
| 4c  | What-to-cook with recipe request             | ✅ PASS | info     | Redirected/refused appropriately                                                 |
| 4d  | Recipe search (should be allowed)            | ❌ FAIL | medium   | BLOCKED (false positive): HTTP 401: {"error":"Unauthorized"}                     |
| 5a  | Ollama down → user-friendly error (no leaks) | ✅ PASS | medium   | Error: HTTP 401: {"error":"Unauthorized"}                                        |
