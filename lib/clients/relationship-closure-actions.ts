'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'
import type {
  ClosureMode,
  ClosureReasonCategory,
  ActiveEventPolicy,
  ClientRelationshipClosure,
} from './relationship-closure-types'
import { getActiveClientClosure } from './relationship-closure-queries'

// ─── SCHEMAS ─────────────────────────────────────────────

const CloseClientSchema = z.object({
  client_id: z.string().uuid(),
  closure_mode: z.enum(['transitioning', 'closed', 'do_not_book', 'legal_hold'] as const),
  reason_category: z.enum([
    'moving_away',
    'chef_capacity',
    'client_requested',
    'relationship_soured',
    'payment_risk',
    'safety_risk',
    'legal_dispute',
    'other',
  ] as const),
  internal_notes: z.string().max(5000).optional(),
  client_message: z.string().max(2000).optional(),
  block_new_events: z.boolean().default(true),
  block_public_booking: z.boolean().default(true),
  block_automated_outreach: z.boolean().default(true),
  revoke_portal_access: z.boolean().default(false),
  allow_active_event_messages_until: z.string().datetime().optional(),
  active_event_policy: z
    .enum(['continue_active_events', 'cancel_active_events', 'review_each_event'] as const)
    .default('review_each_event'),
})

const ReopenClientSchema = z.object({
  client_id: z.string().uuid(),
  reopen_reason: z.string().min(1).max(2000),
})

// ─── ACTIONS ─────────────────────────────────────────────

