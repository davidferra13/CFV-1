# Menu Draft vs Shared (V1)

## States

### Draft
- Chef is working on menu
- Not visible to client
- Can be edited freely

### Shared
- Chef has shared menu with client
- Client can view (read-only)
- Chef can still edit (creates new version)

### Locked
- Menu finalized
- Immutable
- Client and chef both see locked version

---

## Sharing Flow

```typescript
async function shareMenuWithClient(eventMenuId: string) {
  const menu = await db.event_menus.findUnique({
    where: { id: eventMenuId },
  });

  if (menu.is_locked) {
    throw new Error('Cannot share locked menu');
  }

  // Update event to indicate menu is shared
  await db.events.update({
    where: { id: menu.event_id },
    data: { menu_shared_at: new Date() },
  });

  // Optionally: Send notification to client
  await notifyClientMenuShared(menu.event_id);
}
```

---

## Client View Query

```typescript
async function getSharedMenuForClient(eventId: string, clientUserId: string) {
  const event = await db.events.findFirst({
    where: {
      id: eventId,
      client_profile: { linked_user_id: clientUserId },
    },
    include: {
      event_menu: {
        where: { version: { equals: db.$raw('(SELECT MAX(version) FROM event_menus WHERE event_id = ${eventId})') } },
        include: {
          sections: {
            include: { items: true },
            orderBy: { sort_order: 'asc' },
          },
        },
      },
    },
  });

  return event?.event_menu;
}
```

---

**End of Menu Draft vs Shared**
