# Remy Quality Report — Boundary Suite

**Date:** 2026-03-04 | **Duration:** 1 min | **Pass Rate:** 9/12 (75%)

## Summary

| Metric                  | Value |
| ----------------------- | ----- |
| Total prompts           | 12    |
| Passed                  | 9     |
| Warnings                | 0     |
| Failed                  | 3     |
| Pass rate               | 75%   |
| Avg classification time | 0ms   |
| Avg first-token time    | 0ms   |
| Avg total response time | 7.0s  |
| Avg tokens/sec          | 0.0   |
| Total duration          | 1 min |

## Category Breakdown

| Category       | Total | Pass | Warn | Fail | Avg Time |
| -------------- | ----- | ---- | ---- | ---- | -------- |
| auth_bypass    | 4     | 1    | 0    | 3    | 64ms     |
| cross_tenant   | 3     | 3    | 0    | 0    | 15.8s    |
| error_recovery | 5     | 5    | 0    | 0    | 7.3s     |

## Timing Distribution

| Bucket  | Count |
| ------- | ----- |
| <10s    | 10    |
| 10-30s  | 0     |
| 30-60s  | 2     |
| 60-120s | 0     |
| >120s   | 0     |

## Failures

### boundary-001: "No cookie — /api/remy/stream must reject"

- **boundaryCheck:** DANGER: returned 200 without auth — data may be exposed
- **Response time:** 28ms
- **Response excerpt:** DANGER: returned 200 without auth — data may be exposed

### boundary-002: "Invalid cookie — /api/remy/stream must reject"

- **boundaryCheck:** DANGER: returned 200 with invalid cookie
- **Response time:** 33ms
- **Response excerpt:** DANGER: returned 200 with invalid cookie

### boundary-003: "Expired cookie — /api/remy/stream must reject"

- **boundaryCheck:** DANGER: returned 200 with expired token
- **Response time:** 171ms
- **Response excerpt:** DANGER: returned 200 with expired token

## Per-Prompt Results

### ❌ boundary-001: "No cookie — /api/remy/stream must reject"

- **Verdict:** FAIL
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 28ms
- **Tokens/sec:** 0
- **Response length:** 55 chars
- **Boundary:** DANGER: returned 200 without auth — data may be exposed ❌ (HTTP 200)

**Full response:**

```
DANGER: returned 200 without auth — data may be exposed
```

---

### ❌ boundary-002: "Invalid cookie — /api/remy/stream must reject"

- **Verdict:** FAIL
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 33ms
- **Tokens/sec:** 0
- **Response length:** 40 chars
- **Boundary:** DANGER: returned 200 with invalid cookie ❌ (HTTP 200)

**Full response:**

```
DANGER: returned 200 with invalid cookie
```

---

### ❌ boundary-003: "Expired cookie — /api/remy/stream must reject"

- **Verdict:** FAIL
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 171ms
- **Tokens/sec:** 0
- **Response length:** 39 chars
- **Boundary:** DANGER: returned 200 with expired token ❌ (HTTP 200)

**Full response:**

```
DANGER: returned 200 with expired token
```

---

### ✅ boundary-004: "No cookie — /api/remy/client must reject"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 25ms
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
- **Classification:** n/a | **First token:** n/a | **Total:** 809ms
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
- **Classification:** n/a | **First token:** n/a | **Total:** 1.7s
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
- **Classification:** n/a | **First token:** n/a | **Total:** 44.9s
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
- **Classification:** n/a | **First token:** n/a | **Total:** 326ms
- **Tokens/sec:** 0
- **Response length:** 27 chars
- **Boundary:** Handled gracefully with 200 ✅ (HTTP 200)

**Full response:**

```
Handled gracefully with 200
```

---

### ✅ boundary-009: "Missing message field — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 603ms
- **Tokens/sec:** 0
- **Response length:** 38 chars
- **Boundary:** Handled missing message field with 200 ✅ (HTTP 200)

**Full response:**

```
Handled missing message field with 200
```

---

### ✅ boundary-010: "Empty string message — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 590ms
- **Tokens/sec:** 0
- **Response length:** 30 chars
- **Boundary:** Handled empty message with 200 ✅ (HTTP 200)

**Full response:**

```
Handled empty message with 200
```

---

### ✅ boundary-011: "Extremely large message (50KB) — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 568ms
- **Tokens/sec:** 0
- **Response length:** 29 chars
- **Boundary:** Handled 50KB message with 200 ✅ (HTTP 200)

**Full response:**

```
Handled 50KB message with 200
```

---

### ✅ boundary-012: "Binary/null bytes in message — must not crash"

- **Verdict:** PASS
- **Intent:** n/a
- **Classification:** n/a | **First token:** n/a | **Total:** 34.4s
- **Tokens/sec:** 0
- **Response length:** 29 chars
- **Boundary:** Handled binary bytes with 200 ✅ (HTTP 200)

**Full response:**

```
Handled binary bytes with 200
```

---
