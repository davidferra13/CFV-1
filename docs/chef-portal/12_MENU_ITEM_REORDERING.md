# Menu Item Reordering (V1)

## Sort Order Field

Items and sections use `sort_order` integer for ordering.

---

## Reorder Sections

```typescript
async function reorderSections(menuId: string, orderedSectionIds: string[]) {
  await db.$transaction(
    orderedSectionIds.map((sectionId, index) =>
      db.menu_sections.update({
        where: { id: sectionId },
        data: { sort_order: index },
      })
    )
  );
}
```

---

## Reorder Items

```typescript
async function reorderItems(sectionId: string, orderedItemIds: string[]) {
  await db.$transaction(
    orderedItemIds.map((itemId, index) =>
      db.menu_items.update({
        where: { id: itemId },
        data: { sort_order: index },
      })
    )
  );
}
```

---

## UI (Drag & Drop)

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export function MenuEditor({ sections }: { sections: MenuSection[] }) {
  const [items, setItems] = useState(sections);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      setItems(reordered);
      reorderSections(menuId, reordered.map((i) => i.id));
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((section) => (
          <SortableSection key={section.id} section={section} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

---

**End of Menu Item Reordering**
