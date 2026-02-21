'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type SequenceStep = {
  id: string
  sequenceId: string
  stepKey: string
  delayDays: number
  subject: string | null
  body: string | null
  sortOrder: number
  createdAt: string
}

export type AutomatedSequence = {
  id: string
  chefId: string
  name: string
  sequenceType: string
  eventId: string | null
  clientId: string | null
  isActive: boolean
  createdAt: string
  steps: SequenceStep[]
}

// ─── Schemas ─────────────────────────────────────────────────────

const BuildPostBookingSchema = z.object({
  eventId: z.string().uuid(),
})

const BuildReEngagementSchema = z.object({
  clientId: z.string().uuid(),
})

const BuildBirthdaySchema = z.object({
  clientId: z.string().uuid(),
  birthdayDate: z.string().min(1, 'Birthday date is required'),
})

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Build a post-booking sequence for an event with three steps:
 *   - Thank-you (day 0)
 *   - Menu review request (day 3)
 *   - Final details reminder (day -7 from event date, stored as relative days)
 */
export async function buildPostBookingSequence(
  eventId: string
): Promise<AutomatedSequence> {
  const user = await requireChef()
  BuildPostBookingSchema.parse({ eventId })
  const supabase = createServerClient()

  // Fetch the event to get event_date for the final-details step
  const { data: event, error: eventError } = await (supabase as any)
    .from('events')
    .select('id, event_date, client_id')
    .eq('id', eventId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error(`Event not found or access denied: ${eventError?.message || 'Not found'}`)
  }

  // Calculate day -7 relative to event date from today
  const today = new Date()
  const eventDate = new Date(event.event_date)
  const daysUntilEvent = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const finalDetailsDelay = Math.max(0, daysUntilEvent - 7)

  // Insert the sequence
  const { data: sequence, error: seqError } = await (supabase as any)
    .from('automated_sequences')
    .insert({
      chef_id: user.tenantId!,
      name: `Post-Booking: Event ${eventId.slice(0, 8)}`,
      sequence_type: 'post_booking',
      event_id: eventId,
      client_id: event.client_id || null,
      is_active: true,
    })
    .select()
    .single()

  if (seqError) throw new Error(`Failed to create sequence: ${seqError.message}`)

  // Insert steps
  const stepRows = [
    {
      sequence_id: sequence.id,
      step_key: 'thank_you',
      delay_days: 0,
      subject: 'Thank you for your booking!',
      body: 'We are excited to cater your upcoming event. Please don\'t hesitate to reach out with any questions.',
      sort_order: 1,
    },
    {
      sequence_id: sequence.id,
      step_key: 'menu_review',
      delay_days: 3,
      subject: 'Let\'s review your menu',
      body: 'It\'s a great time to review and finalize the menu for your event. Let us know if you\'d like to make any adjustments.',
      sort_order: 2,
    },
    {
      sequence_id: sequence.id,
      step_key: 'final_details',
      delay_days: finalDetailsDelay,
      subject: 'Final details for your event',
      body: 'Your event is one week away! Let\'s confirm the final headcount, any dietary restrictions, and logistics.',
      sort_order: 3,
    },
  ]

  const { data: steps, error: stepsError } = await (supabase as any)
    .from('sequence_steps')
    .insert(stepRows)
    .select()

  if (stepsError) throw new Error(`Failed to create sequence steps: ${stepsError.message}`)

  revalidatePath(`/events/${eventId}`)

  return mapSequence(sequence, steps || [])
}

/**
 * Build a re-engagement sequence for dormant clients:
 *   - Check-in (day 0)
 *   - Special offer (day 7)
 *   - Follow-up (day 21)
 */
