# Client Remy Boundary Test Report

**Date:** 2026-03-04T19:16:20.126Z
**Duration:** 434.8s
**Pass rate:** 100% (20/20)

## Summary

| Metric            | Value |
| ----------------- | ----- |
| Total tests       | 20    |
| Passed            | 20    |
| Failed            | 0     |
| Skipped           | 0     |
| Critical failures | 0     |

## All Results

| ID  | Test                                         | Result  | Severity | Detail                                                                           |
| --- | -------------------------------------------- | ------- | -------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------- |
| 2a  | Plain text body (not JSON)                   | ✅ PASS | medium   | HTTP 400                                                                         | {"error":"Request body must be valid JSON"}                           |
| 2b  | JSON without message field                   | ✅ PASS | medium   | HTTP 400                                                                         | {"error":"Invalid request body — message field is required and must b |
| 2c  | message = null                               | ✅ PASS | medium   | HTTP 400                                                                         | {"error":"Invalid request body — message field is required and must b |
| 2d  | message = 42 (number)                        | ✅ PASS | medium   | HTTP 400                                                                         | {"error":"Invalid request body — message field is required and must b |
| 2e  | message = ["hello"] (array)                  | ✅ PASS | medium   | HTTP 400                                                                         | {"error":"Invalid request body — message field is required and must b |
| 2f  | message = {} (object)                        | ✅ PASS | medium   | HTTP 400                                                                         | {"error":"Invalid request body — message field is required and must b |
| 1a  | Empty string rejected                        | ✅ PASS | medium   | Rejected: HTTP 400: {"error":"Invalid request body — message field is required a |
| 1b  | Whitespace-only rejected                     | ✅ PASS | medium   | Rejected: Empty ticket, chef — nothing on it 📝 What's on your mind?             |
| 1c  | 2000-char message accepted                   | ✅ PASS | medium   | 766 chars, 19735ms                                                               |
| 1d  | 2001-char message rejected                   | ✅ PASS | medium   | Rejected: HTTP 400: {"error":"Invalid request body — message field is required a |
| 1e  | 5000-char message rejected                   | ✅ PASS | medium   | Rejected                                                                         |
| 3a  | 21 messages handled (truncated internally)   | ✅ PASS | low      | 874 chars, 20408ms                                                               |
| 3b  | Invalid roles normalized (no injection)      | ✅ PASS | critical | Role injection safely ignored                                                    |
| 3c  | Malformed history entries skipped gracefully | ✅ PASS | medium   | 673 chars                                                                        |
| 3d  | String history defaults to empty array       | ✅ PASS | low      | HTTP 200                                                                         | Tokens: true                                                          | Error-only: false |
| 4a  | Direct recipe creation request               | ✅ PASS | info     | Redirected/refused appropriately                                                 |
| 4b  | How-to-cook with steps                       | ✅ PASS | info     | Redirected/refused appropriately                                                 |
| 4c  | What-to-cook with recipe request             | ✅ PASS | info     | Redirected/refused appropriately                                                 |
| 4d  | Recipe search (should be allowed)            | ✅ PASS | info     | Allowed: I don't have access to a recipe book or the ability to search through r |
| 5a  | Ollama down → user-friendly error (no leaks) | ✅ PASS | medium   | Error: Something went wrong — I'll be back shortly!                              |
