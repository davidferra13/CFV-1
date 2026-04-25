# Codex Build Spec: Client Passport Persistence + Delegate Role

> **Scope:** 1 migration, 1 new server action file, 1 type update. Zero UI.
> **Risk:** LOW. New table, no existing table modifications except one constraint update.
> **Branch name:** `codex/client-passport-persistence`

---

## Why

The `ClientPassport` TypeScript interface exists at `lib/hub/types.ts:539-555` but has NO database table. It defines how a chef interacts with a client: communication mode (direct vs. delegate), autonomy level, standing instructions, auto-approve thresholds. This is critical for residency/ongoing engagements where the chef rarely speaks to the principal directly.

Additionally, `hub_group_members` has a role constraint allowing only `owner|admin|chef|member|viewer`. There is no `delegate` role for an assistant/representative who manages communication on behalf of a client.

## What to Build

### 1. Migration File

**File:** `database/migrations/20260426000002_client_passports.sql`

**IMPORTANT:** Before creating this file, glob `database/migrations/*.sql` and verify `20260426000002` is strictly higher than the highest existing timestamp. If not, increment.

```sql
-- Client Passport: persists communication preferences and autonomy settings per client
CREATE TABLE client_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  communication_mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (communication_mode IN ('direct', 'delegate_only', 'delegate_preferred')),
  preferred_contact_method TEXT DEFAULT 'email'
    CHECK (preferred_contact_method IN ('email', 'sms', 'phone', 'circle')),
  chef_autonomy_level TEXT NOT NULL DEFAULT 'moderate'
    CHECK (chef_autonomy_level IN ('full', 'high', 'moderate', 'low')),
  auto_approve_under_cents INTEGER DEFAULT 0,
  max_interaction_rounds INTEGER DEFAULT NULL,
  standing_instructions TEXT DEFAULT NULL,
  default_guest_count INTEGER DEFAULT 2,
  budget_range_min_cents INTEGER DEFAULT NULL,
  budget_range_max_cents INTEGER DEFAULT NULL,
  service_style TEXT DEFAULT NULL
    CHECK (service_style IS NULL OR service_style IN (
      'formal_plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'no_preference'
    )),
  default_locations JSONB DEFAULT '[]'::jsonb,
  delegate_name TEXT DEFAULT NULL,
  delegate_email TEXT DEFAULT NULL,
  delegate_phone TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id)
);

CREATE INDEX idx_client_passports_tenant ON client_passports(tenant_id);
CREATE INDEX idx_client_passports_client ON client_passports(client_id);

-- Add 'delegate' to hub_group_members role constraint
ALTER TABLE hub_group_members DROP CONSTRAINT hub_group_members_role_check;
ALTER TABLE hub_group_members ADD CONSTRAINT hub_group_members_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'chef'::text, 'member'::text, 'viewer'::text, 'delegate'::text]));
```

### 2. Server Action File

**File:** `lib/clients/passport-actions.ts` (NEW FILE)

```typescript
'use server'

import { db } from '@/lib/db'
import { requireChef } from '@/lib/auth/permissions'
import { revalidatePath } from 'next/cache'

export async function getClientPassport(clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query(
    `SELECT * FROM client_passports WHERE tenant_id = $1 AND client_id = $2`,
    [tenantId, clientId]
  )
  return result.rows[0] ?? null
}

export async function upsertClientPassport(
  clientId: string,
  data: {
    communication_mode?: string
    preferred_contact_method?: string
    chef_autonomy_level?: string
    auto_approve_under_cents?: number | null
    max_interaction_rounds?: number | null
    standing_instructions?: string | null
    default_guest_count?: number | null
    budget_range_min_cents?: number | null
    budget_range_max_cents?: number | null
    service_style?: string | null
    default_locations?: Array<{ label: string; address?: string; city: string; state: string }>
    delegate_name?: string | null
    delegate_email?: string | null
    delegate_phone?: string | null
  }
) {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query(
    `INSERT INTO client_passports (
      tenant_id, client_id,
      communication_mode, preferred_contact_method, chef_autonomy_level,
      auto_approve_under_cents, max_interaction_rounds, standing_instructions,
      default_guest_count, budget_range_min_cents, budget_range_max_cents,
      service_style, default_locations,
      delegate_name, delegate_email, delegate_phone
    ) VALUES (
      $1, $2,
      COALESCE($3, 'direct'), COALESCE($4, 'email'), COALESCE($5, 'moderate'),
      $6, $7, $8,
      COALESCE($9, 2), $10, $11,
      $12, COALESCE($13, '[]'::jsonb),
      $14, $15, $16
    )
    ON CONFLICT (tenant_id, client_id)
    DO UPDATE SET
      communication_mode = COALESCE($3, client_passports.communication_mode),
      preferred_contact_method = COALESCE($4, client_passports.preferred_contact_method),
      chef_autonomy_level = COALESCE($5, client_passports.chef_autonomy_level),
      auto_approve_under_cents = $6,
      max_interaction_rounds = $7,
      standing_instructions = $8,
      default_guest_count = COALESCE($9, client_passports.default_guest_count),
      budget_range_min_cents = $10,
      budget_range_max_cents = $11,
      service_style = $12,
      default_locations = COALESCE($13, client_passports.default_locations),
      delegate_name = $14,
      delegate_email = $15,
      delegate_phone = $16,
      updated_at = now()
    RETURNING *`,
    [
      tenantId,
      clientId,
      data.communication_mode,
      data.preferred_contact_method,
      data.chef_autonomy_level,
      data.auto_approve_under_cents,
      data.max_interaction_rounds,
      data.standing_instructions,
      data.default_guest_count,
      data.budget_range_min_cents,
      data.budget_range_max_cents,
      data.service_style,
      JSON.stringify(data.default_locations ?? []),
      data.delegate_name,
      data.delegate_email,
      data.delegate_phone,
    ]
  )

  revalidatePath(`/clients/${clientId}`)
  return { success: true, passport: result.rows[0] }
}

export async function deleteClientPassport(clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!

  await db.query(`DELETE FROM client_passports WHERE tenant_id = $1 AND client_id = $2`, [
    tenantId,
    clientId,
  ])

  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}
```

### 3. Update Type Export

**File:** `lib/hub/types.ts`

The `ClientPassport` interface at line 539 already matches the table shape. No changes needed to the interface. BUT: update `profile_id` to `client_id` since the table uses `client_id`, not `profile_id`.

**Change line 541 from:**

```typescript
profile_id: string
```

**To:**

```typescript
client_id: string
```

---

## Files to Read for Context (DO NOT MODIFY these)

- `lib/hub/types.ts` -- existing ClientPassport interface (lines 519-555)
- `lib/db/schema/schema.ts` -- hub_group_members table (lines 14078-14114) for role constraint
- `database/migrations/` -- glob to find latest timestamp
- `lib/auth/permissions.ts` -- how requireChef() works
- `lib/db/index.ts` -- how db.query works

## DO NOT

- Do NOT modify `schema.ts` (that is auto-generated from migrations via introspection)
- Do NOT add any UI components or pages
- Do NOT modify any existing server action files
- Do NOT run `drizzle-kit push` or apply the migration
- Do NOT add new dependencies
- Do NOT create test files
- Do NOT modify the clients table or any other existing table beyond the hub_group_members constraint
