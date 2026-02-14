# Public Layer - Auth Test Plan

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Test Scenarios

### 1. Chef Signup
- Valid data → Creates user, redirects to /dashboard
- Duplicate email → Shows error
- Invalid email → Shows validation error

### 2. Client Signup
- Valid invitation → Creates user, redirects to /my-events
- Expired invitation → Shows error
- Used invitation → Shows error

### 3. Signin
- Valid credentials (chef) → Redirects to /dashboard
- Valid credentials (client) → Redirects to /my-events
- Invalid credentials → Shows generic error

### 4. Middleware Redirects
- Authenticated chef visits /signin → Redirects to /dashboard
- Authenticated client visits /signup → Redirects to /my-events

---

**Status**: LOCKED for V1.
