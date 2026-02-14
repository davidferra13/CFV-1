# Public Layer - Query Minimization Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Rule

Minimize database queries on public pages.

---

## V1 Compliance

- **Marketing pages**: ZERO database queries (static content)
- **Inquiry form**: ONE INSERT query (on submission only)
- **Signup/Signin**: Handled by Supabase Auth (optimized)

---

## Performance Target

- Page render: 0 queries (SSG)
- Form submission: <50ms for INSERT

---

**Status**: LOCKED for V1.
