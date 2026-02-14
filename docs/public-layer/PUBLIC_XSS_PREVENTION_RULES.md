# Public Layer - XSS Prevention Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Prevention Methods

### 1. Input Sanitization
Strip HTML tags from all text inputs.

### 2. React Auto-Escaping
React automatically escapes JSX variables (built-in XSS protection).

### 3. Content Security Policy
CSP headers prevent inline script execution.

### 4. NO dangerouslySetInnerHTML
NEVER use `dangerouslySetInnerHTML` unless absolutely necessary (and sanitized).

---

**Status**: LOCKED for V1.
