# Invite Acceptance Audit (V1)

## Audit Fields

Every invite acceptance is logged in the `client_invites` table:

- `accepted_at`: Timestamp of acceptance
- `accepted_by_user_id`: Auth user who accepted

---

## Acceptance Flow

```typescript
async function recordInviteAcceptance(
  token: string,
  userId: string
): Promise<void> {
  await db.client_invites.update({
    where: { token },
    data: {
      accepted_at: new Date(),
      accepted_by_user_id: userId,
    },
  });

  // Also log in audit table (optional)
  await db.audit_log.create({
    data: {
      action: 'invite_accepted',
      actor_id: userId,
      resource_type: 'client_invite',
      resource_id: token,
    },
  });
}
```

---

## Query Accepted Invites

```typescript
async function getAcceptedInvites(tenantId: string) {
  return await db.client_invites.findMany({
    where: {
      tenant_id: tenantId,
      accepted_at: { not: null },
    },
    include: {
      client_profile: true,
    },
    orderBy: {
      accepted_at: 'desc',
    },
  });
}
```

---

## Report: Invite Acceptance Rate

```sql
SELECT
  COUNT(*) FILTER (WHERE accepted_at IS NOT NULL) AS accepted,
  COUNT(*) FILTER (WHERE accepted_at IS NULL AND expires_at > NOW()) AS pending,
  COUNT(*) FILTER (WHERE accepted_at IS NULL AND expires_at <= NOW()) AS expired
FROM client_invites
WHERE tenant_id = $1;
```

---

**End of Invite Acceptance Audit**
