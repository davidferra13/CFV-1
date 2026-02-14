# Public Layer - Inquire Submission Flow

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Submission Flow

```
User fills form
  ↓
User clicks "Submit"
  ↓
Client-side validation
  ↓
[Valid?] NO → Show errors, stop
  ↓ YES
Disable submit button, show loading
  ↓
POST to Server Action
  ↓
Server-side validation
  ↓
[Valid?] NO → Return error
  ↓ YES
Honeypot check
  ↓
[Bot?] YES → Return fake success
  ↓ NO
Rate limit check
  ↓
[Exceeded?] YES → Return rate limit error
  ↓ NO
Idempotency check
  ↓
[Duplicate?] YES → Return cached response
  ↓ NO
Insert into database
  ↓
Return success
  ↓
Show success message
```

---

**Status**: LOCKED for V1.
