'use server'

import { pgClient } from '@/lib/db'
import { requireChef } from '@/lib/auth/get-user'

type HubGuestProfileRow = {
  id: string
  known_allergies: string[] | null
  known_dietary: string[] | null
}

type HubHouseholdMemberRow = {
  dietary_restrictions: string[] | null
  allergies: string[] | null
  dislikes: string[] | null
  favorites: string[] | null
}

type TasteProfileRow = {
  id: string
  disliked_ingredients: string[] | null
  favorite_cuisines: string[] | null
  avoids: string[] | null
}

type ClientPreferenceRow = {
  dietary_restrictions: string[] | null
  allergies: string[] | null
}

type SyncSet = Set<string>

function addNormalizedItems(target: SyncSet, items?: string[] | null) {
  for (const item of items ?? []) {
    const normalized = item.trim().toLowerCase()
    if (normalized) target.add(normalized)
  }
}

function getNewItems(existing: string[] | null | undefined, incoming: string[]) {
  const existingNormalized = new Set(
    (existing ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean)
  )

  return incoming.filter((item) => !existingNormalized.has(item.trim().toLowerCase()))
}

function mergeAdditive(existing: string[] | null | undefined, additions: string[]) {
  const merged = [...(existing ?? []).filter((item) => item.trim()), ...additions]
  const seen = new Set<string>()

  return merged.filter((item) => {
    const normalized = item.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

async function logDietaryChange(
  sql: typeof pgClient,
  chefId: string,
  clientId: string,
  changeType: 'allergy_added' | 'restriction_added' | 'preference_updated',
  fieldName: string,
  newValue: string,
  severity: 'warning' | 'info' = 'info'
) {
  await sql`
    INSERT INTO dietary_change_log (
      chef_id,
      client_id,
      change_type,
      field_name,
      new_value,
      severity
    )
    VALUES (
      ${chefId},
      ${clientId},
      ${changeType},
      ${fieldName},
      ${newValue},
      ${severity}
    )
  `
}

/**
 * Syncs hub guest dietary/preference data into chef-side client records.
 * Additive only: existing chef-side records and arrays are never deleted or reduced.
 */
export async function syncHubPreferencesToClient(clientId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!

  return pgClient.begin(async (txSql: any) => {
    const sql = txSql as typeof pgClient

    const clientRows = await sql<ClientPreferenceRow[]>`
      SELECT dietary_restrictions, allergies
      FROM clients
      WHERE id = ${clientId}
        AND tenant_id = ${tenantId}
      FOR UPDATE
    `

    if (clientRows.length === 0) {
      return { success: false, error: 'Client not found for this chef' }
    }

    const profileRows = await sql<HubGuestProfileRow[]>`
      SELECT hgp.id, hgp.known_allergies, hgp.known_dietary
      FROM hub_guest_profiles hgp
      WHERE hgp.client_id = ${clientId}
      LIMIT 1
    `

    if (profileRows.length === 0) {
      return { success: false, error: 'No hub profile linked to this client' }
    }

    const profile = profileRows[0]
    const householdRows = await sql<HubHouseholdMemberRow[]>`
      SELECT dietary_restrictions, allergies, dislikes, favorites
      FROM hub_household_members
      WHERE profile_id = ${profile.id}
    `

    const allAllergies: SyncSet = new Set()
    const allDietary: SyncSet = new Set()
    const allDislikes: SyncSet = new Set()
    const allFavorites: SyncSet = new Set()

    addNormalizedItems(allAllergies, profile.known_allergies)
    addNormalizedItems(allDietary, profile.known_dietary)

    for (const member of householdRows) {
      addNormalizedItems(allAllergies, member.allergies)
      addNormalizedItems(allDietary, member.dietary_restrictions)
      addNormalizedItems(allDislikes, member.dislikes)
      addNormalizedItems(allFavorites, member.favorites)
    }

    const allergiesArray = [...allAllergies]
    const dietaryArray = [...allDietary]
    const dislikesArray = [...allDislikes]
    const favoritesArray = [...allFavorites]

    const synced = {
      allergies: 0,
      tasteProfileUpdated: false,
      tasteItemsAdded: 0,
      clientDietaryAdded: 0,
      clientAllergiesAdded: 0,
      changes: 0,
    }

    for (const allergen of allergiesArray) {
      const insertedRows = await sql<{ id: string }[]>`
        INSERT INTO client_allergy_records (
          tenant_id,
          client_id,
          allergen,
          severity,
          source,
          confirmed_by_chef
        )
        SELECT
          ${tenantId},
          ${clientId},
          ${allergen},
          'intolerance',
          'intake_form',
          false
        WHERE NOT EXISTS (
          SELECT 1
          FROM client_allergy_records
          WHERE client_id = ${clientId}
            AND lower(allergen) = ${allergen}
        )
        ON CONFLICT (client_id, (lower(allergen))) DO NOTHING
        RETURNING id
      `

      if (insertedRows.length > 0) {
        await logDietaryChange(
          sql,
          tenantId,
          clientId,
          'allergy_added',
          'allergen',
          allergen,
          'warning'
        )
        synced.allergies++
        synced.changes++
      }
    }

    if (dislikesArray.length > 0 || favoritesArray.length > 0 || dietaryArray.length > 0) {
      const tasteRows = await sql<TasteProfileRow[]>`
        SELECT id, disliked_ingredients, favorite_cuisines, avoids
        FROM client_taste_profiles
        WHERE tenant_id = ${tenantId}
          AND client_id = ${clientId}
        FOR UPDATE
      `

      let tasteRow = tasteRows[0]
      if (!tasteRow) {
        const insertedTasteRows = await sql<TasteProfileRow[]>`
          INSERT INTO client_taste_profiles (
            tenant_id,
            client_id,
            disliked_ingredients,
            favorite_cuisines,
            avoids
          )
          VALUES (
            ${tenantId},
            ${clientId},
            ${dislikesArray},
            ${favoritesArray},
            ${dietaryArray}
          )
          ON CONFLICT (client_id, tenant_id) DO NOTHING
          RETURNING id, disliked_ingredients, favorite_cuisines, avoids
        `

        tasteRow = insertedTasteRows[0]
        if (!tasteRow) {
          const retryRows = await sql<TasteProfileRow[]>`
            SELECT id, disliked_ingredients, favorite_cuisines, avoids
            FROM client_taste_profiles
            WHERE tenant_id = ${tenantId}
              AND client_id = ${clientId}
            FOR UPDATE
          `
          tasteRow = retryRows[0]
        }

        const addedCount = dislikesArray.length + favoritesArray.length + dietaryArray.length
        if (insertedTasteRows.length > 0 && addedCount > 0) {
          await logDietaryChange(
            sql,
            tenantId,
            clientId,
            'preference_updated',
            'taste_profile',
            `hub_sync_added:${addedCount}`,
            'info'
          )
          synced.tasteProfileUpdated = true
          synced.tasteItemsAdded += addedCount
          synced.changes++
        }
      }

      if (tasteRow && !synced.tasteProfileUpdated) {
        const newDislikes = getNewItems(tasteRow.disliked_ingredients, dislikesArray)
        const newFavorites = getNewItems(tasteRow.favorite_cuisines, favoritesArray)
        const newAvoids = getNewItems(tasteRow.avoids, dietaryArray)
        const addedCount = newDislikes.length + newFavorites.length + newAvoids.length

        if (addedCount > 0) {
          await sql`
            UPDATE client_taste_profiles
            SET disliked_ingredients = ${mergeAdditive(tasteRow.disliked_ingredients, newDislikes)},
                favorite_cuisines = ${mergeAdditive(tasteRow.favorite_cuisines, newFavorites)},
                avoids = ${mergeAdditive(tasteRow.avoids, newAvoids)},
                updated_at = now()
            WHERE tenant_id = ${tenantId}
              AND client_id = ${clientId}
          `

          await logDietaryChange(
            sql,
            tenantId,
            clientId,
            'preference_updated',
            'taste_profile',
            `hub_sync_added:${addedCount}`,
            'info'
          )
          synced.tasteProfileUpdated = true
          synced.tasteItemsAdded += addedCount
          synced.changes++
        }
      }
    }

    const clientRow = clientRows[0]
    const newClientDietary = getNewItems(clientRow.dietary_restrictions, dietaryArray)
    const newClientAllergies = getNewItems(clientRow.allergies, allergiesArray)

    if (newClientDietary.length > 0 || newClientAllergies.length > 0) {
      await sql`
        UPDATE clients
        SET dietary_restrictions = ${mergeAdditive(
          clientRow.dietary_restrictions,
          newClientDietary
        )},
            allergies = ${mergeAdditive(clientRow.allergies, newClientAllergies)},
            updated_at = now()
        WHERE id = ${clientId}
          AND tenant_id = ${tenantId}
      `

      for (const restriction of newClientDietary) {
        await logDietaryChange(
          sql,
          tenantId,
          clientId,
          'restriction_added',
          'dietary_restrictions',
          restriction,
          'info'
        )
        synced.changes++
      }

      for (const allergy of newClientAllergies) {
        await logDietaryChange(
          sql,
          tenantId,
          clientId,
          'allergy_added',
          'allergies',
          allergy,
          'warning'
        )
        synced.changes++
      }

      synced.clientDietaryAdded = newClientDietary.length
      synced.clientAllergiesAdded = newClientAllergies.length
    }

    // SAFETY: If allergies changed, recheck upcoming menus for conflicts
    if (synced.allergies > 0 || synced.clientAllergiesAdded > 0) {
      try {
        const { createServerClient } = await import('@/lib/db/server')
        const db: any = createServerClient()
        const { recheckUpcomingMenusForClient } = await import('@/lib/dietary/menu-recheck')
        await recheckUpcomingMenusForClient({ tenantId, clientId, db })
      } catch (recheckErr) {
        console.error('[syncHubPreferences] Menu recheck failed (non-blocking):', recheckErr)
      }
    }

    return {
      success: true,
      synced: {
        new_allergy_records: synced.allergies,
        taste_profile_updated: synced.tasteProfileUpdated,
        taste_items_added: synced.tasteItemsAdded,
        client_dietary_added: synced.clientDietaryAdded,
        client_allergies_added: synced.clientAllergiesAdded,
        total_changes_logged: synced.changes,
      },
    }
  })
}
