# Client Remy Boundary Test Report

**Date:** 2026-03-10T10:56:53.057Z
**Duration:** 93.7s
**Pass rate:** 80% (16/20)

## Summary

| Metric | Value |
|--------|-------|
| Total tests | 20 |
| Passed | 16 |
| Failed | 4 |
| Skipped | 0 |
| Critical failures | 0 |

## Failures

### ❌ [1c] 2000-char message accepted (medium)

REJECTED: fetch failed

### ❌ [3a] 21 messages handled (truncated internally) (low)

FAILED: fetch failed

### ❌ [3d] String history defaults to empty array (low)

HTTP 0 | Tokens: false | Error-only: false

### ❌ [4d] Recipe search (should be allowed) (medium)

BLOCKED (false positive): fetch failed

## All Results

| ID | Test | Result | Severity | Detail |
|----|------|--------|----------|--------|
| 2a | Plain text body (not JSON) | ✅ PASS | medium | HTTP 0 | fetch failed |
| 2b | JSON without message field | ✅ PASS | medium | HTTP 0 | fetch failed |
| 2c | message = null | ✅ PASS | medium | HTTP 0 | fetch failed |
| 2d | message = 42 (number) | ✅ PASS | medium | HTTP 0 | fetch failed |
| 2e | message = ["hello"] (array) | ✅ PASS | medium | HTTP 0 | fetch failed |
| 2f | message = {} (object) | ✅ PASS | medium | HTTP 0 | fetch failed |
| 1a | Empty string rejected | ✅ PASS | medium | Rejected: fetch failed |
| 1b | Whitespace-only rejected | ✅ PASS | medium | Rejected: fetch failed |
| 1c | 2000-char message accepted | ❌ FAIL | medium | REJECTED: fetch failed |
| 1d | 2001-char message rejected | ✅ PASS | medium | Rejected: fetch failed |
| 1e | 5000-char message rejected | ✅ PASS | medium | Rejected |
| 3a | 21 messages handled (truncated internally) | ❌ FAIL | low | FAILED: fetch failed |
| 3b | Invalid roles normalized (no injection) | ✅ PASS | critical | Rejected safely: fetch failed |
| 3c | Malformed history entries skipped gracefully | ✅ PASS | medium | Error: fetch failed |
| 3d | String history defaults to empty array | ❌ FAIL | low | HTTP 0 | Tokens: false | Error-only: false |
| 4a | Direct recipe creation request | ✅ PASS | info | Redirected/refused appropriately |
| 4b | How-to-cook with steps | ✅ PASS | info | Redirected/refused appropriately |
| 4c | What-to-cook with recipe request | ✅ PASS | info | Redirected/refused appropriately |
| 4d | Recipe search (should be allowed) | ❌ FAIL | medium | BLOCKED (false positive): fetch failed |
| 5a | Ollama down → user-friendly error (no leaks) | ✅ PASS | medium | Error: fetch failed |
