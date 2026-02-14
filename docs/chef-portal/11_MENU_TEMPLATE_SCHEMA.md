# Menu Template Schema (V1)

```sql
CREATE TABLE menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),

  name TEXT NOT NULL,
  description TEXT,

  is_draft BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE event_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  template_id UUID REFERENCES menu_templates(id),

  version INTEGER NOT NULL DEFAULT 1,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_templates_tenant ON menu_templates(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_event_menus_event ON event_menus(event_id);
CREATE UNIQUE INDEX idx_event_menus_version ON event_menus(event_id, version);
```

---

## TypeScript Types

```typescript
export interface MenuTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_draft: boolean;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface EventMenu {
  id: string;
  event_id: string;
  template_id: string | null;
  version: number;
  is_locked: boolean;
  locked_at: Date | null;
  locked_by: string | null;
  created_at: Date;
  updated_at: Date;
}
```

---

**End of Menu Template Schema**
