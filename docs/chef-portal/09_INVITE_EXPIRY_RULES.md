# Invite Expiry Rules (V1)

## Expiration Period

Default: **7 days** from creation.

```typescript
const INVITE_EXPIRY_DAYS = 7;

const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
```

---

## Expiry Check

```typescript
function isInviteExpired(invite: ClientInvite): boolean {
  return new Date() > invite.expires_at;
}
```

---

## Handling Expired Invites

### Client Clicks Expired Link

Show error page:

```tsx
<div className="alert alert-error">
  <h2>Invite Expired</h2>
  <p>This invitation link has expired. Please contact your chef for a new invite.</p>
</div>
```

---

### Chef Resends Invite

Generate new token with new expiry:

```typescript
async function resendInvite(clientProfileId: string): Promise<string> {
  // Invalidate old invites (optional: mark as expired)
  await db.client_invites.updateMany({
    where: {
      client_profile_id: clientProfileId,
      accepted_at: null,
    },
    data: {
      expires_at: new Date(), // Mark as expired
    },
  });

  // Generate new invite
  return await generateClientInvite(clientProfileId);
}
```

---

## Cleanup Query (Scheduled Job)

```sql
-- Delete expired, unaccepted invites older than 30 days
DELETE FROM client_invites
WHERE accepted_at IS NULL
  AND expires_at < NOW() - INTERVAL '30 days';
```

---

**End of Invite Expiry Rules**
