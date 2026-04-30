'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildStrategyOutcomeNote,
  buildStrategyReplyNote,
} from '@/lib/clients/client-strategy-note'

const OUTCOME_LABELS = {
  booked: 'Booked',
  no_response: 'No response',
  profile_updated: 'Profile updated',
  wrong_recommendation: 'Wrong recommendation',
  dismissed: 'Dismissed',
} as const

type StrategyOutcome = keyof typeof OUTCOME_LABELS

type StrategyActionResult = {
  success: boolean
  error?: string
  id?: string
}

export async function recordClientStrategyReplyIntake(input: {
  clientId: string
  recommendationId: string
  recommendationTitle: string
  replyText: string
  proposedUpdates?: string
}): Promise<StrategyActionResult> {
  const user = await requireChef()
  const clientId = input.clientId.trim()
  const recommendationId = input.recommendationId.trim()
  const recommendationTitle = input.recommendationTitle.trim()
  const replyText = input.replyText.trim()
  const proposedUpdates = input.proposedUpdates?.trim() ?? ''

  if (!clientId || !recommendationId || !recommendationTitle) {
    return { success: false, error: 'Client and recommendation are required' }
  }

  if (!replyText || replyText.length > 3000) {
    return { success: false, error: 'Client reply must be 1-3000 characters' }
  }

  if (proposedUpdates.length > 1500) {
    return { success: false, error: 'Proposed updates must be under 1500 characters' }
  }

  const db: any = createServerClient()
  const client = await requireScopedClient(db, clientId, user.tenantId!)
  if (!client) return { success: false, error: 'Client not found' }

  const { data: last } = await db
    .from('chef_todos')
    .select('sort_order')
    .eq('chef_id', user.entityId)
    .eq('completed', false)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await db
    .from('chef_todos')
    .insert({
      chef_id: user.entityId,
      created_by: user.id,
      client_id: clientId,
      text: `Review client reply for ${recommendationTitle}`,
      completed: false,
      sort_order: (last?.sort_order ?? -1) + 1,
      priority: 'high',
      category: 'client',
      notes: [
        buildStrategyReplyNote(recommendationId),
        `Client: ${client.full_name}`,
        `Recommendation: ${recommendationTitle}`,
        'Reply:',
        replyText,
        proposedUpdates ? 'Proposed profile updates:' : null,
        proposedUpdates || null,
      ]
        .filter(Boolean)
        .join('\n'),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[client-strategy-actions] reply intake failed:', error)
    return { success: false, error: 'Failed to create reply review task' }
  }

  revalidateClientStrategy(clientId)
  return { success: true, id: data.id }
}

export async function recordClientStrategyOutcome(input: {
  clientId: string
  recommendationId: string
  recommendationTitle: string
  outcome: StrategyOutcome
  notes?: string
}): Promise<StrategyActionResult> {
  const user = await requireChef()
  const clientId = input.clientId.trim()
  const recommendationId = input.recommendationId.trim()
  const recommendationTitle = input.recommendationTitle.trim()
  const notes = input.notes?.trim() ?? ''

  if (!clientId || !recommendationId || !recommendationTitle) {
    return { success: false, error: 'Client and recommendation are required' }
  }

  if (!(input.outcome in OUTCOME_LABELS)) {
    return { success: false, error: 'Outcome is invalid' }
  }

  if (notes.length > 1500) {
    return { success: false, error: 'Outcome notes must be under 1500 characters' }
  }

  const db: any = createServerClient()
  const client = await requireScopedClient(db, clientId, user.tenantId!)
  if (!client) return { success: false, error: 'Client not found' }

  const now = new Date().toISOString()
  const { data, error } = await db
    .from('chef_todos')
    .insert({
      chef_id: user.entityId,
      created_by: user.id,
      client_id: clientId,
      text: `Strategy outcome: ${OUTCOME_LABELS[input.outcome]} - ${recommendationTitle}`,
      completed: true,
      completed_at: now,
      sort_order: 0,
      priority: input.outcome === 'wrong_recommendation' ? 'high' : 'medium',
      category: 'client',
      notes: [
        buildStrategyOutcomeNote(recommendationId),
        `Outcome: ${input.outcome}`,
        `Client: ${client.full_name}`,
        `Recommendation: ${recommendationTitle}`,
        notes ? 'Notes:' : null,
        notes || null,
      ]
        .filter(Boolean)
        .join('\n'),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[client-strategy-actions] outcome capture failed:', error)
    return { success: false, error: 'Failed to record recommendation outcome' }
  }

  revalidateClientStrategy(clientId)
  return { success: true, id: data.id }
}

async function requireScopedClient(
  db: any,
  clientId: string,
  tenantId: string
): Promise<{ id: string; full_name: string } | null> {
  const { data, error } = await db
    .from('clients')
    .select('id, full_name')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

function revalidateClientStrategy(clientId: string): void {
  revalidatePath(`/clients/${clientId}/relationship`)
  revalidatePath('/clients/strategy-readiness')
  revalidatePath('/reminders')
  revalidatePath('/dashboard')
}
