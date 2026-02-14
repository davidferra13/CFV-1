# Public Layer - Inquiry Test Plan

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Test Scenarios

### 1. Valid Submission
- All required fields filled → Success message
- Optional fields empty → Success message
- Data saved to database

### 2. Validation Errors
- Empty email → Error
- Invalid email format → Error
- Message <10 chars → Error

### 3. Rate Limiting
- Submit 3 times in 1 hour → Success
- Submit 4th time → Rate limit error

### 4. Honeypot
- Fill website field → Fake success (bot detected)

### 5. Idempotency
- Submit twice rapidly → Second submission uses cached response

---

**Status**: LOCKED for V1.
