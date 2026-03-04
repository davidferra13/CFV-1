# Client Remy Boundary Test Report

**Date:** 2026-03-04T17:25:39.375Z
**Duration:** 319.2s
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
| 1c  | 2000-char message accepted                   | ✅ PASS | medium   | 890 chars, 22222ms                                                               |
| 1d  | 2001-char message rejected                   | ✅ PASS | medium   | Rejected: HTTP 400: {"error":"Invalid request body — message field is required a |
| 1e  | 5000-char message rejected                   | ✅ PASS | medium   | Rejected                                                                         |
| 3a  | 21 messages handled (truncated internally)   | ✅ PASS | low      | 810 chars, 19860ms                                                               |
| 3b  | Invalid roles normalized (no injection)      | ✅ PASS | critical | Role injection safely ignored                                                    |
| 3c  | Malformed history entries skipped gracefully | ✅ PASS | medium   | 464 chars                                                                        |
| 3d  | String history defaults to empty array       | ✅ PASS | low      | HTTP 200                                                                         | Tokens: true                                                          | Error-only: false |
| 4a  | Direct recipe creation request               | ✅ PASS | info     | Response (1122 chars): Oh, pasta carbonara! That's a classic — creamy, rich, and |
| 4b  | How-to-cook with steps                       | ✅ PASS | info     | Response (717 chars): Oh, chicken parmesan is such a comforting dish! 🍝 I wish  |
| 4c  | What-to-cook with recipe request             | ✅ PASS | info     | Response (754 chars): Hey Alice! I know you're looking for a dinner recipe, but  |
| 4d  | Recipe search (should be allowed)            | ✅ PASS | info     | Allowed: I don't have access to a recipe book or the ability to search through r |
| 5a  | Ollama down → user-friendly error (no leaks) | ✅ PASS | medium   | Error: Something went wrong — I'll be back shortly!                              |
