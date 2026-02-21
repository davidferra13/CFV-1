// Payment Plan Server Actions
// Calculates installment payment options for events.
// Uses existing tables: events, quotes

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// --- Types ---

export type Installment = {
  installmentNumber: number
  amountCents: number
  dueDateIso: string
  label: string
}

export type PaymentPlanOption = {
  planName: string
  numberOfPayments: number
  installments: Installment[]
  totalCents: number
}

export type EventPaymentPlan = {
  eventId: string
  eventName: string
  eventDate: string
  quotedPriceCents: number
  depositAmountCents: number
  plans: PaymentPlanOption[]
}

// --- Schemas ---

const EventIdSchema = z.string().uuid()
const CalculateInstallmentsSchema = z.object({
  totalCents: z.number().int().positive('Total must be positive'),
  numberOfPayments: z.number().int().min(2).max(12),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// --- Helpers ---

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days)
}

/**
 * Distribute cents evenly across N payments, handling remainder.
 * The last installment absorbs any rounding difference.
 */
function distributeCents(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count)
  const remainder = totalCents - base * count
  const amounts: number[] = []

  for (let i = 0; i < count; i++) {
    amounts.push(base + (i < remainder ? 1 : 0))
  }

  return amounts
}

// --- Actions ---

/**
 * Get payment plan options for an event.
 * Offers 2-pay (50/50), 3-pay (40/30/30), 4-pay (25 each).
 * Dates are calculated based on the event date, working backwards.
 */
export async function getPaymentPlan(eventId: string): Promise<EventPaymentPlan | null> {
  const user = await requireChef()
  const supabase = createServerClient()
  const validatedEventId = EventIdSchema.parse(eventId)

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, occasion, event_date, quoted_price_cents, deposit_amount_cents')
    .eq('id', validatedEventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    return null
  }

  const quotedPriceCents = event.quoted_price_cents ?? 0
  const depositAmountCents = event.deposit_amount_cents ?? 0
  const eventDate = event.event_date

  if (quotedPriceCents <= 0) {
    return {
      eventId: event.id,
      eventName: event.occasion || 'Untitled Event',
      eventDate,
      quotedPriceCents,
      depositAmountCents,
      plans: [],
    }
  }

  // Also check for any accepted quote
  const { data: quote } = await supabase
    .from('quotes')
    .select('total_quoted_cents')
    .eq('event_id', validatedEventId)
    .eq('tenant_id', user.tenantId!)
    .in('status', ['accepted', 'sent'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const totalCents = quote?.total_quoted_cents ?? quotedPriceCents

  const plans: PaymentPlanOption[] = [
    // 2-pay: 50/50
    generatePlan('2-Pay (50/50)', totalCents, 2, eventDate, [50, 50]),
    // 3-pay: 40/30/30
    generatePlan('3-Pay (40/30/30)', totalCents, 3, eventDate, [40, 30, 30]),
    // 4-pay: 25/25/25/25
    generatePlan('4-Pay (Equal)', totalCents, 4, eventDate, [25, 25, 25, 25]),
  ]

  return {
    eventId: event.id,
    eventName: event.occasion || 'Untitled Event',
    eventDate,
    quotedPriceCents: totalCents,
    depositAmountCents,
    plans,
  }
}

function generatePlan(
  planName: string,
  totalCents: number,
  count: number,
  eventDate: string,
  percentages: number[]
): PaymentPlanOption {
  const installments: Installment[] = []

  // Calculate amounts based on percentages
  let remainingCents = totalCents
  const amounts: number[] = []

  for (let i = 0; i < percentages.length; i++) {
    if (i === percentages.length - 1) {
      // Last payment gets the remainder to avoid rounding issues
      amounts.push(remainingCents)
    } else {
      const amount = Math.round(totalCents * percentages[i] / 100)
      amounts.push(amount)
      remainingCents -= amount
    }
  }

  // Calculate due dates: spread evenly before the event date
  // First payment is due at booking, last is due before event
  for (let i = 0; i < count; i++) {
    let dueDateIso: string
    let label: string

    if (i === 0) {
      // First payment: due at booking (today or upon acceptance)
      dueDateIso = new Date().toISOString().split('T')[0]
      label = `Payment ${i + 1} — Due at booking`
    } else if (i === count - 1) {
      // Final payment: due 7 days before event
      dueDateIso = subtractDays(eventDate, 7)
      label = `Final payment — Due 7 days before event`
    } else {
      // Middle payments: evenly spaced between now and 7 days before
      const today = new Date().toISOString().split('T')[0]
      const finalDue = subtractDays(eventDate, 7)
      const totalDays = Math.max(
        1,
        (new Date(finalDue).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      )
      const intervalDays = Math.round((totalDays / (count - 1)) * i)
      dueDateIso = addDays(today, intervalDays)
      label = `Payment ${i + 1}`
    }

    installments.push({
      installmentNumber: i + 1,
      amountCents: amounts[i],
      dueDateIso,
      label,
    })
  }

  return {
    planName,
    numberOfPayments: count,
    installments,
    totalCents,
  }
}

/**
 * Pure calculation of installment amounts and due dates.
 * Does not require an event — can be used for custom scenarios.
 */
export async function calculateInstallments(
  totalCents: number,
  numberOfPayments: number,
  eventDate: string
): Promise<Installment[]> {
  await requireChef()

  const validated = CalculateInstallmentsSchema.parse({
    totalCents,
    numberOfPayments,
    eventDate,
  })

  const amounts = distributeCents(validated.totalCents, validated.numberOfPayments)
  const installments: Installment[] = []
  const today = new Date().toISOString().split('T')[0]
  const finalDue = subtractDays(validated.eventDate, 7)

  for (let i = 0; i < validated.numberOfPayments; i++) {
    let dueDateIso: string

    if (i === 0) {
      dueDateIso = today
    } else if (i === validated.numberOfPayments - 1) {
      dueDateIso = finalDue
    } else {
      const totalDays = Math.max(
        1,
        (new Date(finalDue).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
      )
      const intervalDays = Math.round((totalDays / (validated.numberOfPayments - 1)) * i)
      dueDateIso = addDays(today, intervalDays)
    }

    installments.push({
      installmentNumber: i + 1,
      amountCents: amounts[i],
      dueDateIso,
      label: i === 0
        ? 'Due at booking'
        : i === validated.numberOfPayments - 1
          ? 'Final payment'
          : `Payment ${i + 1}`,
    })
  }

  return installments
}
