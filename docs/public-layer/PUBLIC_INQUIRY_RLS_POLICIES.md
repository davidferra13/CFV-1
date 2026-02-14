# Public Layer - Inquiry RLS Policies

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## RLS Policies for `inquiries` Table

### Policy 1: Public Insert
```sql
CREATE POLICY inquiries_public_insert ON inquiries
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts
```

**Purpose**: Allow unauthenticated users to submit inquiries via public form.

---

### Policy 2: Chef Select (Chef Portal)
```sql
-- Note: This policy is defined in Chef Portal docs, not Public Layer
-- Chefs can read all inquiries in their system
CREATE POLICY inquiries_chef_select ON inquiries
  FOR SELECT
  USING (
    get_current_user_role() = 'chef'
  );
```

**Purpose**: Chefs can view inquiries submitted via public form.

---

### Policy 3: No Public Select
- Public users CANNOT read inquiries table
- Only INSERT is allowed

---

### Policy 4: No Public Update/Delete
- Public users CANNOT modify or delete inquiries
- Inquiries are immutable once submitted

---

## RLS Enablement

```sql
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
```

---

**Status**: RLS policies are LOCKED for V1.
