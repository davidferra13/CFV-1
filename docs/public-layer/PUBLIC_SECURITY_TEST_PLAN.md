# Public Layer - Security Test Plan

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Test Scenarios

### 1. XSS Prevention
- Submit `<script>alert('XSS')</script>` in inquiry form
- Verify script is stripped, not executed

### 2. CSRF Protection
- Submit form from external origin
- Verify request is rejected (403)

### 3. SQL Injection
- Submit `' OR '1'='1` in form fields
- Verify no SQL error, no unauthorized access

### 4. Service Role Key Exposure
- Search client bundles for service role key
- Verify ZERO results

### 5. RLS Bypass Attempt
- Try to read events table as unauthenticated user
- Verify query returns empty/error

---

**Status**: LOCKED for V1.
