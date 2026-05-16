// Pre-Event Confidence Cadence Scheduler
// Schedules milestone emails between deposit confirmation and event day.
// Pure date math, no AI dependency. Deterministic scheduling.

'use server'

import { createServerClient } from '@/lib/db/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CadencePoint =
  | 'deposit_confirmed'
  | '30_days_before'
  | '14_days_before'
  | '7_days_before'
  | '3_days_before'
  | '1_day_before'
  | 'event_day'

export interface CadenceItem {
  id?: string
  event_id: string
  tenant_id: string
  cadence_point: CadencePoint
  scheduled_at: string
  sent_at: string | null
  skipped_at: string | null
  skip_reason: string | null
}

export interface CadencePointConfig {
  point: CadencePoint
  daysBefore: number
  label: string
  subject: string
  defaultMessage: string
}

// ---------------------------------------------------------------------------
// Cadence Definitions (ordered by timeline)
// ---------------------------------------------------------------------------

export const CADENCE_POINTS: CadencePointConfig[] = [
  {
    point: 'deposit_confirmed',
    daysBefore: -1, // fires immediately on deposit
    label: 'Booking Confirmation',
    subject: "You're booked!",
    defaultMessage:
      "You're booked! Here's your event portal link. Your chef will begin planning closer to the date.",
  },
  {
    point: '30_days_before',
    daysBefore: 30,
    label: '30 Days Out',
    subject: 'Your event is 30 days away',
    defaultMessage:
      'Your event is 30 days away. {chefName} is beginning menu preparation. Any dietary updates? Reply here or update in your portal.',
  },
  {
    point: '14_days_before',
    daysBefore: 14,
    label: '14 Days Out',
    subject: 'Two weeks until your event',
    defaultMessage:
      'Two weeks out. Your menu is {menuStatus}. Guest count: {guestCount}. Anything to update?',
  },
  {
    point: '7_days_before',
    daysBefore: 7,
    label: '7 Days Out',
    subject: 'One week to go',
    defaultMessage:
      'One week to go. {chefName} is sourcing ingredients this week. Here is your final menu.',
  },
  {
    point: '3_days_before',
    daysBefore: 3,
    label: '3 Days Out',
    subject: 'Almost here!',
    defaultMessage:
      'Almost here! {chefName} begins prep on {prepDate}. Arrival time: {arrivalTime}. Any last questions?',
  },
  {
    point: '1_day_before',
    daysBefore: 1,
    label: '1 Day Before',
    subject: "Tomorrow's the day",
    defaultMessage:
      "Tomorrow's the day. {chefName} arrives at {arrivalTime} at {location}. Everything is set.",
  },
  {
    point: 'event_day',
    daysBefore: 0,
    label: 'Event Day',
    subject: 'Today is the day!',
    defaultMessage: 'Today! {chefName} is preparing for your {occasion}. Enjoy your evening.',
  },
]

// ---------------------------------------------------------------------------
// Schedule Creation
// ---------------------------------------------------------------------------

/**
 * Create the full cadence schedule for an event after deposit confirmation.
 * Skips cadence points that have already passed (for events booked < 30 days out).
 */
export async function createCadenceSchedule(
  tenantId: string,
  eventId: string,
  eventDate: string | Date
): Promise<{ created: number; skipped: number }> {
  const db = createServerClient()
  const eventDt = new Date(eventDate)
  const now = new Date()

  // Check if schedule already exists
  const { data: existing } = await db
    .from('cadence_schedule')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (existing && existing.length > 0) {
    return { created: 0, skipped: 0 }
  }

  const items: Omit<CadenceItem, 'id'>[] = []
  let skipped = 0

  for (const config of CADENCE_POINTS) {
    let scheduledAt: Date

    if (config.daysBefore === -1) {
      // Immediate (deposit confirmation)
      scheduledAt = now
    } else {
      // Schedule relative to event date, send at 9am
      scheduledAt = new Date(eventDt)
      scheduledAt.setDate(scheduledAt.getDate() - config.daysBefore)
      scheduledAt.setHours(9, 0, 0, 0)
    }

    // Skip cadence points that have already passed (except deposit_confirmed which fires now)
    if (config.daysBefore !== -1 && scheduledAt <= now) {
      skipped++
      continue
    }

    items.push({
      event_id: eventId,
      tenant_id: tenantId,
      cadence_point: config.point,
      scheduled_at: scheduledAt.toISOString(),
      sent_at: null,
      skipped_at: null,
      skip_reason: null,
    })
  }

  if (items.length > 0) {
    await db.from('cadence_schedule').insert(items)
  }

  return { created: items.length, skipped }
}

