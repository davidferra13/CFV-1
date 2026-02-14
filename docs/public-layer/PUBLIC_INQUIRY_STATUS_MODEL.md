# Public Layer - Inquiry Status Model

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## V1 Decision: No Status Tracking in Public Layer

**Rule**: Inquiries have NO status field in V1.

**Rationale**:
- Public layer is submit-only (no follow-up UI)
- Inquiry management happens in Chef Portal (out of Public Layer scope)
- Status tracking adds complexity without V1 value

---

## V1.1 Consideration

If inquiry status tracking is needed:
```sql
ALTER TABLE inquiries ADD COLUMN status TEXT
DEFAULT 'new'
CHECK (status IN ('new', 'contacted', 'converted', 'closed'));
```

**Status NOT implemented in V1.**
