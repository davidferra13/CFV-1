# Client Invites Overview (V1)

## Purpose

Client invites provide a **secure, deterministic way** for clients to create auth accounts and link to their chef-created profiles.

---

## Flow

1. Chef creates client profile (with email)
2. Chef generates invite token
3. System sends invite email with link
4. Client clicks link, signs up
5. Client account is linked to profile via token

---

## Why Invites?

- **Prevents impersonation**: Only invited email can link
- **Tenant-scoped**: Invite is tied to specific chef
- **Auditable**: Track who invited when
- **Expirable**: Tokens expire after N days

---

## Schema

```sql
CREATE TABLE client_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  client_profile_id UUID NOT NULL REFERENCES client_profiles(id),

  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invites_token ON client_invites(token);
CREATE INDEX idx_invites_profile ON client_invites(client_profile_id);
```

---

## Generate Invite

```typescript
import crypto from 'crypto';

async function generateClientInvite(clientProfileId: string): Promise<string> {
  const client = await db.client_profiles.findUnique({
    where: { id: clientProfileId },
  });

  if (!client.email) {
    throw new Error('Client must have email to send invite');
  }

  // Check for existing active invite
  const existing = await db.client_invites.findFirst({
    where: {
      client_profile_id: clientProfileId,
      expires_at: { gt: new Date() },
      accepted_at: null,
    },
  });

  if (existing) {
    return existing.token; // Return existing invite
  }

  // Generate new token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await db.client_invites.create({
    data: {
      tenant_id: client.tenant_id,
      client_profile_id: clientProfileId,
      token,
      email: client.email,
      expires_at: expiresAt,
    },
  });

  // Send email
  await sendInviteEmail(client.email, token);

  return token;
}
```

---

## Accept Invite

```typescript
async function acceptInvite(token: string, userId: string): Promise<void> {
  const invite = await db.client_invites.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new Error('Invalid invite token');
  }

  if (invite.accepted_at) {
    throw new Error('Invite already accepted');
  }

  if (new Date() > invite.expires_at) {
    throw new Error('Invite expired');
  }

  // Link client profile to user
  await db.$transaction(async (tx) => {
    await tx.client_profiles.update({
      where: { id: invite.client_profile_id },
      data: {
        linked_user_id: userId,
        linked_at: new Date(),
      },
    });

    await tx.client_invites.update({
      where: { token },
      data: {
        accepted_at: new Date(),
        accepted_by_user_id: userId,
      },
    });

    await tx.user_roles.create({
      data: {
        user_id: userId,
        tenant_id: invite.tenant_id,
        role: 'client',
      },
    });
  });
}
```

---

**End of Client Invites Overview**
