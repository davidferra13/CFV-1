'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildClientIntelligenceProjection,
  type ClientIntelligenceProjection,
  type ClientIntelligenceProjectionBundle,
} from './projection'

type QueryResult<T> = {
  data: T[] | null
  error?: { message?: string } | null
}

export async function getClientIntelligenceIndex(
  input: {
    limit?: number
  } = {}
): Promise<{
  projections: ClientIntelligenceProjection[]
  sourceWarnings: string[]
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100)
  const sourceWarnings: string[] = []

  const clientsResponse = await db
    .from('clients')
    .select(
      [
        'id',
        'tenant_id',
        'full_name',
        'preferred_name',
        'status',
        'birthday',
        'anniversary',
        'preferred_contact_method',
        'communication_style_notes',
        'favorite_cuisines',
        'favorite_dishes',
        'dislikes',
        'spice_tolerance',
        'dietary_restrictions',
        'dietary_protocols',
        'allergies',
        'partner_name',
        'children',
        'pets',
        'preferred_service_style',
        'access_instructions',
        'gate_code',
        'security_notes',
        'budget_range_min_cents',
        'budget_range_max_cents',
        'payment_behavior',
        'tipping_pattern',
        'vibe_notes',
        'what_they_care_about',
        'red_flags',
        'referral_potential',
        'important_dates',
        'personal_milestones',
        'last_event_date',
        'created_at',
        'updated_at',
      ].join(', ')
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (clientsResponse.error) {
    throw new Error(`Failed to load client intelligence clients: ${clientsResponse.error.message}`)
  }

  const clients = clientsResponse.data ?? []
  const clientIds = clients.map((client: any) => client.id)
  if (clientIds.length === 0) {
    return { projections: [], sourceWarnings }
  }

  const [events, preferences, allergyRecords, surveys, financialSummaries, households, vectors] =
    await Promise.all([
      scopedSource<any>(
        db
          .from('events')
          .select(
            'id, tenant_id, client_id, event_date, occasion, status, guest_count, service_style, dietary_restrictions, allergies, special_requests, kitchen_notes, site_notes, quoted_price_cents, menu_approval_status, chef_outcome_notes, chef_outcome_rating, updated_at, created_at'
          )
          .eq('tenant_id', tenantId)
          .in('client_id', clientIds)
          .order('event_date', { ascending: false })
          .limit(500),
        'events',
        sourceWarnings
      ),
      scopedSource<any>(
        db
          .from('client_preferences')
          .select(
            'id, tenant_id, client_id, item_type, item_name, rating, notes, observed_at, updated_at, created_at'
          )
          .eq('tenant_id', tenantId)
          .in('client_id', clientIds)
          .limit(500),
        'client_preferences',
        sourceWarnings
      ),
      scopedSource<any>(
        db
          .from('client_allergy_records')
          .select(
            'id, tenant_id, client_id, allergen, severity, source, confirmed_by_chef, confirmed_at, notes, updated_at, created_at'
          )
          .eq('tenant_id', tenantId)
          .in('client_id', clientIds)
          .limit(500),
        'client_allergy_records',
        sourceWarnings
      ),
      scopedSource<any>(
        db
          .from('post_event_surveys')
          .select(
            'id, tenant_id, client_id, event_id, overall, food_quality, what_they_loved, what_could_improve, would_book_again, completed_at, created_at'
          )
          .eq('tenant_id', tenantId)
          .in('client_id', clientIds)
          .limit(300),
        'post_event_surveys',
        sourceWarnings
      ),
      scopedSource<any>(
        db
          .from('client_financial_summary')
          .select(
            'client_id, tenant_id, lifetime_value_cents, total_events_count, total_events_completed, average_spend_per_event, last_event_date, first_event_date, days_since_last_event, is_dormant'
          )
          .eq('tenant_id', tenantId)
          .in('client_id', clientIds),
        'client_financial_summary',
        sourceWarnings
      ),
      scopedSource<any>(
        db
          .from('households')
          .select('id, tenant_id, primary_client_id, name, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .limit(300),
        'households',
        sourceWarnings
      ),
      scopedSource<any>(
        db
          .from('client_profile_vectors')
          .select(
            'id, tenant_id, primary_client_id, household_id, engine_version, confidence_score, conflict_count, is_current, generated_at, created_at'
          )
          .eq('tenant_id', tenantId)
          .in('primary_client_id', clientIds)
          .eq('is_current', true),
        'client_profile_vectors',
        sourceWarnings
      ),
    ])

  const tenantHouseholdIds = households.map((household: any) => household.id).filter(Boolean)
  const householdMembers =
    tenantHouseholdIds.length > 0
      ? await scopedSource<any>(
          db
            .from('household_members')
            .select('household_id, client_id, relationship')
            .in('household_id', tenantHouseholdIds),
          'household_members',
          sourceWarnings
        )
      : []

  const financialByClient = mapBy(financialSummaries, 'client_id')
  const householdMembersByClient = groupBy(householdMembers, 'client_id')
  const projections = clients.map((client: any) => {
    const memberHouseholdIds = new Set(
      (householdMembersByClient.get(client.id) ?? []).map((member: any) => member.household_id)
    )
    const clientHouseholds = households.filter(
      (household: any) =>
        household.primary_client_id === client.id || memberHouseholdIds.has(household.id)
    )
    const clientHouseholdIds = new Set(clientHouseholds.map((household: any) => household.id))
    const bundle: ClientIntelligenceProjectionBundle = {
      tenantId,
      client,
      events: events.filter((event: any) => event.client_id === client.id),
      preferences: preferences.filter((preference: any) => preference.client_id === client.id),
      allergyRecords: allergyRecords.filter((record: any) => record.client_id === client.id),
      surveys: surveys.filter((survey: any) => survey.client_id === client.id),
      financialSummary: financialByClient.get(client.id) ?? null,
      households: clientHouseholds,
      householdMembers: householdMembers.filter((member: any) =>
        clientHouseholdIds.has(member.household_id)
      ),
      profileVectors: vectors.filter((vector: any) => vector.primary_client_id === client.id),
    }
    return buildClientIntelligenceProjection(bundle)
  })

  return { projections, sourceWarnings }
}

async function scopedSource<T>(
  query: Promise<QueryResult<T>>,
  sourceName: string,
  warnings: string[]
): Promise<T[]> {
  const result = await query
  if (result.error) {
    warnings.push(`${sourceName}: ${result.error.message ?? 'source unavailable'}`)
    return []
  }
  return result.data ?? []
}

function groupBy<T extends Record<string, any>>(records: T[], key: string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const record of records) {
    const value = record[key]
    if (!value) continue
    const current = map.get(value) ?? []
    current.push(record)
    map.set(value, current)
  }
  return map
}

function mapBy<T extends Record<string, any>>(records: T[], key: string): Map<string, T> {
  const map = new Map<string, T>()
  for (const record of records) {
    const value = record[key]
    if (value) map.set(value, record)
  }
  return map
}
