// Pre-Event Confidence Cadence Scheduler
// Schedules milestone emails between deposit confirmation and event day.
// Pure date math, no AI dependency. Deterministic scheduling.

'use server'

import { createServerClient } from '@/lib/db/server'
import { createClientPortalLinkForClient } from '@/lib/client-portal/actions'
import { getChefTonePreset } from '@/lib/email/brand-voice'
import { sendSms } from '@/lib/sms/send'
import { notifyCIL } from '@/lib/cil/notify'
import { fetchForecast, type DailyForecast } from '@/lib/weather/open-meteo'
import { CADENCE_POINTS, SMS_CADENCE_POINTS, SMS_CADENCE_TEMPLATES } from './cadence-types'
import type { CadencePoint, CadenceItem, CadencePointConfig } from './cadence-types'

export type { CadencePoint, CadenceItem, CadencePointConfig }

// Cadence points close enough to event day to include weather context
const WEATHER_ELIGIBLE_POINTS: CadencePoint[] = ['3_days_before', '48_hours_before']

/**
 * Format a DailyForecast into a client-friendly one-liner for email.
 * Example: "Beautiful evening expected, 74F"
 */
function formatWeatherLineEmail(forecast: DailyForecast): string {
  const temp = forecast.tempHighF
  const condition = forecast.condition
  const wind = forecast.windSpeedMph

  // Client-friendly phrasing based on conditions
  if (condition === 'Clear' || condition === 'Partly Cloudy') {
    return `Beautiful evening expected, ${temp}F`
  }
  if (condition === 'Overcast') {
    return `Mild and overcast, ${temp}F`
  }
  if (wind > 20) {
    return `${temp}F, ${condition.toLowerCase()}, breezy`
  }
  if (condition === 'Rain' || condition === 'Rain Showers' || condition === 'Drizzle') {
    return `${temp}F with rain expected`
  }
  if (condition === 'Snow' || condition === 'Snow Showers') {
    return `${temp}F with snow expected`
  }
  if (condition === 'Thunderstorm') {
    return `${temp}F, storms possible`
  }
  // Generic fallback
  const windNote = wind > 12 ? ', light wind' : ''
  return `Forecast: ${temp}F, ${condition}${windNote}`
}

/**
 * Format a DailyForecast into a short SMS-safe string (under 50 chars).
 * Example: "74F Clear"
 */
function formatWeatherLineSMS(forecast: DailyForecast): string {
  return `${forecast.tempHighF}F ${forecast.condition}`
}

/**
 * Fetch weather for a cadence event. Returns null on any failure.
 * Does NOT require auth context (uses raw DB + open-meteo directly).
 */
async function getWeatherForCadenceEvent(
  tenantId: string,
  eventId: string
): Promise<DailyForecast | null> {
  try {
    const db = createServerClient()
    const { data: event } = await db
      .from('events')
      .select('event_date, location_lat, location_lng')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event) return null
    if (event.location_lat == null || event.location_lng == null) return null

    const result = await fetchForecast(event.location_lat, event.location_lng)
    if (!result.forecasts.length) return null

    // Find the day matching the event date
    const dateStr =
      typeof event.event_date === 'string'
        ? event.event_date.slice(0, 10)
        : new Date(event.event_date).toISOString().slice(0, 10)

    return result.forecasts.find((f) => f.date === dateStr) || null
  } catch {
    return null
  }
}

