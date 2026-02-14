# Menu Chef Internal Notes (V1)

## Purpose

Chef-private prep notes that are **never shown to clients**.

---

## Schema

```sql
ALTER TABLE menu_items ADD COLUMN chef_notes TEXT;
```

---

## Usage

```typescript
async function updateChefNotes(itemId: string, notes: string) {
  await db.menu_items.update({
    where: { id: itemId },
    data: { chef_notes: notes },
  });
}
```

---

## Chef Portal Display

```tsx
<div className="chef-only">
  <label>Internal Prep Notes</label>
  <textarea
    value={chefNotes}
    onChange={(e) => updateChefNotes(item.id, e.target.value)}
    placeholder="Prep instructions, sourcing notes, timing..."
  />
</div>
```

---

## Client Portal Projection

**NEVER** include `chef_notes` in client-facing queries:

```typescript
// ✅ CORRECT
async function getMenuForClient(menuId: string) {
  return await db.event_menus.findUnique({
    where: { id: menuId },
    include: {
      sections: {
        include: {
          items: {
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
}
```

---

**End of Menu Chef Internal Notes**
