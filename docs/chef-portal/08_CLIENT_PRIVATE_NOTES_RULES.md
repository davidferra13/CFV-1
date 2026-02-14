# Client Private Notes Rules (V1)

## Purpose

**Chef private notes** are internal observations about a client that must NEVER be visible to the client or any other tenant.

---

## Storage

Stored in `client_profiles.chef_private_notes` (TEXT field, unlimited length).

---

## Access Rules

### Rule 1: Never Return to Client

Client-facing queries must explicitly exclude this field:

```typescript
// ✅ CORRECT: Explicit projection
async function getClientProfileForClient(linkedUserId: string) {
  return await db.client_profiles.findUnique({
    where: { linked_user_id: linkedUserId },
    select: {
      id: true,
      full_name: true,
      email: true,
      phone: true,
      // chef_private_notes: EXCLUDED
      // tags: EXCLUDED
    },
  });
}

// ❌ WRONG: Returns all fields
async function getClientProfileForClient(linkedUserId: string) {
  return await db.client_profiles.findUnique({
    where: { linked_user_id: linkedUserId },
  });
}
```

---

### Rule 2: RLS Does Not Expose

Even if RLS allows client to SELECT their profile, chef_private_notes must be excluded via projection.

---

### Rule 3: Chef-Only Editing

Only chef (or chef_subaccount with permission) can edit private notes:

```typescript
async function updatePrivateNotes(clientId: string, notes: string, chefId: string) {
  const client = await db.client_profiles.findUnique({
    where: { id: clientId },
  });

  if (client.tenant_id !== chefId) {
    throw new Error('Access denied');
  }

  await db.client_profiles.update({
    where: { id: clientId },
    data: { chef_private_notes: notes },
  });
}
```

---

## UI Display

### Chef Portal

```tsx
<div className="chef-private-section">
  <label>Private Notes (Client Cannot See)</label>
  <textarea
    value={privateNotes}
    onChange={(e) => setPrivateNotes(e.target.value)}
    placeholder="Internal notes about this client..."
  />
</div>
```

---

### Client Portal

This field is **never rendered**. No UI component should reference it.

---

## Use Cases

- Dietary restrictions (internal tracking)
- Preferences (e.g., "likes spicy food")
- Communication history ("called 3 times, always late")
- Special handling ("VIP client, always prioritize")

---

**End of Client Private Notes Rules**
