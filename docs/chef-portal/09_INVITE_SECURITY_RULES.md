# Invite Security Rules (V1)

## Security Principles

1. **Tokens are secret**: Never log or expose in URLs
2. **One-time use**: Token invalid after acceptance
3. **Time-limited**: Expire after 7 days
4. **Email validation**: Only invited email can accept (future: verify email match)

---

## Token Generation Security

Use cryptographically secure random:

```typescript
import crypto from 'crypto';

// ✅ CORRECT
const token = crypto.randomBytes(32).toString('hex');

// ❌ WRONG (predictable)
const token = Math.random().toString(36);
```

---

## HTTPS Only

Invite links must only be sent/used over HTTPS:

```typescript
function getInviteLink(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!baseUrl.startsWith('https://')) {
    throw new Error('Invites require HTTPS');
  }

  return `${baseUrl}/invite/${token}`;
}
```

---

## Rate Limiting (Future)

Prevent invite spam:
- Max 10 invites per hour per chef
- Max 3 invites to same email per day

---

## Email Verification (Future Enhancement)

V1: Trust email in invite.

V2: Verify user's email matches invite email before linking.

```typescript
// Future implementation
async function acceptInviteWithVerification(
  token: string,
  userId: string,
  userEmail: string
): Promise<void> {
  const invite = await getInvite(token);

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error('Email does not match invite');
  }

  // Proceed with acceptance
}
```

---

**End of Invite Security Rules**
