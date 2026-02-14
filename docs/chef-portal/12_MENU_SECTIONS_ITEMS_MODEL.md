# Menu Sections & Items Model (V1)

## Hierarchy

```
Menu
└── Sections (e.g., "Appetizers", "Main Course", "Desserts")
    └── Items (e.g., "Grilled Salmon", "Caesar Salad")
```

---

## Schema

```sql
CREATE TABLE menu_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_menu_id UUID REFERENCES event_menus(id),
  template_id UUID REFERENCES menu_templates(id),

  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  allergens TEXT[],
  dietary_tags TEXT[],

  chef_notes TEXT, -- Internal prep notes

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_sections_menu ON menu_sections(event_menu_id);
CREATE INDEX idx_menu_sections_template ON menu_sections(template_id);
CREATE INDEX idx_menu_items_section ON menu_items(section_id);
```

---

## TypeScript Types

```typescript
export interface MenuSection {
  id: string;
  event_menu_id: string | null;
  template_id: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  items?: MenuItem[];
  created_at: Date;
  updated_at: Date;
}

export interface MenuItem {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  allergens: string[];
  dietary_tags: string[];
  chef_notes: string | null;
  created_at: Date;
  updated_at: Date;
}
```

---

## CRUD Operations

### Create Section

```typescript
async function createMenuSection(data: {
  menuId: string;
  title: string;
  description?: string;
}) {
  const maxOrder = await db.menu_sections.findFirst({
    where: { event_menu_id: data.menuId },
    orderBy: { sort_order: 'desc' },
    select: { sort_order: true },
  });

  return await db.menu_sections.create({
    data: {
      event_menu_id: data.menuId,
      title: data.title,
      description: data.description,
      sort_order: (maxOrder?.sort_order || 0) + 1,
    },
  });
}
```

### Create Item

```typescript
async function createMenuItem(data: {
  sectionId: string;
  name: string;
  description?: string;
  allergens?: string[];
  dietaryTags?: string[];
}) {
  const maxOrder = await db.menu_items.findFirst({
    where: { section_id: data.sectionId },
    orderBy: { sort_order: 'desc' },
    select: { sort_order: true },
  });

  return await db.menu_items.create({
    data: {
      section_id: data.sectionId,
      name: data.name,
      description: data.description,
      allergens: data.allergens || [],
      dietary_tags: data.dietaryTags || [],
      sort_order: (maxOrder?.sort_order || 0) + 1,
    },
  });
}
```

---

**End of Menu Sections & Items Model**
