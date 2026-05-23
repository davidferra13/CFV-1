'use server'

// lib/clients/intelligence-actions.ts
// Server actions for the Client Intelligence Ledger (CLIENT #5).
// Covers: portal interaction capture, risk score persistence,
// revenue attribution, and PII-redacted export.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  computeRiskScore,
  INTELLIGENCE_PII_FIELDS,
  type ClientInteractionType,
  type ClientPortalInteraction,
  type ClientRevenueAttribution,
  type ClientIntelligenceExportRow,
  type SatisfactionTrend,
} from './intelligence-types'

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string }

// ---------------------------------------------------------------------------
// Portal interaction capture
// ---------------------------------------------------------------------------

/**
 * Log a client portal interaction.
 * Called by client portal pages on meaningful events.
 * PII is never stored in this table — session_id is opaque.
 */
export async function logClientPortalInteraction(
  input: Omit<ClientPortalInteraction, 'tenantId'>
): Promise<ActionResult> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const db = createServerClient({ admin: true })

  const { error } = await (db as any).from('client_portal_interactions').insert({
    tenant_id: user.tenantId,
    client_id: input.clientId,
    interaction_type: input.interactionType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    session_id: input.sessionId ?? null,
    source: input.source ?? 'client_portal',
    duration_seconds: input.durationSeconds ?? null,
    metadata: input.metadata ?? {},
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  })

  if (error) {
    console.error('[intelligence] logClientPortalInteraction failed:', error.message)
    return { success: false, error: error.message }
  }

  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Risk score persistence
// ---------------------------------------------------------------------------

/**
 * Recompute and persist the risk score for a single client.
 * Queries interaction history, event history, financial signals.
 */
