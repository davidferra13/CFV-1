# Menu Free Text Blocks (V1)

## Purpose

Allow chef to add freeform text between sections (e.g., notes, wine pairings, special instructions).

---

## Schema Extension

```sql
ALTER TABLE menu_sections ADD COLUMN is_text_block BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE menu_sections ADD COLUMN text_content TEXT;
```

---

## Creating Text Block

```typescript
async function createTextBlock(data: {
  menuId: string;
  content: string;
  sortOrder?: number;
}) {
  return await db.menu_sections.create({
    data: {
      event_menu_id: data.menuId,
      title: '', // Empty for text blocks
      is_text_block: true,
      text_content: data.content,
      sort_order: data.sortOrder || 0,
    },
  });
}
```

---

## Rendering

```tsx
{sections.map((section) => (
  section.is_text_block ? (
    <div key={section.id} className="menu-text-block">
      <p>{section.text_content}</p>
    </div>
  ) : (
    <MenuSection key={section.id} section={section} />
  )
))}
```

---

**End of Menu Free Text Blocks**
