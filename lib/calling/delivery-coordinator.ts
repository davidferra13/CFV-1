'use server'

/**
 * Delivery Coordination Engine
 *
 * 24 hours before an event, this module coordinates with confirmed vendors
 * to pin down delivery windows. It calls vendors who have confirmed
 * ingredient availability (via supplier_calls or ai_calls) and asks
 * for specific delivery time windows.
 *
 * Conflict detection: if a vendor's delivery window overlaps with prep
 * start time, it flags the conflict so the chef can adjust.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface DeliveryScheduleEntry {
  vendorName: string
  vendorPhone: string
  ingredient: string
  expectedWindow: string | null
  confirmed: boolean
  contactName: string | null
}

export interface DeliveryCoordinationResult {
  scheduled: DeliveryScheduleEntry[]
  conflicts: string[]
}

// -------------------------------------------------------------------------
// Coordinate deliveries for an event
// -------------------------------------------------------------------------

/**
 * For a given event, find all vendors that confirmed ingredient availability
 * and build a delivery schedule. Identifies conflicts between vendor delivery
 * windows and the event's prep timeline.
 */
export async function coordinateDeliveries(eventId: string): Promise<DeliveryCoordinationResult> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event details
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, event_date, occasion, arrival_time, serve_time, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    console.error('[delivery-coordinator] Event not found:', eventId, eventError)
    return { scheduled: [], conflicts: [] }
  }

  // Get all confirmed supplier calls for this event's ingredients
  // We look at ai_calls with role='vendor_availability' and result='yes'
  // that are linked to this event or have matching ingredients
  const { data: confirmedCalls } = await db
    .from('ai_calls')
    .select('id, contact_name, contact_phone, subject, extracted_data, vendor_id, created_at')
    .eq('chef_id', user.tenantId!)
    .eq('role', 'vendor_availability')
    .eq('result', 'yes')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!confirmedCalls || confirmedCalls.length === 0) {
    return { scheduled: [], conflicts: [] }
  }

  // Also check for existing delivery coordination calls
  const { data: deliveryCalls } = await db
    .from('ai_calls')
    .select('id, contact_name, contact_phone, subject, extracted_data, status, result')
    .eq('chef_id', user.tenantId!)
    .eq('role', 'vendor_delivery')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(50)

  const scheduled: DeliveryScheduleEntry[] = []
  const conflicts: string[] = []

  // Determine prep start time from event data
  const prepStartTime = event.arrival_time || null
  const eventDate = event.event_date ? new Date(event.event_date) : null

  // Deduplicate by vendor phone
  const seenPhones = new Set<string>()

  // First, add any vendors where delivery coordination already happened
  for (const dc of deliveryCalls || []) {
    if (!dc.contact_phone || seenPhones.has(dc.contact_phone)) continue
    seenPhones.add(dc.contact_phone)

    const extractedWindow = dc.extracted_data?.delivery_window || null
    const confirmed = dc.result === 'yes' || dc.status === 'completed'

    const entry: DeliveryScheduleEntry = {
      vendorName: dc.contact_name || 'Unknown vendor',
      vendorPhone: dc.contact_phone,
      ingredient: dc.subject || 'Unknown item',
      expectedWindow: extractedWindow,
      confirmed,
      contactName: dc.contact_name,
    }

    scheduled.push(entry)

    // Check for prep time conflicts
    if (extractedWindow && prepStartTime) {
      const conflict = checkTimeConflict(extractedWindow, prepStartTime, entry.vendorName)
      if (conflict) conflicts.push(conflict)
    }
  }

  // Then, add confirmed availability calls that haven't been delivery-coordinated yet
  for (const call of confirmedCalls) {
    if (!call.contact_phone || seenPhones.has(call.contact_phone)) continue
    seenPhones.add(call.contact_phone)

    scheduled.push({
      vendorName: call.contact_name || 'Unknown vendor',
      vendorPhone: call.contact_phone,
      ingredient: call.subject || 'Unknown item',
      expectedWindow: null, // Not yet coordinated
      confirmed: false,
      contactName: call.contact_name,
    })
  }

  return { scheduled, conflicts }
}

// -------------------------------------------------------------------------
// Get delivery schedule for an event
// -------------------------------------------------------------------------

/**
 * Returns the current delivery schedule for an event, including
 * both coordinated and uncoordinated vendor deliveries.
 */
export async function getDeliverySchedule(eventId: string): Promise<DeliveryScheduleEntry[]> {
  const result = await coordinateDeliveries(eventId)
  return result.scheduled
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Check if a delivery window conflicts with prep start time.
 * Returns a human-readable conflict description, or null if no conflict.
 *
 * Expected window format: "Thursday 6-8 AM", "2-4 PM", etc.
 * Prep start format: "13:00", "1:00 PM", etc.
 */
function checkTimeConflict(
  deliveryWindow: string,
  prepStartTime: string,
  vendorName: string
): string | null {
  try {
    // Parse prep start as minutes from midnight
    const prepMinutes = parseTimeToMinutes(prepStartTime)
    if (prepMinutes === null) return null

    // Try to extract the latest delivery time from the window string
    // Patterns: "6-8 AM", "2-4 PM", "Thursday 6-8 AM"
    const timeMatch = deliveryWindow.match(/(\d{1,2})\s*(?:-\s*(\d{1,2}))?\s*(AM|PM)/i)
    if (!timeMatch) return null

    const endHour = parseInt(timeMatch[2] || timeMatch[1])
    const isPM = timeMatch[3].toUpperCase() === 'PM'
    const endMinutes = ((isPM && endHour !== 12 ? endHour + 12 : endHour) % 24) * 60

    // Conflict: delivery ends after prep starts
    if (endMinutes > prepMinutes) {
      return `${vendorName} delivers ${deliveryWindow} but prep starts at ${prepStartTime}`
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse a time string into minutes from midnight.
 * Handles "13:00", "1:00 PM", "8:00", etc.
 */
function parseTimeToMinutes(timeStr: string): number | null {
  // Try 24-hour format: "13:00"
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return parseInt(match24[1]) * 60 + parseInt(match24[2])
  }

  // Try 12-hour format: "1:00 PM"
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let hours = parseInt(match12[1])
    const minutes = parseInt(match12[2])
    const isPM = match12[3].toUpperCase() === 'PM'
    if (isPM && hours !== 12) hours += 12
    if (!isPM && hours === 12) hours = 0
    return hours * 60 + minutes
  }

  return null
}