export async function refreshClientRiskScore(
  clientId: string
): Promise<ActionResult<{ riskScore: number }>> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const db = createServerClient({ admin: true }) as any

  // Fetch client base data
  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id, total_events_completed, last_event_date, satisfaction_trend')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (clientError || !client) {
    return { success: false, error: clientError?.message ?? 'Client not found' }
  }

  // Fetch outstanding balance
  const { data: financials } = await db
    .from('client_financial_summaries')
    .select('outstanding_balance_cents, lifetime_value_cents')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId)
    .single()

  // Fetch declined quotes in last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: declinedQuotes } = await db
    .from('quotes')
    .select('id')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId)
    .eq('status', 'declined')
    .gte('created_at', ninetyDaysAgo)

  // Fetch most recent portal interaction
  const { data: lastInteraction } = await db
    .from('client_portal_interactions')
    .select('occurred_at')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single()

  const lastEventDate = client.last_event_date ? new Date(client.last_event_date) : null
  const daysSinceLastEvent = lastEventDate
    ? Math.floor((Date.now() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const lastInteractionDate = lastInteraction?.occurred_at
    ? new Date(lastInteraction.occurred_at)
    : null
  const daysSinceLastInteraction = lastInteractionDate
    ? Math.floor((Date.now() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  const riskScore = computeRiskScore({
    daysSinceLastEvent,
    daysSinceLastInteraction,
    lifetimeValueCents: financials?.lifetime_value_cents ?? 0,
    totalEvents: client.total_events_completed ?? 0,
    outstandingBalanceCents: financials?.outstanding_balance_cents ?? 0,
    satisfactionTrend: client.satisfaction_trend as SatisfactionTrend | null,
    declineCount: declinedQuotes?.length ?? 0,
  })

  // Persist back to clients row
  const { error: updateError } = await db
    .from('clients')
    .update({ risk_score: riskScore })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath(`/clients/${clientId}`)
  return { success: true, data: { riskScore } }
}

// ---------------------------------------------------------------------------
// Update satisfaction trend
// ---------------------------------------------------------------------------

export async function updateClientSatisfactionTrend(
  clientId: string,
  trend: SatisfactionTrend
): Promise<ActionResult> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const db = createServerClient({ admin: true }) as any

  const { error } = await db
    .from('clients')
    .update({ satisfaction_trend: trend })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/clients/${clientId}`)
  return { success: true, data: undefined }
}

// ---------------------------------------------------------------------------
// Revenue attribution persistence
// ---------------------------------------------------------------------------

/**
 * Record a revenue attribution linking an event to a client.
 * Called after event payment is confirmed.
 */
export async function recordClientRevenueAttribution(
  input: Omit<ClientRevenueAttribution, 'tenantId' | 'id'>
): Promise<ActionResult<{ id: string }>> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const db = createServerClient({ admin: true }) as any

  const { data, error } = await db
    .from('client_revenue_attributions')
    .insert({
      tenant_id: user.tenantId,
      client_id: input.clientId,
      event_id: input.eventId ?? null,
      attribution_type: input.attributionType ?? 'direct',
      amount_cents: input.amountCents,
      currency: input.currency ?? 'usd',
      recognized_at: input.recognizedAt ?? new Date().toISOString(),
      notes: input.notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[intelligence] recordClientRevenueAttribution failed:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath(`/clients/${input.clientId}`)
  return { success: true, data: { id: data.id } }
}

/**
 * Fetch attribution history for a client.
 */
export async function getClientRevenueAttributions(
  clientId: string
): Promise<ActionResult<ClientRevenueAttribution[]>> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const db = createServerClient({ admin: true }) as any

  const { data, error } = await db
    .from('client_revenue_attributions')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId)
    .order('recognized_at', { ascending: false })

  if (error) return { success: false, error: error.message }

  return {
    success: true,
    data: (data ?? []).map((row: any) => ({
      id: row.id,
      tenantId: row.tenant_id,
      clientId: row.client_id,
      eventId: row.event_id ?? null,
      attributionType: row.attribution_type,
      amountCents: row.amount_cents,
      currency: row.currency,
      recognizedAt: row.recognized_at,
      notes: row.notes ?? null,
    })),
  }
}

// ---------------------------------------------------------------------------
// PII-redacted intelligence export
// ---------------------------------------------------------------------------

/**
 * Export client intelligence data with all PII fields redacted.
 * Safe for analytics pipelines, dashboards, or external reporting.
 */
export async function exportClientIntelligenceRedacted(
  clientIds?: string[]
): Promise<ActionResult<ClientIntelligenceExportRow[]>> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  const db = createServerClient({ admin: true }) as any

  let query = db
    .from('clients')
    .select(
      'id, risk_score, satisfaction_trend, predicted_churn_date, lifetime_value_cents, total_events_completed, updated_at'
    )
    .eq('tenant_id', user.tenantId)
    .is('deleted_at', null)

  if (clientIds && clientIds.length > 0) {
    query = query.in('id', clientIds)
  }

  const { data: clients, error } = await query
  if (error) return { success: false, error: error.message }

  // Aggregate interaction counts per client
  const clientIdList = (clients ?? []).map((c: any) => c.id)
  const { data: interactions } = await db
    .from('client_portal_interactions')
    .select('client_id, occurred_at')
    .eq('tenant_id', user.tenantId)
    .in('client_id', clientIdList)
    .order('occurred_at', { ascending: false })

  const interactionMap = new Map<string, { count: number; lastAt: string | null }>()
  for (const row of interactions ?? []) {
    const entry = interactionMap.get(row.client_id) ?? { count: 0, lastAt: null }
    entry.count += 1
    if (!entry.lastAt) entry.lastAt = row.occurred_at
    interactionMap.set(row.client_id, entry)
  }

  // Aggregate revenue per client
  const { data: revenues } = await db
    .from('client_revenue_attributions')
    .select('client_id, amount_cents')
    .eq('tenant_id', user.tenantId)
    .in('client_id', clientIdList)

  const revenueMap = new Map<string, number>()
  for (const row of revenues ?? []) {
    revenueMap.set(row.client_id, (revenueMap.get(row.client_id) ?? 0) + (row.amount_cents ?? 0))
  }

  const rows: ClientIntelligenceExportRow[] = (clients ?? []).map((c: any) => ({
    clientId: c.id,
    // PII redacted
    fullName: '[REDACTED]',
    email: '[REDACTED]',
    phone: '[REDACTED]',
    // Safe computed fields
    riskScore: c.risk_score ?? null,
    satisfactionTrend: c.satisfaction_trend ?? null,
    predictedChurnDate: c.predicted_churn_date ?? null,
    lifetimeValueCents: c.lifetime_value_cents ?? 0,
    totalInteractions: interactionMap.get(c.id)?.count ?? 0,
    lastInteractionAt: interactionMap.get(c.id)?.lastAt ?? null,
    totalRevenueCents: revenueMap.get(c.id) ?? 0,
  }))

  return { success: true, data: rows }
}
