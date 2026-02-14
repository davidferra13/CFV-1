# Menu Client-Safe Projection (V1)

## Purpose

Ensure clients never see internal chef data when viewing menus.

---

## Safe Query

```typescript
async function getClientSafeMenu(eventId: string) {
  const menu = await db.event_menus.findFirst({
    where: { event_id: eventId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      is_locked: true,
      sections: {
        where: { is_text_block: false },
        orderBy: { sort_order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          items: {
            orderBy: { sort_order: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              allergens: true,
              dietary_tags: true,
              // chef_notes: EXCLUDED
            },
          },
        },
      },
    },
  });

  return menu;
}
```

---

## RLS Policy

```sql
CREATE POLICY client_read_menu ON event_menus
FOR SELECT
USING (
  event_id IN (
    SELECT e.id FROM events e
    JOIN client_profiles c ON e.client_profile_id = c.id
    WHERE c.linked_user_id = auth.uid()
  )
);
```

---

## Projection Rules

### ✅ Safe for Client
- Menu name/description
- Section titles
- Item names/descriptions
- Allergens
- Dietary tags

### ❌ Never Show Client
- `chef_notes`
- Internal pricing
- Prep instructions
- Sourcing notes

---

**End of Menu Client-Safe Projection**
