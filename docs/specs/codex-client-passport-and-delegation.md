# Codex Spec: Client Passport + Delegation Layer

> **Status:** ready-to-build
> **Priority:** P0
> **Agent type:** Codex (surgical, additive-only)
> **Estimated scope:** 1 migration, 2 server action files, 1 component, 3 type additions

---

## Problem

High-value repeat clients (and their assistants) need:

1. A **portable preference profile** ("passport") that persists across events and chefs
2. The ability for an **assistant/delegate** to operate circles on the client's behalf
3. **Attribution** so the chef knows who actually took the action

None of this exists today. Guest profiles (`hub_guest_profiles`) have basic dietary/allergy fields but no service preferences, budget ranges, communication preferences, or delegation support.

---

## What To Build

### Part 1: Client Passport Table

A new `client_passports` table storing portable preferences for repeat clients. One passport per `hub_guest_profiles` row.

### Part 2: Delegation Column on Circle Members

A new nullable column `on_behalf_of_profile_id` on `hub_group_members` so an assistant's actions are attributed correctly.

### Part 3: Server Actions (CRUD + Delegation)

Two new files with server actions for passport management and delegation assignment.

### Part 4: Passport Summary Component

A read-only component chefs see when viewing a circle, showing the client's passport if one exists.

---

## Exact Changes

### 1. Migration File

**File:** `database/migrations/20260425000011_client_passports_and_delegation.sql`

```sql
-- Client Passport: portable preference profile for repeat clients
-- Delegation: on_behalf_of attribution for assistant-operated circles

-- 1. Client Passports table
CREATE TABLE IF NOT EXISTS client_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- Service preferences
  default_guest_count INT DEFAULT NULL,
  budget_range_min_cents INT DEFAULT NULL,
  budget_range_max_cents INT DEFAULT NULL,
  service_style TEXT DEFAULT NULL
    CHECK (service_style IS NULL OR service_style IN (
      'formal_plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'no_preference'
    )),

  -- Communication preferences
  communication_mode TEXT NOT NULL DEFAULT 'direct'
    CHECK (communication_mode IN ('direct', 'delegate_only', 'delegate_preferred')),
  preferred_contact_method TEXT DEFAULT NULL
    CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'sms', 'phone', 'circle')),
  max_interaction_rounds INT DEFAULT 1,

  -- Autonomy preferences (how much should the chef decide alone)
  chef_autonomy_level TEXT NOT NULL DEFAULT 'full'
    CHECK (chef_autonomy_level IN ('full', 'high', 'moderate', 'low')),
  auto_approve_under_cents INT DEFAULT NULL,

  -- Standing instructions (free text the chef always sees)
  standing_instructions TEXT DEFAULT NULL,

  -- Location defaults
  default_locations JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_client_passports_profile UNIQUE (profile_id)
);

CREATE INDEX idx_client_passports_profile ON client_passports(profile_id);

COMMENT ON TABLE client_passports IS 'Portable client preference profile. One per guest profile. Travels across chefs and circles.';
COMMENT ON COLUMN client_passports.communication_mode IS 'direct = client handles comms, delegate_only = only assistant responds, delegate_preferred = assistant preferred but client may respond';
COMMENT ON COLUMN client_passports.chef_autonomy_level IS 'full = chef decides everything, high = chef decides most things, moderate = chef proposes + client approves, low = client directs';
COMMENT ON COLUMN client_passports.auto_approve_under_cents IS 'If set, proposals under this amount can be auto-approved without explicit client action';
COMMENT ON COLUMN client_passports.default_locations IS 'JSON array of {label, address, city, state} objects for common event locations';
COMMENT ON COLUMN client_passports.standing_instructions IS 'Free text instructions the chef always sees (e.g. "No seafood ever", "Always include a cheese course")';

-- 2. Delegation column on hub_group_members
ALTER TABLE hub_group_members
  ADD COLUMN IF NOT EXISTS on_behalf_of_profile_id UUID DEFAULT NULL
    REFERENCES hub_guest_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN hub_group_members.on_behalf_of_profile_id IS 'If set, this member operates as a delegate for another profile (e.g. assistant acting for client)';

-- 3. Updated_at trigger for passports
CREATE OR REPLACE FUNCTION update_client_passports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_client_passports_updated_at
  BEFORE UPDATE ON client_passports
  FOR EACH ROW
  EXECUTE FUNCTION update_client_passports_updated_at();
```

### 2. TypeScript Types

**File:** `lib/hub/types.ts`

