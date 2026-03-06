'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCircleForContext, getCircleForEvent, getChefHubProfileId } from './circle-lookup'

// ---------------------------------------------------------------------------
// Circle Lifecycle Hooks
// Posts structured messages to the Dinner Circle at key lifecycle transitions.
// All functions are non-blocking side effects: wrap in try/catch at call site.
// ---------------------------------------------------------------------------

// ─── Menu Shared ─────────────────────────────────────────────────────────────

export async function postMenuSharedToCircle(input: {
  menuId: string
  menuName: string
  tenantId: string
  eventId?: string | null
  inquiryId?: string | null
}): Promise<void> {
  const circle = await getCircleForContext({
    eventId: input.eventId,
    inquiryId: input.inquiryId,
  })
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const supabase = createServerClient({ admin: true })
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: `Menu shared: ${input.menuName}. Take a look and let me know what you think!`,
    metadata: {
      system_event_type: 'menu_shared',
      menu_id: input.menuId,
    },
  })
}

// ─── Quote Sent ──────────────────────────────────────────────────────────────

export async function postQuoteSentToCircle(input: {
  quoteId: string
  totalCents: number
  perPersonCents?: number | null
  depositRequired: boolean
  depositCents?: number | null
  tenantId: string
  eventId?: string | null
  inquiryId?: string | null
}): Promise<void> {
  const circle = await getCircleForContext({
    eventId: input.eventId,
    inquiryId: input.inquiryId,
  })
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const total = (input.totalCents / 100).toFixed(2)
  let body = `I've sent over a quote for $${total}.`

  if (input.perPersonCents) {
    const pp = (input.perPersonCents / 100).toFixed(2)
    body += ` That's $${pp} per person.`
  }

  if (input.depositRequired && input.depositCents) {
    const dep = (input.depositCents / 100).toFixed(2)
    body += ` A $${dep} deposit secures the date.`
  }

  body += ' Check your email for the full details, or review it in your portal.'

  const supabase = createServerClient({ admin: true })
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body,
    metadata: {
      system_event_type: 'quote_sent',
      quote_id: input.quoteId,
      total_cents: input.totalCents,
    },
  })
}

// ─── Quote Accepted ──────────────────────────────────────────────────────────

export async function postQuoteAcceptedToCircle(input: {
  quoteId: string
  tenantId: string
  eventId?: string | null
  inquiryId?: string | null
}): Promise<void> {
  const circle = await getCircleForContext({
    eventId: input.eventId,
    inquiryId: input.inquiryId,
  })
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const supabase = createServerClient({ admin: true })
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: "Quote accepted! We're locked in. Next up: finalizing the menu and confirming all the details.",
    metadata: {
      system_event_type: 'quote_accepted',
      quote_id: input.quoteId,
    },
  })
}

// ─── Payment Received ────────────────────────────────────────────────────────

export async function postPaymentReceivedToCircle(input: {
  eventId: string
  tenantId: string
  amountCents: number
  paymentType: string
}): Promise<void> {
  const circle = await getCircleForEvent(input.eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const amount = (input.amountCents / 100).toFixed(2)
  const typeLabel = input.paymentType === 'deposit' ? 'Deposit' : 'Payment'

  const supabase = createServerClient({ admin: true })
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: `${typeLabel} of $${amount} received. Thank you!`,
    metadata: {
      system_event_type: 'payment_received',
      event_id: input.eventId,
      amount_cents: input.amountCents,
      payment_type: input.paymentType,
    },
  })
}

// ─── Event Confirmed ─────────────────────────────────────────────────────────

export async function postEventConfirmedToCircle(input: {
  eventId: string
  tenantId: string
  eventDate: string | null
}): Promise<void> {
  const circle = await getCircleForEvent(input.eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const datePart = input.eventDate ? ` for ${input.eventDate}` : ''

  const supabase = createServerClient({ admin: true })
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body: `Event confirmed${datePart}! Prep is underway. I'll share the full plan here soon.`,
    metadata: {
      system_event_type: 'event_confirmed',
      event_id: input.eventId,
    },
  })
}

// ─── Arrival Notification ────────────────────────────────────────────────────

export async function postArrivalToCircle(input: {
  eventId: string
  tenantId: string
  arrivalTime?: string | null
  message?: string | null
}): Promise<void> {
  const circle = await getCircleForEvent(input.eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  let body = input.message || "I'm on my way!"
  if (input.arrivalTime && !input.message) {
    body = `I'm on my way! Arriving at ${input.arrivalTime}.`
  }

  const supabase = createServerClient({ admin: true })
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body,
    metadata: {
      system_event_type: 'chef_arrival',
      event_id: input.eventId,
    },
  })
}

// ─── Event Completed (Immediate Thank-You) ───────────────────────────────────

export async function postEventCompletedToCircle(input: {
  eventId: string
  tenantId: string
  clientName?: string | null
  occasion?: string | null
}): Promise<void> {
  const circle = await getCircleForEvent(input.eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  // Load chef first name for a personal touch
  const supabase = createServerClient({ admin: true })
  const { data: chef } = await supabase
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', input.tenantId)
    .single()

  const chefFirst = (chef?.display_name || chef?.business_name || 'Chef').split(' ')[0]
  const clientFirst = input.clientName?.split(' ')[0] || ''

  let body = 'Thank you for a wonderful evening!'
  if (clientFirst) {
    body = `Thank you for a wonderful evening, ${clientFirst}!`
  }
  body += " I hope everyone enjoyed the meal. I'll share photos here soon."
  body += `\n\n${chefFirst}`

  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'text',
    body,
    metadata: {
      system_event_type: 'event_completed',
      event_id: input.eventId,
    },
  })
}

// ─── Photos Shared ───────────────────────────────────────────────────────────

export async function postPhotosToCircle(input: {
  eventId: string
  tenantId: string
  photoCount: number
}): Promise<void> {
  const circle = await getCircleForEvent(input.eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const noun = input.photoCount === 1 ? 'photo' : 'photos'
  const body = `${input.photoCount} ${noun} from your event are now available! Check your event page to see them.`

  const supabase = createServerClient({ admin: true })
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'system',
    body,
    metadata: {
      system_event_type: 'photos_shared',
      event_id: input.eventId,
      photo_count: input.photoCount,
    },
  })
}

// ─── Prep Update (Free-Form) ─────────────────────────────────────────────────

export async function postPrepUpdateToCircle(input: {
  eventId: string
  tenantId: string
  update: string
}): Promise<void> {
  const circle = await getCircleForEvent(input.eventId)
  if (!circle) return

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) return

  const supabase = createServerClient({ admin: true })
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'text',
    body: input.update,
    metadata: {
      system_event_type: 'prep_update',
      event_id: input.eventId,
    },
  })
}