const SMS_OVERLAY_POINTS: CadencePoint[] = ['deposit_confirmed', '7_days_before']

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

  // --- Email cadence items (existing 7 points) ---
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
      channel: 'email',
      scheduled_at: scheduledAt.toISOString(),
      sent_at: null,
      skipped_at: null,
      skip_reason: null,
    })
  }

  // --- SMS cadence items ---
  // SMS overlays on existing email points (deposit_confirmed, 7_days_before)
  for (const point of SMS_OVERLAY_POINTS) {
    const config = CADENCE_POINTS.find((c) => c.point === point)
    if (!config) continue

    let scheduledAt: Date

    if (config.daysBefore === -1) {
      // deposit_confirmed SMS: 1 hour after email
      scheduledAt = new Date(now.getTime() + 60 * 60 * 1000)
    } else {
      // SMS sends at 10am (email is 9am)
      scheduledAt = new Date(eventDt)
      scheduledAt.setDate(scheduledAt.getDate() - config.daysBefore)
      scheduledAt.setHours(10, 0, 0, 0)
    }

    if (config.daysBefore !== -1 && scheduledAt <= now) {
      skipped++
      continue
    }

    items.push({
      event_id: eventId,
      tenant_id: tenantId,
      cadence_point: point,
      channel: 'sms',
      scheduled_at: scheduledAt.toISOString(),
      sent_at: null,
      skipped_at: null,
      skip_reason: null,
    })
  }

  // SMS-only points (48_hours_before, post_event)
  for (const config of SMS_CADENCE_POINTS) {
    let scheduledAt: Date

    if (config.daysBefore === -2) {
      // post_event: 1 day after event at 10am
      scheduledAt = new Date(eventDt)
      scheduledAt.setDate(scheduledAt.getDate() + 1)
      scheduledAt.setHours(10, 0, 0, 0)
    } else {
      // 48_hours_before: 2 days before at 10am
      scheduledAt = new Date(eventDt)
      scheduledAt.setDate(scheduledAt.getDate() - config.daysBefore)
      scheduledAt.setHours(10, 0, 0, 0)
    }

    // Skip if already passed (except post_event which is after the event)
    if (config.daysBefore !== -2 && scheduledAt <= now) {
      skipped++
      continue
    }
    // For post_event, skip if it's already passed
    if (config.daysBefore === -2 && scheduledAt <= now) {
      skipped++
      continue
    }

    items.push({
      event_id: eventId,
      tenant_id: tenantId,
      cadence_point: config.point,
      channel: 'sms',
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
        await emitCadenceCIL(item, 'skipped', 'Chef disabled this cadence point')
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
        await emitCadenceCIL(item, 'skipped', reason)
        skipped++
        continue
      }

      // Fork by channel (null/undefined = legacy email rows)
      const channel = item.channel || 'email'
      if (channel === 'sms') {
        await sendCadenceSMS(item.tenant_id, item.event_id, item.cadence_point)
      } else {
        await sendCadenceEmail(item.tenant_id, item.event_id, item.cadence_point)
      }
      await db
        .from('cadence_schedule')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', item.id)
      await emitCadenceCIL(item, 'sent', null)
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

  // Build portal URL via canonical token system
  let portalUrl: string | undefined
  if (event.client_id) {
    try {
      const link = await createClientPortalLinkForClient({
        clientId: event.client_id,
        tenantId,
        db,
      })
      portalUrl = link.url
    } catch {
      // Non-fatal: email sends without portal link
    }
  }

  // Interpolate message variables
  const occasion = event.occasion || event.title || 'dinner'
  const guestCount = event.guest_count || event.confirmed_guest_count || null
  const location = event.location || event.confirmed_location || null
  const arrivalTime = event.arrival_time || event.serve_time || null
  const menuStatus = event.menu_locked ? 'finalized' : 'in progress'

  // Resolve chef's brand voice tone for template rendering
  const tone = await getChefTonePreset(tenantId)

  // Fetch weather for close-to-event touchpoints
  let weatherLine = ''
  if (WEATHER_ELIGIBLE_POINTS.includes(cadencePoint)) {
    try {
      const forecast = await getWeatherForCadenceEvent(tenantId, eventId)
      if (forecast) {
        weatherLine = formatWeatherLineEmail(forecast)
      }
    } catch {
      // Non-fatal: weather is optional context
    }
  }

  const messageTemplate = customMessage || config.defaultMessage
  const message = messageTemplate
    .replace(/{chefName}/g, chefName)
    .replace(/{occasion}/g, occasion)
    .replace(/{guestCount}/g, guestCount ? String(guestCount) : 'TBD')
    .replace(/{menuStatus}/g, menuStatus)
    .replace(/{location}/g, location || 'your location')
    .replace(/{arrivalTime}/g, arrivalTime || 'TBD')
    .replace(/{prepDate}/g, arrivalTime || 'soon')
    .replace(/{weatherLine}/g, weatherLine)

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cadencePoint: cadencePoint as any,
      eventDate: event.event_date || event.serve_time || '',
      guestCount,
      location,
      arrivalTime,
      portalUrl,
      tone,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com',
    }),
  })
}

