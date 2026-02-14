# Menu System Documentation

**Version**: 1.0
**Last Updated**: 2026-02-13

Guide to the basic menu system in ChefFlow V1.

---

## Overview

ChefFlow V1 includes a **basic menu CRUD system**. Chefs create menu templates and attach them to events.

**V1 Scope**: Simple menu templates only (no advanced features like multi-course builders or ingredient tracking).

---

## Database Schema

### `menus` Table

```sql
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  name TEXT NOT NULL,
  description TEXT,
  price_per_person_cents INTEGER CHECK (price_per_person_cents >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### `event_menus` Table (Many-to-Many)

```sql
CREATE TABLE event_menus (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  PRIMARY KEY (event_id, menu_id)
);
```

---

## Creating Menus

```typescript
// lib/menus/actions.ts
'use server'

export async function createMenu(data: {
  name: string
  description?: string
  price_per_person_cents?: number
}) {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: menu, error } = await supabase
    .from('menus')
    .insert({
      tenant_id: chef.tenantId,
      name: data.name,
      description: data.description,
      price_per_person_cents: data.price_per_person_cents
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: menu }
}
```

---

## Attaching Menus to Events

```typescript
// lib/menus/actions.ts
export async function attachMenuToEvent(
  eventId: string,
  menuId: string
) {
  const chef = await requireChef()
  const supabase = createServerClient()

  // Verify event ownership
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .single()

  if (event?.tenant_id !== chef.tenantId) {
    return { success: false, error: 'Unauthorized' }
  }

  // Attach menu
  const { error } = await supabase
    .from('event_menus')
    .insert({
      event_id: eventId,
      menu_id: menuId
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

---

## Listing Menus

### Chef View (All Menus)

```typescript
export async function listMenus() {
  const chef = await requireChef()
  const supabase = createServerClient()

  const { data: menus } = await supabase
    .from('menus')
    .select('*')
    .eq('tenant_id', chef.tenantId)
    .eq('is_active', true)
    .order('name')

  return menus || []
}
```

### Client View (Event Menus)

```typescript
export async function getEventMenus(eventId: string) {
  const supabase = createServerClient()

  const { data: eventMenus } = await supabase
    .from('event_menus')
    .select(`
      menu:menus(*)
    `)
    .eq('event_id', eventId)

  return eventMenus?.map(em => em.menu) || []
}
```

---

## RLS Policies

Chefs manage their menus:

```sql
CREATE POLICY menus_chef_all ON menus
  FOR ALL
  USING (
    get_current_user_role() = 'chef' AND
    tenant_id = get_current_tenant_id()
  );
```

Clients see active menus from their chef:

```sql
CREATE POLICY menus_client_select ON menus
  FOR SELECT
  USING (
    get_current_user_role() = 'client' AND
    is_active = true AND
    tenant_id = (SELECT tenant_id FROM clients WHERE id = get_current_client_id())
  );
```

---

## V1 Limitations

**Excluded from V1**:
- Multi-course menu builder
- Drag-and-drop menu designer
- Ingredient/inventory tracking
- Shopping list generation
- Dietary restrictions tracking
- Menu photos/images

These are planned for V2.

---

## Related Documentation

- [API_REFERENCE.md](./API_REFERENCE.md) - Menu functions
- [RLS_POLICIES.md](./RLS_POLICIES.md) - Menu policies

---

**Last Updated**: 2026-02-13
