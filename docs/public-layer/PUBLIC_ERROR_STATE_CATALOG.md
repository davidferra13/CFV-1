# Public Layer - Error State Catalog

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Error Categories

### 1. Validation Errors
- Invalid email format
- Required field missing
- Message too short/long

**Display**: Inline errors
**Recovery**: User corrects and resubmits

### 2. Authentication Errors
- Invalid credentials
- Orphaned account (no role)
- Account already exists

**Display**: Inline errors or redirect
**Recovery**: User corrects or contacts support

### 3. Network Errors
- Timeout
- Connection lost
- Supabase unavailable

**Display**: Inline error message
**Recovery**: User retries

### 4. Rate Limit Errors
- Too many submissions/attempts

**Display**: Error message with wait time
**Recovery**: User must wait

---

**Status**: LOCKED for V1.
