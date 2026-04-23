'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/db/admin'
import { createServerClient } from '@/lib/db/server'
import {
  buildClientCulinarySignalSnapshot,
  summarizeClientCulinarySignals,
  type ClientAllergySignalRecord,
  type ClientCulinaryClientRecord,
  type ClientCulinaryMenuSummary,
  type ClientCulinarySignalSnapshot,
  type ClientMealRequestSignalRecord,
  type ClientPreferenceSignalRecord,
  type ClientTasteProfileRecord,
  type ServedDishSignalRecord,
} from './culinary-signals'

type DbClient = {
  from: (table: string) => any
}

async function loadClientCulinarySourceData(
  clientId: string,
  tenantId: string,
  db: DbClient
): Promise<{
  client: ClientCulinaryClientRecord | null
  allergyRecords: ClientAllergySignalRecord[]
  tasteProfile: ClientTasteProfileRecord | null
  preferences: ClientPreferenceSignalRecord[]
  servedDishes: ServedDishSignalRecord[]
  mealRequests: ClientMealRequestSignalRecord[]
  pastEventCount: number
}> {
  const [
    clientResponse,
    allergyResponse,
    tasteProfileResponse,
    preferenceResponse,
    servedDishResponse,
    mealRequestResponse,
    pastEventCountResponse,
  ] = await Promise.all([
    db
      .from('clients')
      .select(
        'id, full_name, dietary_restrictions, allergies, dislikes, spice_tolerance, favorite_cuisines, favorite_dishes, updated_at'
      )
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single(),
    db
      .from('client_allergy_records')
      .select('allergen, severity, confirmed_by_chef, updated_at, created_at')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId),
    db
      .from('client_taste_profiles')
      .select('favorite_cuisines, disliked_ingredients, spice_tolerance, avoids, updated_at')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    db
      .from('client_preferences')
      .select('item_type, item_name, rating, observed_at')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('observed_at', { ascending: false }),
    db
      .from('served_dish_history')
      .select('dish_name, client_reaction, client_feedback_at, served_date')
      .eq('client_id', clientId)
      .eq('chef_id', tenantId)
      .order('served_date', { ascending: false }),
    db
      .from('client_meal_requests')
      .select('request_type, dish_name, status, updated_at, created_at')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .in('status', ['completed', 'confirmed', 'paid', 'in_progress']),
  ])

  return {
    client: (clientResponse?.data as ClientCulinaryClientRecord | null) ?? null,
    allergyRecords: (allergyResponse?.data as ClientAllergySignalRecord[] | null | undefined) ?? [],
    tasteProfile: (tasteProfileResponse?.data as ClientTasteProfileRecord | null) ?? null,
    preferences:
      (preferenceResponse?.data as ClientPreferenceSignalRecord[] | null | undefined) ?? [],
    servedDishes: (servedDishResponse?.data as ServedDishSignalRecord[] | null | undefined) ?? [],
    mealRequests:
      (mealRequestResponse?.data as ClientMealRequestSignalRecord[] | null | undefined) ?? [],
    pastEventCount: Number(
      (pastEventCountResponse as { count?: number | null } | null | undefined)?.count ?? 0
    ),
  }
}

export async function getClientCulinarySnapshot(
  clientId: string
): Promise<ClientCulinarySignalSnapshot | null> {
  const user = await requireChef()
  const db = createServerClient()

  return getClientCulinarySnapshotForTenant(clientId, user.tenantId!, db)
}

export async function getClientCulinarySnapshotForTenant(
  clientId: string,
  tenantId: string,
  dbClient?: DbClient
): Promise<ClientCulinarySignalSnapshot | null> {
  const db = dbClient ?? createAdminClient()
  const sourceData = await loadClientCulinarySourceData(clientId, tenantId, db)

  if (!sourceData.client) return null

  return buildClientCulinarySignalSnapshot({
    client: sourceData.client,
    allergyRecords: sourceData.allergyRecords,
    tasteProfile: sourceData.tasteProfile,
    preferences: sourceData.preferences,
    servedDishes: sourceData.servedDishes,
    mealRequests: sourceData.mealRequests,
  })
}

export async function getClientCulinaryMenuSummaryForTenant(
  clientId: string,
  tenantId: string,
  dbClient?: DbClient
): Promise<ClientCulinaryMenuSummary | null> {
  const db = dbClient ?? createAdminClient()
  const sourceData = await loadClientCulinarySourceData(clientId, tenantId, db)

  if (!sourceData.client) return null

  const snapshot = buildClientCulinarySignalSnapshot({
    client: sourceData.client,
    allergyRecords: sourceData.allergyRecords,
    tasteProfile: sourceData.tasteProfile,
    preferences: sourceData.preferences,
    servedDishes: sourceData.servedDishes,
    mealRequests: sourceData.mealRequests,
  })

  return summarizeClientCulinarySignals(snapshot, sourceData.pastEventCount)
}
