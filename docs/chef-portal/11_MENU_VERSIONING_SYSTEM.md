# Menu Versioning System (V1)

## Version Numbering

Menus use integer versioning starting at 1.

Each event can have multiple menu versions:
- Version 1: Initial menu
- Version 2: First revision
- Version 3: Second revision
- etc.

---

## Creating New Version

```typescript
async function createMenuVersion(eventId: string) {
  // Get current max version
  const maxVersion = await db.event_menus.findFirst({
    where: { event_id: eventId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const newVersion = (maxVersion?.version || 0) + 1;

  // Get current menu
  const currentMenu = await db.event_menus.findFirst({
    where: { event_id: eventId, version: maxVersion?.version },
    include: { sections: { include: { items: true } } },
  });

  // Create new version (copy current)
  const newMenu = await db.event_menus.create({
    data: {
      event_id: eventId,
      version: newVersion,
      is_locked: false,
    },
  });

  // Copy sections and items
  for (const section of currentMenu.sections) {
    const newSection = await db.menu_sections.create({
      data: {
        event_menu_id: newMenu.id,
        title: section.title,
        description: section.description,
        sort_order: section.sort_order,
      },
    });

    for (const item of section.items) {
      await db.menu_items.create({
        data: {
          section_id: newSection.id,
          name: item.name,
          description: item.description,
          sort_order: item.sort_order,
        },
      });
    }
  }

  return newMenu;
}
```

---

## Get Active Version

```typescript
async function getActiveMenuVersion(eventId: string) {
  return await db.event_menus.findFirst({
    where: { event_id: eventId },
    orderBy: { version: 'desc' },
    include: {
      sections: {
        include: { items: true },
        orderBy: { sort_order: 'asc' },
      },
    },
  });
}
```

---

## Version History

```typescript
async function getMenuVersionHistory(eventId: string) {
  return await db.event_menus.findMany({
    where: { event_id: eventId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      is_locked: true,
      locked_at: true,
      created_at: true,
    },
  });
}
```

---

**End of Menu Versioning System**
