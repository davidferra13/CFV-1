'use server'

import { createServerClient } from '@/lib/db/server'
import { requireAuth } from '@/lib/auth/get-user'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { circleFirstNotify } from './circle-first-notify'

// ---------------------------------------------------------------------------
// Circle Approval: accept a quote from within a Dinner Circle
// ---------------------------------------------------------------------------

const ApproveFromCircleSchema = z.object({
  quoteId: z.string().uuid(),
  groupToken: z.string().min(1),
})

/**
 * Get pending quote for a circle (if any).
 * Returns the quote that is in 'sent' status linked to this circle's event or inquiry.
 */
export async function getPendingQuoteForCircle(groupToken: string): Promise<{
  quoteId: string
  quoteName: string
  totalCents: number
  eventId: string | null
  validUntil: string | null
} | null> {
  const db = createServerClient({ admin: true })

  // Find the group by token
  const { data: group } = await db
    .from('hub_groups')
    .select('id, event_id, inquiry_id, tenant_id')
    .eq('group_token', groupToken)
    .eq('is_active', true)
    .maybeSingle()

  if (!group) return null

  // Look for a pending quote linked to this circle's event or inquiry
  let quoteQuery = db
    .from('quotes')
    .select('id, quote_name, total_quoted_cents, effective_total_cents, event_id, valid_until')
    .eq('status', 'sent')
    .eq('tenant_id', group.tenant_id)

  if (group.event_id) {
    quoteQuery = quoteQuery.eq('event_id', group.event_id)
  } else if (group.inquiry_id) {
    quoteQuery = quoteQuery.eq('inquiry_id', group.inquiry_id)
  } else {
    return null
  }

  const { data: quotes } = await quoteQuery.order('created_at', { ascending: false }).limit(1)

  if (!quotes || quotes.length === 0) return null

  const quote = quotes[0]
  return {
    quoteId: quote.id,
    quoteName: quote.quote_name || 'Quote',
    totalCents: quote.effective_total_cents ?? quote.total_quoted_cents ?? 0,
    eventId: quote.event_id,
    validUntil: quote.valid_until,
  }
}

/**
 * Approve a quote from within a Dinner Circle.
 *
 * This calls the existing quote acceptance logic (same DB updates),
 * then posts a notification to the circle confirming the approval.
 */
export async function approveQuoteFromCircle(
  input: z.infer<typeof ApproveFromCircleSchema>
): Promise<{
  success: boolean
  error?: string
  eventId?: string
}> {
  const user = await requireAuth()
  const validated = ApproveFromCircleSchema.parse(input)
  const db = createServerClient({ admin: true })

  // 1. Load the quote and verify it is still pending
  const { data: quote } = await db
    .from('quotes')
    .select(
      'id, status, event_id, inquiry_id, tenant_id, total_quoted_cents, effective_total_cents, valid_until, client_id'
    )
    .eq('id', validated.quoteId)
    .eq('status', 'sent')
    .single()

  if (!quote) {
    return { success: false, error: 'Quote not found or already responded to' }
  }

  // 2. Check expiry
  if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
    return { success: false, error: 'This quote has expired' }
  }

  // 3. Accept the quote (same logic as existing acceptQuote)
  const { error: updateError } = await db
    .from('quotes')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', quote.id)
    .eq('status', 'sent')

  if (updateError) {
    return { success: false, error: 'Failed to accept quote' }
  }

  // 4. If linked to an inquiry, update inquiry status
  if (quote.inquiry_id) {
    await db
      .from('inquiries')
      .update({ status: 'confirmed' })
      .eq('id', quote.inquiry_id)
      .in('status', ['quoted', 'responded'])
  }

  // 5. If linked to an event, update event pricing fields
  if (quote.event_id) {
    const totalCents = quote.effective_total_cents ?? quote.total_quoted_cents
    await db
      .from('events')
      .update({
        quoted_total_cents: totalCents,
        status: 'accepted',
      })
      .eq('id', quote.event_id)
      .in('status', ['draft', 'proposed'])
  }

  // 6. Post approval notification to the circle
  try {
    await circleFirstNotify({
      eventId: quote.event_id,
      inquiryId: quote.inquiry_id,
      notificationType: 'quote_accepted',
      body: 'Quote approved! The dinner is confirmed.',
      actionUrl: quote.event_id ? `/my-events/${quote.event_id}` : undefined,
      actionLabel: quote.event_id ? 'View Event' : undefined,
    })
  } catch (err) {
    // Non-blocking: circle notification failure should not roll back approval
    console.error('[approveQuoteFromCircle] Circle notify failed:', err)
  }

  // 7. Revalidate relevant paths
  revalidatePath(`/hub/g/${validated.groupToken}`)
  if (quote.event_id) {
    revalidatePath(`/my-events/${quote.event_id}`)
  }

  return { success: true, eventId: quote.event_id ?? undefined }
}