Add these types at the end of the file, BEFORE the last line. Do NOT modify any existing types.

```typescript
// ---- Client Passport ----

export type ServiceStyle =
  | 'formal_plated'
  | 'family_style'
  | 'buffet'
  | 'cocktail'
  | 'tasting_menu'
  | 'no_preference'
export type CommunicationMode = 'direct' | 'delegate_only' | 'delegate_preferred'
export type ContactMethod = 'email' | 'sms' | 'phone' | 'circle'
export type ChefAutonomyLevel = 'full' | 'high' | 'moderate' | 'low'

export interface PassportLocation {
  label: string
  address?: string
  city: string
  state: string
}

export interface ClientPassport {
  id: string
  profile_id: string
  default_guest_count: number | null
  budget_range_min_cents: number | null
  budget_range_max_cents: number | null
  service_style: ServiceStyle | null
  communication_mode: CommunicationMode
  preferred_contact_method: ContactMethod | null
  max_interaction_rounds: number
  chef_autonomy_level: ChefAutonomyLevel
  auto_approve_under_cents: number | null
  standing_instructions: string | null
  default_locations: PassportLocation[]
  created_at: string
  updated_at: string
}
```

Also add to the existing `HubGroupMember` interface, after the `digest_mode` field:

```typescript
  on_behalf_of_profile_id?: string | null
```

### 3. Passport Server Actions

**File:** `lib/hub/passport-actions.ts` (NEW FILE)

```typescript
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireAuth } from '@/lib/auth/get-user'
import { z } from 'zod'
import type { ClientPassport } from './types'

// ---------------------------------------------------------------------------
// Client Passport CRUD
// ---------------------------------------------------------------------------

const PassportLocationSchema = z.object({
  label: z.string().min(1).max(100),
  address: z.string().max(300).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(50),
})

const UpsertPassportSchema = z.object({
  profileId: z.string().uuid(),
  defaultGuestCount: z.number().int().min(1).max(500).nullable().optional(),
  budgetRangeMinCents: z.number().int().min(0).nullable().optional(),
  budgetRangeMaxCents: z.number().int().min(0).nullable().optional(),
  serviceStyle: z
    .enum(['formal_plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'no_preference'])
    .nullable()
    .optional(),
  communicationMode: z.enum(['direct', 'delegate_only', 'delegate_preferred']).optional(),
  preferredContactMethod: z.enum(['email', 'sms', 'phone', 'circle']).nullable().optional(),
  maxInteractionRounds: z.number().int().min(1).max(10).optional(),
  chefAutonomyLevel: z.enum(['full', 'high', 'moderate', 'low']).optional(),
  autoApproveUnderCents: z.number().int().min(0).nullable().optional(),
  standingInstructions: z.string().max(2000).nullable().optional(),
  defaultLocations: z.array(PassportLocationSchema).max(10).optional(),
})

/**
 * Get passport for a guest profile. Returns null if none exists.
 */
export async function getPassportForProfile(profileId: string): Promise<ClientPassport | null> {
  await requireAuth()
  const db = createServerClient({ admin: true })

  const { data, error } = await db
    .from('client_passports')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    console.error('[getPassportForProfile] Error:', error)
    return null
  }

  return data as ClientPassport | null
}

/**
 * Create or update a client passport.
 * Uses upsert on the unique profile_id constraint.
 */
export async function upsertPassport(
  input: z.infer<typeof UpsertPassportSchema>
): Promise<{ success: boolean; error?: string }> {
  await requireAuth()
  const validated = UpsertPassportSchema.parse(input)
  const db = createServerClient({ admin: true })

  const row = {
    profile_id: validated.profileId,
    default_guest_count: validated.defaultGuestCount ?? null,
    budget_range_min_cents: validated.budgetRangeMinCents ?? null,
    budget_range_max_cents: validated.budgetRangeMaxCents ?? null,
    service_style: validated.serviceStyle ?? null,
    communication_mode: validated.communicationMode ?? 'direct',
    preferred_contact_method: validated.preferredContactMethod ?? null,
    max_interaction_rounds: validated.maxInteractionRounds ?? 1,
    chef_autonomy_level: validated.chefAutonomyLevel ?? 'full',
    auto_approve_under_cents: validated.autoApproveUnderCents ?? null,
    standing_instructions: validated.standingInstructions ?? null,
    default_locations: JSON.stringify(validated.defaultLocations ?? []),
  }

  const { error } = await db.from('client_passports').upsert(row, { onConflict: 'profile_id' })

  if (error) {
    console.error('[upsertPassport] Error:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

### 4. Delegation Server Actions

**File:** `lib/hub/delegation-actions.ts` (NEW FILE)

```typescript
'use server'

