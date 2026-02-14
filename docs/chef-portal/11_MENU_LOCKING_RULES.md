# Menu Locking Rules (V1)

## Purpose

Locking a menu makes it **immutable**, preventing accidental changes after client approval.

---

## Lock Conditions

Menu can be locked when:
1. Event is in `confirmed` status or later
2. Menu has at least one section with items
3. Menu is not already locked

---

## Lock Function

```typescript
async function lockMenu(eventMenuId: string, userId: string) {
  const menu = await db.event_menus.findUnique({
    where: { id: eventMenuId },
    include: { event: true, sections: { include: { items: true } } },
  });

  if (menu.is_locked) {
    throw new Error('Menu already locked');
  }

  if (menu.sections.length === 0) {
    throw new Error('Cannot lock empty menu');
  }

  await db.event_menus.update({
    where: { id: eventMenuId },
    data: {
      is_locked: true,
      locked_at: new Date(),
      locked_by: userId,
    },
  });

  // Optionally: Transition event status to menu_locked
  if (menu.event.status === 'menu_in_progress') {
    await transitionEvent({
      eventId: menu.event_id,
      toStatus: 'menu_locked',
      triggeredBy: userId,
      notes: 'Menu locked by chef',
    });
  }
}
```

---

## Unlock Function

```typescript
async function unlockMenu(eventMenuId: string) {
  const menu = await db.event_menus.findUnique({
    where: { id: eventMenuId },
  });

  if (!menu.is_locked) {
    return; // Already unlocked
  }

  // Only allow unlock if event hasn't been executed
  const event = await db.events.findUnique({
    where: { id: menu.event_id },
  });

  if (['executed', 'closed'].includes(event.status)) {
    throw new Error('Cannot unlock menu for completed events');
  }

  await db.event_menus.update({
    where: { id: eventMenuId },
    data: {
      is_locked: false,
      locked_at: null,
      locked_by: null,
    },
  });
}
```

---

## Immutability Enforcement

```sql
CREATE OR REPLACE FUNCTION prevent_locked_menu_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_locked = true THEN
    RAISE EXCEPTION 'Cannot modify locked menu';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_menu_edit_when_locked
BEFORE UPDATE ON event_menus
FOR EACH ROW
EXECUTE FUNCTION prevent_locked_menu_edit();
```

---

**End of Menu Locking Rules**
