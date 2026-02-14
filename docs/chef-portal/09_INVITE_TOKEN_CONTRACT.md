# Invite Token Contract (V1)

## Token Format

**Secure random hex string**, 64 characters (32 bytes).

```typescript
import crypto from 'crypto';

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

---

## Token Requirements

- **Unique**: Database unique constraint prevents duplicates
- **Unpredictable**: Cryptographically secure random
- **URL-safe**: Hex encoding ensures URL compatibility
- **Single-use**: Marked as accepted after first use

---

## Invite Link Format

```
https://chefflow.app/invite/{token}
```

Example:
```
https://chefflow.app/invite/a3f2c8b9e1d4f6a7b2c8d9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

---

## Token Validation

```typescript
async function validateInviteToken(token: string): Promise<ValidationResult> {
  if (!token || token.length !== 64) {
    return { valid: false, error: 'Invalid token format' };
  }

  const invite = await db.client_invites.findUnique({
    where: { token },
    include: { client_profile: true },
  });

  if (!invite) {
    return { valid: false, error: 'Invite not found' };
  }

  if (invite.accepted_at) {
    return { valid: false, error: 'Invite already used' };
  }

  if (new Date() > invite.expires_at) {
    return { valid: false, error: 'Invite expired' };
  }

  return {
    valid: true,
    invite,
  };
}
```

---

## Security

- Never expose token in logs
- Use HTTPS only for invite links
- Expire after 7 days
- One-time use only

---

**End of Invite Token Contract**
