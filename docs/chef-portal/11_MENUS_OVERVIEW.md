# Menus Overview (V1)

## Two Menu Types

### 1. Menu Templates
Reusable menus created by chef, not tied to specific events.

### 2. Event Menus
Menus linked to specific events, can be based on templates or created from scratch.

---

## Menu Lifecycle

1. **Draft**: Chef creates/edits menu
2. **Shared**: Chef shares draft with client for review
3. **Locked**: Menu finalized, becomes immutable
4. **Versioned**: Changes create new versions, not edits

---

## Core Operations

### Create Menu Template
```typescript
async function createMenuTemplate(data: {
  tenantId: string;
  name: string;
  description?: string;
}) {
  return await db.menu_templates.create({
    data: {
      tenant_id: data.tenantId,
      name: data.name,
      description: data.description,
      is_draft: true,
    },
  });
}
```

### Link Menu to Event
```typescript
async function linkMenuToEvent(eventId: string, templateId?: string) {
  return await db.event_menus.create({
    data: {
      event_id: eventId,
      template_id: templateId,
      is_locked: false,
      version: 1,
    },
  });
}
```

---

## V1 Scope

### Included
- Menu templates (reusable)
- Event menus (event-specific)
- Lock/unlock mechanism
- Basic versioning

### Excluded
- Advanced versioning (diff viewer)
- Menu cost calculations
- Ingredient inventory tracking
- Nutritional information

---

**End of Menus Overview**