/**
 * Send a cadence SMS for a specific event and cadence point.
 * Skips silently if client has no phone number.
 */
async function sendCadenceSMS(
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

  // Load client phone
  let clientPhone: string | null = null

  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('phone')
      .eq('id', event.client_id)
      .single()
    if (client?.phone) {
      clientPhone = client.phone
    }
  }

  if (!clientPhone) {
    // No phone number; mark as skipped upstream would be ideal,
    // but we throw a specific error the caller can catch for logging
    console.warn(`[cadence-sms] No phone for event ${eventId}, skipping`)
    return
  }

  // Get SMS template
  const template = SMS_CADENCE_TEMPLATES[cadencePoint]
  if (!template) return

  // Build portal URL
  let portalUrl = ''
  if (event.client_id) {
    try {
      const link = await createClientPortalLinkForClient({
        clientId: event.client_id,
        tenantId,
        db,
      })
      portalUrl = link.url
    } catch {
      // Non-fatal
    }
  }

  // Interpolate variables
  const occasion = event.occasion || event.title || 'dinner'
  const arrivalTime = event.arrival_time || event.serve_time || 'TBD'
  const eventDate = event.event_date || event.serve_time || ''

  // Fetch weather for close-to-event SMS touchpoints
  let weatherLine = ''
  if (WEATHER_ELIGIBLE_POINTS.includes(cadencePoint)) {
    try {
      const forecast = await getWeatherForCadenceEvent(tenantId, eventId)
      if (forecast) {
        weatherLine = formatWeatherLineSMS(forecast)
      }
    } catch {
      // Non-fatal: weather is optional context
    }
  }

  let message = template
    .replace(/{chefName}/g, chefName)
    .replace(/{occasion}/g, occasion)
    .replace(/{arrivalTime}/g, arrivalTime)
    .replace(/{eventDate}/g, eventDate)
    .replace(/{portalUrl}/g, portalUrl)
    .replace(/{weatherLine}/g, weatherLine)

  // Enforce 160-char SMS limit
  if (message.length > 160) {
    message = message.slice(0, 157) + '...'
  }

  await sendSms(clientPhone, message)
}

async function emitCadenceCIL(
  item: { tenant_id: string; event_id: string; cadence_point: string; channel?: string },
  action: 'sent' | 'skipped',
  skipReason: string | null
): Promise<void> {
  try {
    const db = createServerClient()
    const { data: event } = await db
      .from('events')
      .select('client_id, occasion')
      .eq('id', item.event_id)
      .eq('tenant_id', item.tenant_id)
      .single()

    const clientId = event?.client_id
    const entityIds: string[] = [`event_${item.event_id}`]
    if (clientId) entityIds.push(`client_${clientId}`)

    await notifyCIL({
      tenantId: item.tenant_id,
      source: 'cadence',
      entityIds,
      payload: {
        action,
        cadence_point: item.cadence_point,
        channel: item.channel || 'email',
        skip_reason: skipReason,
        occasion: event?.occasion || null,
        client_name: null,
      },
    })
  } catch {
    // Non-fatal: CIL observation must never block cadence delivery
  }
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
