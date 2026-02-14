# Public Layer - Inquiry DB Insert Rules

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Insert Flow

```
Validated data received
  ↓
Sanitize inputs (strip HTML)
  ↓
Prepare insert payload
  ↓
Execute INSERT query
  ↓
Return inserted record ID
```

---

## Insert Implementation

```typescript
'use server';
import { createClient } from '@/lib/supabase/server';

export async function insertInquiry(data: InquirySchemaType) {
  const supabase = createClient();

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      event_date: data.eventDate || null,
      guest_count: data.guestCount || null,
      message: data.message,
      // created_at is auto-set by database
    })
    .select()
    .single();

  if (error) {
    console.error('Inquiry insert failed', error);
    throw new Error('Unable to submit inquiry');
  }

  return inquiry;
}
```

---

## Database Permissions

**RLS Policy**:
```sql
-- Public can insert inquiries (no auth required)
CREATE POLICY inquiries_public_insert ON inquiries
  FOR INSERT
  WITH CHECK (true);
```

**Service Role**: NOT required (anonymous inserts allowed via anon key)

---

## Null Handling

Optional fields MUST be set to `null` (not empty string):
```typescript
{
  phone: data.phone || null,  // ✅ Correct
  phone: data.phone || '',    // ❌ Wrong (empty string != null)
}
```

---

## Error Handling

```typescript
try {
  await insertInquiry(data);
  return { success: true };
} catch (error) {
  console.error('Insert error', error);
  return {
    success: false,
    error: 'Unable to submit inquiry. Please try again.',
  };
}
```

---

**Status**: DB insert rules are LOCKED for V1.
