# Client Merge & Dedupe Rules (V1)

## Problem

Chefs may accidentally create duplicate client profiles for the same person (typos, different emails, etc.).

---

## V1 Approach: Manual Only

V1 does **not** include automated deduplication. Chef must manually:

1. Identify duplicates
2. Choose primary profile
3. Reassign events to primary
4. Soft-delete duplicate

---

## Duplicate Detection (Helper Query)

```sql
-- Find potential duplicates by email
SELECT email, COUNT(*) as count
FROM client_profiles
WHERE tenant_id = $1
  AND deleted_at IS NULL
  AND email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;
```

---

## Manual Merge Process

```typescript
async function mergeClientProfiles(
  primaryId: string,
  duplicateId: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    // 1. Reassign all events from duplicate to primary
    await tx.events.updateMany({
      where: { client_profile_id: duplicateId },
      data: { client_profile_id: primaryId },
    });

    // 2. Merge notes (append)
    const primary = await tx.client_profiles.findUnique({ where: { id: primaryId } });
    const duplicate = await tx.client_profiles.findUnique({ where: { id: duplicateId } });

    const mergedNotes = [
      primary.chef_private_notes,
      `--- Merged from duplicate profile ---`,
      duplicate.chef_private_notes,
    ].filter(Boolean).join('\n\n');

    await tx.client_profiles.update({
      where: { id: primaryId },
      data: { chef_private_notes: mergedNotes },
    });

    // 3. Soft-delete duplicate
    await tx.client_profiles.update({
      where: { id: duplicateId },
      data: { deleted_at: new Date() },
    });
  });
}
```

---

## Prevention

- Email normalization (lowercase)
- Warn when creating client with existing email

```typescript
async function checkDuplicateBeforeCreate(tenantId: string, email: string) {
  const existing = await db.client_profiles.findFirst({
    where: {
      tenant_id: tenantId,
      email: email.toLowerCase(),
      deleted_at: null,
    },
  });

  if (existing) {
    return {
      isDuplicate: true,
      existingClient: existing,
    };
  }

  return { isDuplicate: false };
}
```

---

**End of Client Merge & Dedupe Rules**
