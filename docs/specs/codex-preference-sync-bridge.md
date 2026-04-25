# Codex Build Spec: Hub-to-Chef Preference Sync Bridge

> **Scope:** 1 new server action file. Zero migrations, zero UI.
> **Risk:** LOW. Read-only from hub tables, write to existing chef tables. No schema changes.
> **Branch name:** `codex/preference-sync-bridge`

---

## Why

Two separate preference systems exist:

1. **Hub side** (guest self-service): `hub_guest_profiles` has `known_allergies[]` and `known_dietary[]`. `hub_household_members` has per-person `dietary_restrictions[]`, `allergies[]`, `dislikes[]`, `favorites[]`.
2. **Chef side** (operational): `client_allergy_records`, `client_taste_profiles`, `dietary_change_log` have structured, severity-tagged, chef-verified preference data.

These two systems are NOT connected. When a guest updates their allergies in the hub, the chef never sees it in their operational tools. This bridge syncs hub data into chef-side tables.

## What to Build

### 1. Server Action File

**File:** `lib/hub/preference-sync.ts` (NEW FILE)

This file does ONE thing: reads hub guest data for a specific client, writes it to chef-side tables, and logs the change.

```typescript
'use server'

import { db } from '@/lib/db'
import { requireChef } from '@/lib/auth/permissions'

/**
 * Syncs a hub guest profile's dietary data into the chef-side client records.
 * Call this when a guest updates their hub profile, or manually from the client detail page.
 *
 * Flow:
 * 1. Read hub_guest_profiles for this client (via clients.id -> hub_guest_profiles.client_id)
 * 2. Read hub_household_members for the guest profile
 * 3. Upsert into client_allergy_records (source = 'intake_form')
 * 4. Upsert into client_taste_profiles
 * 5. Log changes to dietary_change_log
 */
export async function syncHubPreferencesToClient(clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // 1. Find the hub guest profile linked to this client
  const profileResult = await db.query(
    `SELECT id, known_allergies, known_dietary
     FROM hub_guest_profiles
     WHERE client_id = $1
     LIMIT 1`,
    [clientId]
  )

  if (profileResult.rows.length === 0) {
    return { success: false, error: 'No hub profile linked to this client' }
  }

  const profile = profileResult.rows[0]
  const profileId = profile.id
  const hubAllergies: string[] = profile.known_allergies ?? []
  const hubDietary: string[] = profile.known_dietary ?? []

  // 2. Read household members for aggregated preferences
  const householdResult = await db.query(
    `SELECT dietary_restrictions, allergies, dislikes, favorites
     FROM hub_household_members
     WHERE profile_id = $1`,
    [profileId]
  )

  // Aggregate all household allergies and dietary items
  const allAllergies = new Set<string>(hubAllergies.map((a) => a.toLowerCase().trim()))
  const allDietary = new Set<string>(hubDietary.map((d) => d.toLowerCase().trim()))
  const allDislikes = new Set<string>()
  const allFavorites = new Set<string>()

  for (const member of householdResult.rows) {
    for (const a of member.allergies ?? []) allAllergies.add(a.toLowerCase().trim())
    for (const d of member.dietary_restrictions ?? []) allDietary.add(d.toLowerCase().trim())
    for (const d of member.dislikes ?? []) allDislikes.add(d.toLowerCase().trim())
    for (const f of member.favorites ?? []) allFavorites.add(f.toLowerCase().trim())
  }

  let synced = { allergies: 0, taste: false, changes: 0 }

  // 3. Upsert allergy records (only add new ones, never remove chef-confirmed ones)
  for (const allergen of allAllergies) {
    if (!allergen) continue
    const existing = await db.query(
      `SELECT id FROM client_allergy_records
       WHERE tenant_id = $1 AND client_id = $2 AND LOWER(allergen) = $3`,
      [tenantId, clientId, allergen]
    )

    if (existing.rows.length === 0) {
      await db.query(
        `INSERT INTO client_allergy_records (tenant_id, client_id, allergen, severity, source, confirmed_by_chef)
         VALUES ($1, $2, $3, 'intolerance', 'intake_form', false)`,
        [tenantId, clientId, allergen]
      )

      // Log the change
      await db.query(
        `INSERT INTO dietary_change_log (tenant_id, client_id, change_type, field_name, new_value, change_source)
         VALUES ($1, $2, 'allergy_added', $3, $3, 'hub_sync')`,
        [tenantId, clientId, allergen]
      )

      synced.allergies++
      synced.changes++
    }
  }

  // 4. Upsert taste profile
  const dislikesArray = Array.from(allDislikes).filter(Boolean)
  const favoritesArray = Array.from(allFavorites).filter(Boolean)
  const dietaryArray = Array.from(allDietary).filter(Boolean)

  if (dislikesArray.length > 0 || favoritesArray.length > 0) {
    const existingTaste = await db.query(
      `SELECT id FROM client_taste_profiles WHERE tenant_id = $1 AND client_id = $2 LIMIT 1`,
      [tenantId, clientId]
    )

    if (existingTaste.rows.length === 0) {
      await db.query(
        `INSERT INTO client_taste_profiles (tenant_id, client_id, disliked_ingredients, favorite_cuisines, avoids)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenantId, clientId, dislikesArray, favoritesArray, dietaryArray]
      )
      synced.taste = true
    } else {
      // Merge: add new items without removing existing ones
      await db.query(
        `UPDATE client_taste_profiles SET
           disliked_ingredients = (
             SELECT array_agg(DISTINCT unnested) FROM unnest(
               COALESCE(disliked_ingredients, '{}') || $3::text[]
             ) AS unnested
           ),
           favorite_cuisines = (
             SELECT array_agg(DISTINCT unnested) FROM unnest(
               COALESCE(favorite_cuisines, '{}') || $4::text[]
             ) AS unnested
           ),
           avoids = (
             SELECT array_agg(DISTINCT unnested) FROM unnest(
               COALESCE(avoids, '{}') || $5::text[]
             ) AS unnested
           ),
           updated_at = now()
         WHERE tenant_id = $1 AND client_id = $2`,
        [tenantId, clientId, dislikesArray, favoritesArray, dietaryArray]
      )
      synced.taste = true
    }

    if (synced.taste) {
      await db.query(
        `INSERT INTO dietary_change_log (tenant_id, client_id, change_type, field_name, new_value, change_source)
         VALUES ($1, $2, 'preference_updated', 'taste_profile', 'hub_sync_merge', 'hub_sync')`,
        [tenantId, clientId]
      )
      synced.changes++
    }
  }

  // 5. Update client-level dietary arrays (additive merge)
  if (hubDietary.length > 0 || hubAllergies.length > 0) {
    await db.query(
      `UPDATE clients SET
         dietary_restrictions = (
           SELECT array_agg(DISTINCT unnested) FROM unnest(
             COALESCE(dietary_restrictions, '{}') || $3::text[]
           ) AS unnested
         ),
         allergies = (
           SELECT array_agg(DISTINCT unnested) FROM unnest(
             COALESCE(allergies, '{}') || $4::text[]
           ) AS unnested
         ),
         updated_at = now()
       WHERE id = $2 AND tenant_id = $1`,
      [tenantId, clientId, Array.from(allDietary), Array.from(allAllergies)]
    )
  }

  return {
    success: true,
    synced: {
      new_allergies: synced.allergies,
      taste_profile_updated: synced.taste,
      total_changes_logged: synced.changes,
    },
  }
}
```

---

## Files to Read for Context (DO NOT MODIFY these)

- `lib/db/schema/schema.ts` -- look up these tables for column names:
  - `hub_guest_profiles` (search for `hubGuestProfiles`) -- has `known_allergies`, `known_dietary`, `client_id`
  - `client_allergy_records` (search for `clientAllergyRecords`) -- has `tenant_id`, `client_id`, `allergen`, `severity`, `source`, `confirmed_by_chef`
  - `client_taste_profiles` (search for `clientTasteProfiles`) -- has `tenant_id`, `client_id`, `disliked_ingredients`, `favorite_cuisines`, `avoids`
  - `dietary_change_log` (search for `dietaryChangeLog`) -- has `tenant_id`, `client_id`, `change_type`, `field_name`, `new_value`, `change_source`
  - `hub_household_members` -- has `profile_id`, `dietary_restrictions`, `allergies`, `dislikes`, `favorites`
- `lib/auth/permissions.ts` -- how requireChef() works
- `lib/db/index.ts` -- how db.query works

## DO NOT

- Do NOT create any migration files (all tables already exist)
- Do NOT modify schema.ts
- Do NOT add UI components or pages
- Do NOT modify any existing server action files
- Do NOT delete or overwrite any existing chef-side preference data (additive merge only)
- Do NOT run any database commands
- Do NOT add new dependencies
- Do NOT create test files

## IMPORTANT: Column Name Verification

Before writing the final code, READ the schema.ts table definitions for `client_allergy_records`, `client_taste_profiles`, `dietary_change_log`, and `hub_household_members` to verify exact column names. The column names in this spec are best-effort from exploration. If a column name differs in schema.ts, use the schema.ts version. The SQL queries use snake_case (database column names), not camelCase (Drizzle names).
