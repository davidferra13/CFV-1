'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createTipCheckoutUrl } from '@/lib/stripe/checkout'
import { createServerClient } from '@/lib/supabase/server'

export async function generateClientTipCheckoutUrl(eventId: string, amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Tip amount must be a positive whole number of cents')
  }

  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('id, tenant_id, client_id, status')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (error || !event) {
    throw new Error('Event not found')
  }

  if (!['in_progress', 'completed'].includes(String(event.status ?? ''))) {
    throw new Error('Tips are only available after service begins')
  }

  const checkoutUrl = await createTipCheckoutUrl(
    String(event.id),
    String(event.tenant_id),
    String(user.entityId),
    amountCents
  )

  if (!checkoutUrl) {
    throw new Error('Unable to create a tip checkout right now')
  }

  return { url: checkoutUrl }
}
