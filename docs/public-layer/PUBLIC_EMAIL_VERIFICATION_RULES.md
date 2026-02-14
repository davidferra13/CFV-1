# Public Layer - Email Verification Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## V1 Decision: Email Verification DISABLED

**Rule**: Users can sign up and sign in immediately without email verification.

### Rationale
1. Simplifies onboarding (no email bounce issues)
2. Invitation-based client signup inherently validates email
3. Reduces friction for chefs (faster signup → faster revenue)
4. Can enable later if spam becomes issue

---

## V1.1 Consideration: Enable Email Verification

If spam or fake accounts become issue:

1. Enable in Supabase Dashboard: Auth → Settings → "Confirm email"
2. Update signup flows to show "Check your email" message
3. Handle unverified users appropriately

**Status**: Email verification is DISABLED for V1.