import { createServerClient } from '@/lib/db/server'
import { requireAuth } from '@/lib/auth/get-user'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Delegation: assign an assistant to operate circles on behalf of a client
// ---------------------------------------------------------------------------

const AssignDelegateSchema = z.object({
  delegateProfileId: z.string().uuid(),
  onBehalfOfProfileId: z.string().uuid(),
  groupId: z.string().uuid(),
})

/**
 * Add a delegate (assistant) to a single circle on behalf of a client.
 * The delegate gets 'admin' role with on_behalf_of attribution.
 */
export async function assignDelegateToCircle(
  input: z.infer<typeof AssignDelegateSchema>
): Promise<{ success: boolean; error?: string }> {
  await requireAuth()
  const validated = AssignDelegateSchema.parse(input)
  const db = createServerClient({ admin: true })

  // Verify the on_behalf_of profile exists
  const { data: targetProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('id', validated.onBehalfOfProfileId)
    .maybeSingle()

  if (!targetProfile) {
    return { success: false, error: 'Target profile not found' }
  }

  // Verify delegate profile exists
  const { data: delegateProfile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('id', validated.delegateProfileId)
    .maybeSingle()

  if (!delegateProfile) {
    return { success: false, error: 'Delegate profile not found' }
  }

  // Check if delegate is already a member
  const { data: existing } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', validated.groupId)
    .eq('profile_id', validated.delegateProfileId)
    .maybeSingle()

  if (existing) {
    // Update existing membership with delegation attribution
    const { error } = await db
      .from('hub_group_members')
      .update({
        on_behalf_of_profile_id: validated.onBehalfOfProfileId,
        role: 'admin',
        can_post: true,
        can_invite: true,
        can_pin: true,
      })
      .eq('id', existing.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Add delegate as new member with attribution
    const { error } = await db.from('hub_group_members').insert({
      group_id: validated.groupId,
      profile_id: validated.delegateProfileId,
      role: 'admin',
      can_post: true,
      can_invite: true,
      can_pin: true,
      on_behalf_of_profile_id: validated.onBehalfOfProfileId,
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  return { success: true }
}

/**
 * Bulk-assign a delegate to ALL circles where the target client is a member.
 * Used when a client says "my assistant handles everything."
 */
export async function bulkAssignDelegate(input: {
  delegateProfileId: string
  onBehalfOfProfileId: string
}): Promise<{ success: boolean; assignedCount: number; error?: string }> {
  await requireAuth()
  const db = createServerClient({ admin: true })

  // Find all circles where the target profile is a member
  const { data: clientMemberships } = await db
    .from('hub_group_members')
    .select('group_id')
    .eq('profile_id', input.onBehalfOfProfileId)

  if (!clientMemberships || clientMemberships.length === 0) {
    return { success: true, assignedCount: 0 }
  }

  let assignedCount = 0

  for (const membership of clientMemberships) {
    const result = await assignDelegateToCircle({
      delegateProfileId: input.delegateProfileId,
      onBehalfOfProfileId: input.onBehalfOfProfileId,
      groupId: membership.group_id,
    })
    if (result.success) assignedCount++
  }

  return { success: true, assignedCount }
}

/**
 * Get all delegates for a given profile across all circles.
 */
export async function getDelegatesForProfile(profileId: string): Promise<{
  delegates: { profileId: string; displayName: string; circleCount: number }[]
}> {
  await requireAuth()
  const db = createServerClient({ admin: true })

  const { data: delegateMembers } = await db
    .from('hub_group_members')
    .select('profile_id, hub_guest_profiles!inner(display_name)')
    .eq('on_behalf_of_profile_id', profileId)

  if (!delegateMembers || delegateMembers.length === 0) {
    return { delegates: [] }
  }

  // Group by delegate profile
  const grouped = new Map<string, { displayName: string; count: number }>()
  for (const m of delegateMembers) {
    const pid = m.profile_id
    const existing = grouped.get(pid)
    const name = (m as any).hub_guest_profiles?.display_name || 'Unknown'
    if (existing) {
      existing.count++
    } else {
      grouped.set(pid, { displayName: name, count: 1 })
    }
  }

  return {
    delegates: Array.from(grouped.entries()).map(([profileId, data]) => ({
      profileId,
      displayName: data.displayName,
      circleCount: data.count,
    })),
  }
}
```

### 5. Passport Summary Component (Chef-side, read-only)

**File:** `components/hub/passport-summary.tsx` (NEW FILE)

```tsx
'use client'

import { formatCurrency } from '@/lib/utils/currency'
import type { ClientPassport } from '@/lib/hub/types'

const AUTONOMY_LABELS: Record<string, string> = {
  full: 'Full autonomy (decide everything)',
  high: 'High autonomy (decide most things)',
  moderate: 'Moderate (propose, client approves)',
  low: 'Low (client directs)',
}

const STYLE_LABELS: Record<string, string> = {
  formal_plated: 'Formal plated',
  family_style: 'Family style',
  buffet: 'Buffet',
  cocktail: 'Cocktail',
  tasting_menu: 'Tasting menu',
  no_preference: 'No preference',
}

const COMM_LABELS: Record<string, string> = {
  direct: 'Direct with client',
  delegate_only: 'Through assistant only',
  delegate_preferred: 'Assistant preferred',
}

export function PassportSummary({ passport }: { passport: ClientPassport }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-700 dark:bg-zinc-800/50">
      <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
        Client Passport
      </h3>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {passport.chef_autonomy_level && (
          <Field
            label="Chef autonomy"
            value={AUTONOMY_LABELS[passport.chef_autonomy_level] || passport.chef_autonomy_level}
          />
        )}

        {passport.communication_mode && (
          <Field
            label="Communication"
            value={COMM_LABELS[passport.communication_mode] || passport.communication_mode}
          />
        )}

        {passport.service_style && (
          <Field
            label="Service style"
            value={STYLE_LABELS[passport.service_style] || passport.service_style}
          />
        )}

        {passport.default_guest_count && (
          <Field label="Typical headcount" value={String(passport.default_guest_count)} />
        )}

        {(passport.budget_range_min_cents || passport.budget_range_max_cents) && (
          <Field
            label="Budget range"
            value={`${passport.budget_range_min_cents ? formatCurrency(passport.budget_range_min_cents) : '?'} - ${passport.budget_range_max_cents ? formatCurrency(passport.budget_range_max_cents) : '?'}`}
          />
        )}

        {passport.max_interaction_rounds && (
          <Field label="Max interaction rounds" value={String(passport.max_interaction_rounds)} />
        )}

        {passport.preferred_contact_method && (
          <Field label="Preferred contact" value={passport.preferred_contact_method} />
        )}
      </div>

      {passport.standing_instructions && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-medium text-zinc-500 mb-1">Standing Instructions</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {passport.standing_instructions}
          </p>
        </div>
      )}

      {passport.default_locations && passport.default_locations.length > 0 && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-medium text-zinc-500 mb-1">Known Locations</p>
          <div className="flex flex-wrap gap-2">
            {passport.default_locations.map((loc, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-700"
              >
                {loc.label} ({loc.city}, {loc.state})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-zinc-800 dark:text-zinc-200">{value}</p>
    </div>
  )
}
```

---

## CONSTRAINTS FOR CODEX

1. **DO NOT** modify any existing types in `lib/hub/types.ts`. Only ADD new types at the end and ADD the one new optional field to `HubGroupMember`.
2. **DO NOT** modify any existing server action files. The two new files are standalone.
3. **DO NOT** modify any existing components. The `PassportSummary` is a new standalone component.
4. **DO NOT** run `drizzle-kit push` or apply the migration. Only create the `.sql` file.
5. **DO NOT** modify `hub_guest_profiles` table. The passport is a separate table linked by FK.
6. The migration timestamp MUST be `20260425000011`. Check it does not already exist before writing.
7. All monetary values are in **cents** (integers). Never use floating point for money.
8. The `default_locations` column is JSONB. The server action serializes it with `JSON.stringify()`.

---

## Verification

After building, confirm:

- [ ] Migration file exists at `database/migrations/20260425000011_client_passports_and_delegation.sql`
- [ ] `lib/hub/types.ts` has `ClientPassport` interface and `on_behalf_of_profile_id` on `HubGroupMember`
- [ ] `lib/hub/passport-actions.ts` exports `getPassportForProfile` and `upsertPassport`
- [ ] `lib/hub/delegation-actions.ts` exports `assignDelegateToCircle`, `bulkAssignDelegate`, `getDelegatesForProfile`
- [ ] `components/hub/passport-summary.tsx` exports `PassportSummary`
- [ ] `npx tsc --noEmit --skipLibCheck` passes (no new type errors introduced)
- [ ] No existing files were modified except `lib/hub/types.ts` (additive only)
