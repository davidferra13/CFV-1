'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type PaymentDispute = {
  id: string
  eventId: string | null
  stripeDisputeId: string | null
  amountCents: number
  reason: string | null
  status: 'open' | 'under_review' | 'won' | 'lost'
  evidenceNotes: string | null
  evidenceUrls: string[]
  openedAt: string
  resolvedAt: string | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreateDisputeSchema = z.object({
  eventId: z.string().uuid().optional(),
  stripeDisputeId: z.string().optional(),
  amountCents: z.number().int().min(0),
  reason: z.string().optional(),
})

const UpdateEvidenceSchema = z.object({
  disputeId: z.string().uuid(),
  evidenceNotes: z.string().optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────

function mapRow(row: any): PaymentDispute {
  return {
    id: row.id,
    eventId: row.event_id,
    stripeDisputeId: row.stripe_dispute_id,
    amountCents: row.amount_cents,
    reason: row.reason,
    status: row.status,
    evidenceNotes: row.evidence_notes,
    evidenceUrls: row.evidence_urls || [],
    openedAt: row.opened_at,
    resolvedAt: row.resolved_at,
  }
}

// ─── Actions ─────────────────────────────────────────────────────

export async function getDisputes(status?: string): Promise<PaymentDispute[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('payment_disputes')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('opened_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch disputes: ${error.message}`)

  return (data || []).map(mapRow)
}

export async function createDispute(
  input: z.infer<typeof CreateDisputeSchema>
): Promise<PaymentDispute> {
  const user = await requireChef()
  const parsed = CreateDisputeSchema.parse(input)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('payment_disputes')
    .insert({
      chef_id: user.tenantId!,
      event_id: parsed.eventId || null,
      stripe_dispute_id: parsed.stripeDisputeId || null,
      amount_cents: parsed.amountCents,
      reason: parsed.reason || null,
      status: 'open',
      evidence_urls: [],
      opened_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create dispute: ${error.message}`)

  revalidatePath('/finance/disputes')
  return mapRow(data)
}

export async function updateDisputeEvidence(
  input: z.infer<typeof UpdateEvidenceSchema>
): Promise<PaymentDispute> {
  const user = await requireChef()
  const parsed = UpdateEvidenceSchema.parse(input)
  const supabase = createServerClient()

  const updates: Record<string, any> = {}
  if (parsed.evidenceNotes !== undefined) updates.evidence_notes = parsed.evidenceNotes
  if (parsed.evidenceUrls !== undefined) updates.evidence_urls = parsed.evidenceUrls

  // Move to under_review when evidence is added
  updates.status = 'under_review'

  const { data, error } = await supabase
    .from('payment_disputes')
    .update(updates)
    .eq('id', parsed.disputeId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update evidence: ${error.message}`)

  revalidatePath('/finance/disputes')
  return mapRow(data)
}

export async function resolveDispute(
  disputeId: string,
  outcome: 'won' | 'lost'
): Promise<PaymentDispute> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('payment_disputes')
    .update({
      status: outcome,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to resolve dispute: ${error.message}`)

  revalidatePath('/finance/disputes')
  return mapRow(data)
}