// ---------------------------------------------------------------------------
// Smart Skip Logic
// ---------------------------------------------------------------------------

/**
 * Check if the chef has manually communicated with the client within the
 * cadence window (defined as within the last 3 days before the cadence fires).
 * If so, skip the automated message.
 */
export async function shouldSkipCadencePoint(
  tenantId: string,
  eventId: string,
  cadencePoint: CadencePoint
): Promise<{ skip: boolean; reason: string | null }> {
  const db = createServerClient()

  // Get the event's client
  const { data: event } = await db
    .from('events')
    .select('client_id, inquiry_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) {
    return { skip: false, reason: null }
  }

  // Check communication_events for outbound chef messages in last 3 days
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const { data: recentComms } = await db
    .from('communication_events')
    .select('id, event_timestamp')
    .eq('tenant_id', tenantId)
    .eq('direction', 'outbound')
    .gte('event_timestamp', threeDaysAgo.toISOString())
    .limit(1)

  if (recentComms && recentComms.length > 0) {
    return {
      skip: true,
      reason: `Chef communicated manually within cadence window (${recentComms[0].event_timestamp})`,
    }
  }

  return { skip: false, reason: null }
}

// ---------------------------------------------------------------------------
// Process Due Cadence Items
// ---------------------------------------------------------------------------

/**
 * Find and process all cadence items that are due for sending.
 * Called by cron/ticker. Returns count of sent and skipped items.
 */
export async function processDueCadenceItems(): Promise<{
  sent: number
  skipped: number
  errors: number
}> {
  const db = createServerClient()
  const now = new Date().toISOString()

  // Find items that are due and have not been sent or skipped
  const { data: dueItems } = await db
    .from('cadence_schedule')
    .select('*')
    .lte('scheduled_at', now)
    .is('sent_at', null)
    .is('skipped_at', null)
    .limit(50)

  if (!dueItems || dueItems.length === 0) {
    return { sent: 0, skipped: 0, errors: 0 }
  }

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const item of dueItems) {
    try {
      // Check if chef has cadence point disabled
      const isDisabled = await isCadencePointDisabled(item.tenant_id, item.cadence_point)
      if (isDisabled) {
        await markSkipped(item.id, 'Chef disabled this cadence point')
        skipped++
        continue
      }

      // Smart skip: check for recent manual communication
      const { skip, reason } = await shouldSkipCadencePoint(
        item.tenant_id,
        item.event_id,
        item.cadence_point
      )

      if (skip) {
        await markSkipped(item.id, reason)
        skipped++
        continue
      }

      // Send the cadence email
      await sendCadenceEmail(item.tenant_id, item.event_id, item.cadence_point)
      await db
        .from('cadence_schedule')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', item.id)
      sent++
    } catch (err) {
      console.error('[cadence-scheduler] Error processing item:', item.id, err)
      errors++
    }
  }

  return { sent, skipped, errors }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function markSkipped(itemId: string, reason: string | null): Promise<void> {
  const db = createServerClient()
  await db
    .from('cadence_schedule')
    .update({ skipped_at: new Date().toISOString(), skip_reason: reason })
    .eq('id', itemId)
}

async function isCadencePointDisabled(
  tenantId: string,
  cadencePoint: CadencePoint
): Promise<boolean> {
  const db = createServerClient()
  const { data } = await db
    .from('cadence_chef_settings')
    .select('disabled_points')
    .eq('chef_id', tenantId)
    .single()

  if (!data?.disabled_points) return false
  const disabled: string[] = Array.isArray(data.disabled_points) ? data.disabled_points : []
  return disabled.includes(cadencePoint)
}

/**
 * Send a cadence email for a specific event and cadence point.
 */