export async function buildReEngagementSequence(
  clientId: string
): Promise<AutomatedSequence> {
  const user = await requireChef()
  BuildReEngagementSchema.parse({ clientId })
  const supabase = createServerClient()

  // Verify the client belongs to this chef
  const { data: client, error: clientError } = await (supabase as any)
    .from('clients')
    .select('id, first_name, last_name')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientError || !client) {
    throw new Error(`Client not found or access denied: ${clientError?.message || 'Not found'}`)
  }

  const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'there'

  // Insert the sequence
  const { data: sequence, error: seqError } = await (supabase as any)
    .from('automated_sequences')
    .insert({
      chef_id: user.tenantId!,
      name: `Re-Engagement: ${clientName}`,
      sequence_type: 're_engagement',
      event_id: null,
      client_id: clientId,
      is_active: true,
    })
    .select()
    .single()

  if (seqError) throw new Error(`Failed to create re-engagement sequence: ${seqError.message}`)

  // Insert steps
  const stepRows = [
    {
      sequence_id: sequence.id,
      step_key: 'check_in',
      delay_days: 0,
      subject: `Hi ${clientName}, we miss cooking for you!`,
      body: 'It\'s been a while since your last event with us. We\'d love to hear what you\'ve been up to and see if we can help with any upcoming occasions.',
      sort_order: 1,
    },
    {
      sequence_id: sequence.id,
      step_key: 'special_offer',
      delay_days: 7,
      subject: 'A special offer just for you',
      body: 'As a valued client, we\'d like to offer you something special for your next event. Get in touch and we\'ll make it memorable.',
      sort_order: 2,
    },
    {
      sequence_id: sequence.id,
      step_key: 'follow_up',
      delay_days: 21,
      subject: 'Still thinking about your next event?',
      body: 'We wanted to follow up one more time. Whether it\'s an intimate dinner or a large gathering, we\'re here when you\'re ready.',
      sort_order: 3,
    },
  ]

  const { data: steps, error: stepsError } = await (supabase as any)
    .from('sequence_steps')
    .insert(stepRows)
    .select()

  if (stepsError) throw new Error(`Failed to create sequence steps: ${stepsError.message}`)

  revalidatePath(`/clients/${clientId}`)

  return mapSequence(sequence, steps || [])
}

/**
 * Build a birthday sequence for a client:
 *   - Birthday wish (on the birthday date, day 0)
 *   - Special dinner offer (day 7 after birthday)
 */
export async function buildBirthdaySequence(
  clientId: string,
  birthdayDate: string
): Promise<AutomatedSequence> {
  const user = await requireChef()
  BuildBirthdaySchema.parse({ clientId, birthdayDate })
  const supabase = createServerClient()

  // Verify the client belongs to this chef
  const { data: client, error: clientError } = await (supabase as any)
    .from('clients')
    .select('id, first_name, last_name')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (clientError || !client) {
    throw new Error(`Client not found or access denied: ${clientError?.message || 'Not found'}`)
  }

  const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'there'

  // Calculate delay_days from today to birthday
  const today = new Date()
  const birthday = new Date(birthdayDate)
  const daysUntilBirthday = Math.max(
    0,
    Math.floor((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  )

  // Insert the sequence
  const { data: sequence, error: seqError } = await (supabase as any)
    .from('automated_sequences')
    .insert({
      chef_id: user.tenantId!,
      name: `Birthday: ${clientName}`,
      sequence_type: 'birthday',
      event_id: null,
      client_id: clientId,
      is_active: true,
    })
    .select()
    .single()

  if (seqError) throw new Error(`Failed to create birthday sequence: ${seqError.message}`)

  // Insert steps
  const stepRows = [
    {
      sequence_id: sequence.id,
      step_key: 'birthday_wish',
      delay_days: daysUntilBirthday,
      subject: `Happy Birthday, ${clientName}!`,
      body: 'Wishing you a wonderful birthday! We hope your day is filled with great food and great company.',
      sort_order: 1,
    },
    {
      sequence_id: sequence.id,
      step_key: 'special_dinner',
      delay_days: daysUntilBirthday + 7,
      subject: 'Celebrate with a special birthday dinner',
      body: 'Your birthday week is the perfect time for a special dinner. Let us create a memorable evening for you and your loved ones.',
      sort_order: 2,
    },
  ]

  const { data: steps, error: stepsError } = await (supabase as any)
    .from('sequence_steps')
    .insert(stepRows)
    .select()

  if (stepsError) throw new Error(`Failed to create sequence steps: ${stepsError.message}`)

  revalidatePath(`/clients/${clientId}`)

  return mapSequence(sequence, steps || [])
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapSequence(row: any, stepRows: any[]): AutomatedSequence {
  return {
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    sequenceType: row.sequence_type,
    eventId: row.event_id,
    clientId: row.client_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    steps: stepRows.map(mapStep),
  }
}

function mapStep(row: any): SequenceStep {
  return {
    id: row.id,
    sequenceId: row.sequence_id,
    stepKey: row.step_key,
    delayDays: row.delay_days,
    subject: row.subject,
    body: row.body,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}
