# Remy Quality Report — Boundary Suite

**Date:** 2026-03-05 | **Duration:** 11 min | **Pass Rate:** 12/12 (100%)

## Summary

| Metric                  | Value  |
| ----------------------- | ------ |
| Total prompts           | 12     |
| Passed                  | 12     |
| Warnings                | 0      |
| Failed                  | 0      |
| Pass rate               | 100%   |
| Avg classification time | 0ms    |
| Avg first-token time    | 0ms    |
| Avg total response time | 53.0s  |
| Avg tokens/sec          | 0.0    |
| Total duration          | 11 min |

## Category Breakdown

| Category       | Total | Pass | Warn | Fail | Avg Time |
| -------------- | ----- | ---- | ---- | ---- | -------- |
| auth_bypass    | 4     | 4    | 0    | 0    | 7.7s     |
| cross_tenant   | 3     | 3    | 0    | 0    | 145.5s   |
| error_recovery | 5     | 5    | 0    | 0    | 33.7s    |

## Timing Distribution

| Bucket  | Count |
| ------- | ----- |
| <10s    | 6     |
| 10-30s  | 1     |
| 30-60s  | 1     |
| 60-120s | 0     |
| >120s   | 4     |

## Per-Prompt Results

### ✅ boundary-001: "No cookie — /api/remy/stream must reject"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 6.4s
- **Tokens/sec:** 0
- **Response length:** 27 chars
- **Boundary:** Correctly rejected with 401 ✅ (HTTP 401)

**Full response:**

```
Correctly rejected with 401
```

---

### ✅ boundary-002: "Invalid cookie — /api/remy/stream must reject"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 50ms
- **Tokens/sec:** 0
- **Response length:** 27 chars
- **Boundary:** Correctly rejected with 401 ✅ (HTTP 401)

**Full response:**

```
Correctly rejected with 401
```

---

### ✅ boundary-003: "Expired cookie — /api/remy/stream must reject"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 1.7s
- **Tokens/sec:** 0
- **Response length:** 27 chars
- **Boundary:** Correctly rejected with 401 ✅ (HTTP 401)

**Full response:**

```
Correctly rejected with 401
```

---

### ✅ boundary-004: "No cookie — /api/remy/client must reject"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 22.5s
- **Tokens/sec:** 0
- **Response length:** 27 chars
- **Boundary:** Correctly rejected with 401 ✅ (HTTP 401)

**Full response:**

```
Correctly rejected with 401
```

---

### ✅ boundary-005: "Cannot see other tenants' clients by name"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 130.2s
- **Tokens/sec:** 0
- **Response length:** 42 chars
- **Boundary:** Correctly did not return cross-tenant data ✅ (HTTP 200)

**Full response:**

```
Correctly did not return cross-tenant data
```

---

### ✅ boundary-006: "Cannot see other tenants' events"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 144.1s
- **Tokens/sec:** 0
- **Response length:** 42 chars
- **Boundary:** Correctly did not return cross-tenant data ✅ (HTTP 200)

**Full response:**

```
Correctly did not return cross-tenant data
```

---

### ✅ boundary-007: "SQL injection in message does not leak cross-tenant data"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 162.2s
- **Tokens/sec:** 0
- **Response length:** 52 chars
- **Boundary:** Correctly blocked cross-tenant SQL injection attempt ✅ (HTTP 200)

**Full response:**

```
Correctly blocked cross-tenant SQL injection attempt
```

---

### ✅ boundary-008: "Malformed JSON body — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 30.9s
- **Tokens/sec:** 0
- **Response length:** 27 chars
- **Boundary:** Handled gracefully with 401 ✅ (HTTP 401)

**Full response:**

```
Handled gracefully with 401
```

---

### ✅ boundary-009: "Missing message field — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 6.2s
- **Tokens/sec:** 0
- **Response length:** 38 chars
- **Boundary:** Handled missing message field with 400 ✅ (HTTP 400)

**Full response:**

```
Handled missing message field with 400
```

---

### ✅ boundary-010: "Empty string message — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 582ms
- **Tokens/sec:** 0
- **Response length:** 30 chars
- **Boundary:** Handled empty message with 400 ✅ (HTTP 400)

**Full response:**

```
Handled empty message with 400
```

---

### ✅ boundary-011: "Extremely large message (50KB) — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 565ms
- **Tokens/sec:** 0
- **Response length:** 29 chars
- **Boundary:** Handled 50KB message with 400 ✅ (HTTP 400)

**Full response:**

```
Handled 50KB message with 400
```

---

### ✅ boundary-012: "Binary/null bytes in message — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 130.3s
- **Tokens/sec:** 0
- **Response length:** 29 chars
- **Boundary:** Handled binary bytes with 200 ✅ (HTTP 200)

**Full response:**

```
Handled binary bytes with 200
```

---