async function sendCadenceEmail(
  tenantId: string,
  eventId: string,
  cadencePoint: CadencePoint
): Promise<void> {
  const db = createServerClient()

  // Load event data
  const { data: event } = await db
    .from('events')
    .select('*, client_id, inquiry_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return

  // Load chef info
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', tenantId)
    .single()

  const chefName = chef?.display_name || chef?.business_name || 'Your chef'

  // Load client email
  let clientEmail: string | null = null
  let clientName = 'there'

  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name, email')
      .eq('id', event.client_id)
      .single()
    if (client) {
      clientEmail = client.email
      clientName = client.full_name || 'there'
    }
  }

  // Fallback to inquiry contact
  if (!clientEmail && event.inquiry_id) {
    const { data: inquiry } = await db
      .from('inquiries')
      .select('contact_name, contact_email')
      .eq('id', event.inquiry_id)
      .eq('tenant_id', tenantId)
      .single()
    if (inquiry) {
      clientEmail = inquiry.contact_email
      clientName = inquiry.contact_name || clientName
    }
  }

  if (!clientEmail) return

  // Get cadence config
  const config = CADENCE_POINTS.find((c) => c.point === cadencePoint)
  if (!config) return

  // Get chef custom message override (if any)
  const customMessage = await getChefCadenceMessage(tenantId, cadencePoint)

  // Build portal URL
  let portalUrl: string | undefined
  if (event.inquiry_id) {
    const { data: group } = await db
      .from('hub_groups')
      .select('group_token')
      .eq('inquiry_id', event.inquiry_id)
      .eq('tenant_id', tenantId)
      .limit(1)
      .single()
    if (group) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
      portalUrl = `${appUrl}/client/${group.group_token}`
    }
  }

  // Interpolate message variables
  const occasion = event.occasion || event.title || 'dinner'
  const guestCount = event.guest_count || event.confirmed_guest_count || null
  const location = event.location || event.confirmed_location || null
  const arrivalTime = event.arrival_time || event.serve_time || null
  const menuStatus = event.menu_locked ? 'finalized' : 'in progress'

  const messageTemplate = customMessage || config.defaultMessage
  const message = messageTemplate
    .replace(/{chefName}/g, chefName)
    .replace(/{occasion}/g, occasion)
    .replace(/{guestCount}/g, guestCount ? String(guestCount) : 'TBD')
    .replace(/{menuStatus}/g, menuStatus)
    .replace(/{location}/g, location || 'your location')
    .replace(/{arrivalTime}/g, arrivalTime || 'TBD')
    .replace(/{prepDate}/g, arrivalTime || 'soon')

  // Send via email system
  const { sendEmail } = await import('@/lib/email/send')
  const { ConfidenceCadenceEmail } = await import('@/lib/email/templates/confidence-cadence')

  const React = await import('react')

  await sendEmail({
    to: clientEmail,
    subject: config.subject,
    react: React.createElement(ConfidenceCadenceEmail, {
      clientName,
      chefName,
      message,
      occasion,
      cadencePoint,
      eventDate: event.event_date || event.serve_time || '',
      guestCount,
      location,
      arrivalTime,
      portalUrl,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com',
    }),
  })
}

async function getChefCadenceMessage(
  tenantId: string,
  cadencePoint: CadencePoint
): Promise<string | null> {
  const db = createServerClient()
  const { data } = await db
    .from('cadence_chef_settings')
    .select('custom_messages')
    .eq('chef_id', tenantId)
    .single()

  if (!data?.custom_messages) return null
  const messages: Record<string, string> = data.custom_messages as Record<string, string>
  return messages[cadencePoint] || null
}

// ---------------------------------------------------------------------------
// Cancel Cadence (for event cancellations)
// ---------------------------------------------------------------------------

/**
 * Cancel all pending cadence items for an event.
 */
export async function cancelCadenceSchedule(tenantId: string, eventId: string): Promise<number> {
  const db = createServerClient()
  const { data } = await db
    .from('cadence_schedule')
    .update({
      skipped_at: new Date().toISOString(),
      skip_reason: 'Event cancelled',
    })
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .is('sent_at', null)
    .is('skipped_at', null)
    .select('id')

  return data?.length || 0
}
