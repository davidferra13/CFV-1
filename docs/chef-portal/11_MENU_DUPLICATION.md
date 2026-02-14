# Menu Duplication (V1)

## Duplicate Template

Create a copy of an existing menu template:

```typescript
async function duplicateMenuTemplate(templateId: string, newName: string) {
  const original = await db.menu_templates.findUnique({
    where: { id: templateId },
    include: { sections: { include: { items: true } } },
  });

  const duplicate = await db.menu_templates.create({
    data: {
      tenant_id: original.tenant_id,
      name: newName,
      description: `Copy of ${original.name}`,
      is_draft: true,
    },
  });

  // Copy sections and items
  for (const section of original.sections) {
    const newSection = await db.menu_sections.create({
      data: {
        template_id: duplicate.id,
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

  return duplicate;
}
```

---

## Use Cases

- Create variations of popular menus
- Seasonal menu updates
- Client-specific customizations

---

**End of Menu Duplication**
