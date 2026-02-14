# Menu Event Linking (V1)

## Linking Methods

### 1. Use Existing Template
```typescript
async function linkTemplateToEvent(eventId: string, templateId: string) {
  // Copy template to event menu
  const template = await db.menu_templates.findUnique({
    where: { id: templateId },
    include: { sections: { include: { items: true } } },
  });

  const eventMenu = await db.event_menus.create({
    data: {
      event_id: eventId,
      template_id: templateId,
      version: 1,
      is_locked: false,
    },
  });

  // Copy sections and items
  for (const section of template.sections) {
    const newSection = await db.menu_sections.create({
      data: {
        event_menu_id: eventMenu.id,
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

  return eventMenu;
}
```

### 2. Create From Scratch
```typescript
async function createBlankEventMenu(eventId: string) {
  return await db.event_menus.create({
    data: {
      event_id: eventId,
      version: 1,
      is_locked: false,
    },
  });
}
```

---

## One Menu Per Event

Each event has exactly one active menu (latest version).

---

**End of Menu Event Linking**
