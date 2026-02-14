# Menu Audit Log (V1)

## Tracked Actions

- Menu created
- Menu edited
- Menu shared with client
- Menu locked
- Menu unlocked
- New version created

---

## Audit Table Schema

```sql
CREATE TABLE menu_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_menu_id UUID NOT NULL REFERENCES event_menus(id),
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_audit_event_menu ON menu_audit_log(event_menu_id);
```

---

## Logging Function

```typescript
async function logMenuAction(
  eventMenuId: string,
  action: string,
  actorId: string,
  changes?: Record<string, any>
) {
  await db.menu_audit_log.create({
    data: {
      event_menu_id: eventMenuId,
      action,
      actor_id: actorId,
      changes: changes || null,
    },
  });
}
```

---

## Example Usage

```typescript
// When locking menu
await lockMenu(menuId, userId);
await logMenuAction(menuId, 'menu_locked', userId);

// When creating new version
const newMenu = await createMenuVersion(eventId);
await logMenuAction(newMenu.id, 'version_created', userId, {
  previous_version: currentVersion,
  new_version: newVersion,
});
```

---

**End of Menu Audit Log**
