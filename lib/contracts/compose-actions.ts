// Compose Contract from Clauses - Server Actions
// Assembles a contract body from selected clauses and creates an event_contract record.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { z } from 'zod'

const ComposeSchema = z.object({
  eventId: z.string().uuid(),
  clauseIds: z.array(z.string().uuid()).min(1, 'At least one clause is required'),
})

function formatCents(cents: number | null): string {
  if (!cents) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function renderMergeFields(body: string, fields: Record<string, string>): string {
  let rendered = body
  for (const [key, value] of Object.entries(fields)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return rendered
}

/**
 * Compose a contract from selected clauses and create an event_contract record.
 * Clauses are assembled in the order provided (by clauseIds array order),
 * with merge fields resolved from event and client data.
 * Voids any existing unsigned draft/sent contract for this event.
 */
export async function composeContractFromClauses(
  eventId: string,
  clauseIds: string[]
): Promise<{ success: boolean; data?: { contractId: string }; error?: string }> {
  try {
    const user = await requireChef()
    ComposeSchema.parse({ eventId, clauseIds })
    const db: any = createServerClient()

    // Load event + client data for merge fields
    const { data: event, error: eventError } = await db
      .from('events')
      .select(
        `
        id, status, event_date, quoted_price_cents, deposit_amount_cents,
        occasion, guest_count, location_address, location_city, location_state,
        clients (id, full_name, email)
      `
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (eventError || !event) {
      return { success: false, error: 'Event not found' }
    }

    if (event.status === 'cancelled') {
      return { success: false, error: 'Cannot create a contract for a cancelled event' }
    }

    const client = (event as any).clients
    if (!client) {
      return { success: false, error: 'No client associated with this event' }
    }

    // Load selected clauses
    const { data: clauses, error: clauseError } = await db
      .from('contract_clauses')
      .select('id, title, body, sort_order')
      .eq('chef_id', user.tenantId!)
      .in('id', clauseIds)

    if (clauseError) {
      console.error('[composeContractFromClauses] Clause load error:', clauseError)
      return { success: false, error: 'Failed to load clauses' }
    }

    if (!clauses || clauses.length === 0) {
      return { success: false, error: 'No valid clauses found' }
    }

    // Sort clauses by the order in clauseIds (preserves user-selected order)
    const clauseMap = new Map(clauses.map((c: any) => [c.id, c]))
    const orderedClauses = clauseIds.map((id) => clauseMap.get(id)).filter(Boolean)

    if (orderedClauses.length === 0) {
      return { success: false, error: 'None of the selected clauses belong to your account' }
    }

    // Build merge field values
    const mergeFields: Record<string, string> = {
      client_name: client.full_name ?? 'Client',
      event_date: event.event_date ? format(new Date(event.event_date), 'MMMM d, yyyy') : 'TBD',
      quoted_price: formatCents(event.quoted_price_cents),
      deposit_amount: formatCents(event.deposit_amount_cents),
      occasion: event.occasion ?? 'Private Dining Event',
      guest_count: String(event.guest_count ?? 0),
      event_location: [event.location_address, event.location_city, event.location_state]
        .filter(Boolean)
        .join(', '),
    }

    // Load cancellation policy for merge field
    try {
      const { data: chefConfig } = await db
        .from('chefs')
        .select('cancellation_cutoff_days, deposit_refundable')
        .eq('id', user.tenantId!)
        .single()
      const { getCancellationPolicySummary } = await import('@/lib/cancellation/policy')
      mergeFields.cancellation_policy = getCancellationPolicySummary({
        cancellationCutoffDays: chefConfig?.cancellation_cutoff_days ?? 15,
        depositRefundable: chefConfig?.deposit_refundable ?? false,
      })
    } catch {
      mergeFields.cancellation_policy = 'See cancellation policy section.'
    }

    // Assemble contract body from clauses
    const header = `# Private Chef Service Agreement

This Service Agreement ("Agreement") is entered into between the private chef ("Chef") and **${mergeFields.client_name}** ("Client") for the event on **${mergeFields.event_date}**.

---

`

    const clauseBodies = orderedClauses.map((clause: any) =>
      renderMergeFields(clause.body, mergeFields)
    )
    const composedBody =
      header +
      clauseBodies.join('\n\n---\n\n') +
      `

---

## Signatures

**Client Signature:** ____________________
**Date:** ____________________

**Chef Signature:** ____________________
**Date:** ____________________
`

    // Void any existing unsigned contracts for this event
    await db
      .from('event_contracts')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        void_reason: 'Superseded by clause-composed contract',
      })
      .eq('event_id', eventId)
      .eq('chef_id', user.tenantId!)
      .in('status', ['draft', 'sent', 'viewed'])

    // Create the new contract
    const { data: contract, error: insertError } = await db
      .from('event_contracts')
      .insert({
        event_id: eventId,
        chef_id: user.tenantId!,
        client_id: client.id,
        body_snapshot: composedBody,
        status: 'draft',
      })
      .select('id')
      .single()

    if (insertError || !contract) {
      console.error('[composeContractFromClauses] Insert error:', insertError)
      return { success: false, error: 'Failed to create contract' }
    }

    revalidatePath(`/events/${eventId}`)
    revalidatePath('/contracts')

    return { success: true, data: { contractId: contract.id } }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const zodErr = err as z.ZodError<unknown>
      return { success: false, error: zodErr.issues[0]?.message ?? 'Validation error' }
    }
    console.error('[composeContractFromClauses] Unexpected error:', err)
    return { success: false, error: 'Unexpected error composing contract' }
  }
}