export async function closeClientRelationship(
  input: z.infer<typeof CloseClientSchema>
): Promise<{ success: boolean; closureId?: string; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  let validated: z.infer<typeof CloseClientSchema>
  try {
    validated = CloseClientSchema.parse(input)
  } catch (err) {
    return { success: false, error: 'Invalid input' }
  }

  // Verify client belongs to tenant
  const { data: client } = await db
    .from('clients')
    .select('id, tenant_id')
    .eq('id', validated.client_id)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) {
    return { success: false, error: 'Client not found or does not belong to your account' }
  }

  // Check for existing active closure
  const existing = await getActiveClientClosure(db, tenantId, validated.client_id)
  if (existing) {
    return {
      success: false,
      error: `This client already has an active closure (${existing.closure_mode}). Reopen it first to change the closure mode.`,
    }
  }

  // Insert closure row
  const { data: closure, error } = await db
    .from('client_relationship_closures')
    .insert({
      tenant_id: tenantId,
      client_id: validated.client_id,
      closure_mode: validated.closure_mode,
      reason_category: validated.reason_category,
      internal_notes: validated.internal_notes?.trim() || null,
      client_message: validated.client_message?.trim() || null,
      block_new_events: validated.block_new_events,
      block_public_booking: validated.block_public_booking,
      block_automated_outreach: validated.block_automated_outreach,
      revoke_portal_access: validated.revoke_portal_access,
      allow_active_event_messages_until: validated.allow_active_event_messages_until || null,
      active_event_policy: validated.active_event_policy,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !closure) {
    console.error('[closure-actions] closeClientRelationship insert failed:', error)
    return { success: false, error: 'Failed to close client relationship' }
  }

  // Revoke portal token if requested (non-blocking)
  if (validated.revoke_portal_access) {
    try {
      await db
        .from('clients')
        .update({
          portal_access_token: null,
          portal_access_token_hash: null,
          portal_token_expires_at: null,
        })
        .eq('id', validated.client_id)
        .eq('tenant_id', tenantId)
    } catch (err) {
      console.error('[closure-actions] Portal token revocation failed (non-blocking):', err)
    }
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: user.id,
      action: 'client_relationship_closed',
      domain: 'client',
      entityType: 'client',
      entityId: validated.client_id,
      summary: `Closed client relationship: ${validated.closure_mode} (${validated.reason_category})`,
      context: {
        closure_mode: validated.closure_mode,
        reason_category: validated.reason_category,
        closure_id: closure.id,
      },
      clientId: validated.client_id,
    })
  } catch (err) {
    console.error('[closure-actions] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${validated.client_id}`)
  revalidatePath('/events')
  revalidatePath('/my-events')

  return { success: true, closureId: closure.id }
}

export async function reopenClientRelationship(
  input: z.infer<typeof ReopenClientSchema>
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  let validated: z.infer<typeof ReopenClientSchema>
  try {
    validated = ReopenClientSchema.parse(input)
  } catch {
    return { success: false, error: 'Invalid input' }
  }

  // Find active closure for this tenant + client
  const closure = await getActiveClientClosure(db, tenantId, validated.client_id)
  if (!closure) {
    return { success: false, error: 'No active closure found for this client' }
  }

  // Update the closure row
  const { error } = await db
    .from('client_relationship_closures')
    .update({
      reopened_by: user.id,
      reopened_at: new Date().toISOString(),
      reopen_reason: validated.reopen_reason.trim(),
    })
    .eq('id', closure.id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[closure-actions] reopenClientRelationship update failed:', error)
    return { success: false, error: 'Failed to reopen client relationship' }
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId,
      actorId: user.id,
      action: 'client_relationship_reopened',
      domain: 'client',
      entityType: 'client',
      entityId: validated.client_id,
      summary: `Reopened client relationship: ${validated.reopen_reason.trim().slice(0, 100)}`,
      context: { closure_id: closure.id, reason: validated.reopen_reason },
      clientId: validated.client_id,
    })
  } catch (err) {
    console.error('[closure-actions] Activity log failed (non-blocking):', err)
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${validated.client_id}`)
  revalidatePath('/events')
  revalidatePath('/my-events')

  return { success: true }
}

export async function getClientRelationshipClosureSummary(
  clientId: string
): Promise<{ closure: ClientRelationshipClosure | null; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  try {
    const closure = await getActiveClientClosure(db, tenantId, clientId)
    return { closure }
  } catch (err) {
    console.error('[closure-actions] getClientRelationshipClosureSummary failed:', err)
    return { closure: null, error: 'Failed to load closure status' }
  }
}

export async function getClientClosureReadiness(clientId: string): Promise<{
  activeEventCount: number | null
  unpaidBalanceCents: number | null
  hasActivePortalLink: boolean | null
  error?: string
}> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  let activeEventCount: number | null = null
  let unpaidBalanceCents: number | null = null
  let hasActivePortalLink: boolean | null = null

  // Active events
  try {
    const { data, error } = await db
      .from('events')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .in('status', ['draft', 'proposed', 'accepted', 'paid', 'confirmed', 'in_progress'])

    if (error) throw error
    activeEventCount = data?.length ?? 0
  } catch (err) {
    console.error('[closure-readiness] Active event count failed:', err)
  }

  // Unpaid balance
  try {
    const { data, error } = await db
      .from('event_financial_summary')
      .select('balance_due_cents')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)

    if (error) throw error
    unpaidBalanceCents = (data || []).reduce(
      (sum: number, row: { balance_due_cents: number }) => sum + (row.balance_due_cents || 0),
      0
    )
  } catch (err) {
    console.error('[closure-readiness] Unpaid balance failed:', err)
  }

  // Portal link
  try {
    const { data, error } = await db
      .from('clients')
      .select('portal_access_token_hash, portal_token_expires_at')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) throw error
    const hasHash = !!data?.portal_access_token_hash
    const notExpired = data?.portal_token_expires_at
      ? new Date(data.portal_token_expires_at) > new Date()
      : false
    hasActivePortalLink = hasHash && notExpired
  } catch (err) {
    console.error('[closure-readiness] Portal link check failed:', err)
  }

  const hasError =
    activeEventCount === null || unpaidBalanceCents === null || hasActivePortalLink === null

  return {
    activeEventCount,
    unpaidBalanceCents,
    hasActivePortalLink,
    ...(hasError ? { error: 'Some readiness checks failed to load' } : {}),
  }
}
