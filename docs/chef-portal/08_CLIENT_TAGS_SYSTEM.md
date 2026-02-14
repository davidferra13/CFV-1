# Client Tags System (V1)

## Overview

Tags are simple text labels that chefs can apply to clients for categorization and filtering.

---

## Schema

```sql
ALTER TABLE client_profiles ADD COLUMN tags TEXT[];

CREATE INDEX idx_client_tags ON client_profiles USING GIN(tags);
```

---

## Operations

### Add Tag

```typescript
async function addClientTag(clientId: string, tag: string) {
  await db.$executeRaw`
    UPDATE client_profiles
    SET tags = array_append(tags, ${tag})
    WHERE id = ${clientId}
      AND NOT (tags @> ARRAY[${tag}]); -- Only if not already present
  `;
}
```

---

### Remove Tag

```typescript
async function removeClientTag(clientId: string, tag: string) {
  await db.$executeRaw`
    UPDATE client_profiles
    SET tags = array_remove(tags, ${tag})
    WHERE id = ${clientId};
  `;
}
```

---

### Filter by Tag

```typescript
async function getClientsByTag(tenantId: string, tag: string) {
  return await db.client_profiles.findMany({
    where: {
      tenant_id: tenantId,
      tags: { has: tag },
      deleted_at: null,
    },
  });
}
```

---

## Predefined Tags (Optional)

V1 allows freeform tags. Future versions may suggest:
- VIP
- Corporate
- Repeat Customer
- High Value
- Dietary Restrictions

---

## UI

```tsx
<div className="tags">
  {client.tags.map((tag) => (
    <span key={tag} className="tag">
      {tag}
      <button onClick={() => removeTag(tag)}>×</button>
    </span>
  ))}
  <input
    placeholder="Add tag..."
    onKeyPress={(e) => {
      if (e.key === 'Enter') {
        addTag(e.currentTarget.value);
        e.currentTarget.value = '';
      }
    }}
  />
</div>
```

---

**End of Client Tags System**
