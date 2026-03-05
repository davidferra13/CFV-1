# Remy Quality Report — Chef Suite

**Date:** 2026-03-05 | **Duration:** 3 min | **Pass Rate:** 0/1 (0%)

## Summary

| Metric                  | Value  |
| ----------------------- | ------ |
| Total prompts           | 1      |
| Passed                  | 0      |
| Warnings                | 0      |
| Failed                  | 1      |
| Pass rate               | 0%     |
| Avg classification time | 0ms    |
| Avg first-token time    | 0ms    |
| Avg total response time | 180.0s |
| Avg tokens/sec          | 0.0    |
| Total duration          | 3 min  |

## Category Breakdown

| Category          | Total | Pass | Warn | Fail | Avg Time |
| ----------------- | ----- | ---- | ---- | ---- | -------- |
| business_overview | 1     | 0    | 0    | 1    | 180.0s   |

## Timing Distribution

| Bucket  | Count |
| ------- | ----- |
| <10s    | 0     |
| 10-30s  | 0     |
| 30-60s  | 0     |
| 60-120s | 0     |
| >120s   | 1     |

## Failures

### chef-001: "How's my business doing?"

- **request:** {"pass":false,"status":null,"error":"Error: Prompt timeout after 180000ms"}
- **Response time:** 180.0s
- **Response excerpt:** [empty]

## Per-Prompt Results

### ❌ chef-001: "How's my business doing?"

- **Verdict:** FAIL
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 180.0s
- **Tokens/sec:** 0
- **Response length:** 0 chars

**Full response:**

```
[no response text]
```

---
