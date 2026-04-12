'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

// ---------------------------------------------------------------------------
// Email Snapshot Footer ("At a Glance")
// Rich context summary appended after the chef's sign-off in outgoing emails.
// Richer than the critical path (which is binary go/no-go). This includes
// dishes discussed, occasion, cuisine type, and other free-text context.
// ---------------------------------------------------------------------------

export interface SnapshotLine {
  label: string
  value: string | null
  status: 'confirmed' | 'partial' | 'tbd'
}

export interface EmailSnapshotResult {
  title: string
  lines: SnapshotLine[]
  formatted: string
}

function computeTitle(contactName: string | null, occasion: string | null): string {
  const name = contactName || 'Client'
  if (occasion) return `${name}'s ${occasion} Dinner`
  return `${name}'s Dinner`
}

function formatDate(dateStr: string | null): {
  text: string
  status: 'confirmed' | 'partial' | 'tbd'
} {
  if (!dateStr) return { text: 'TBD', status: 'tbd' }
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return { text: 'TBD', status: 'tbd' }
    // Check if it has a specific day or just month/year
    const hasDay = d.getDate() > 0
    if (hasDay) {
      return {
        text: d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        status: 'confirmed',
      }
    }
    return {
      text: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' (exact date TBD)',
      status: 'partial',
    }
  } catch {
    return { text: 'TBD', status: 'tbd' }
  }
}

function formatTime(dateStr: string | null, eventStart: string | null): string | null {
  const src = eventStart || dateStr
  if (!src) return null
  try {
    const d = new Date(src)
    if (isNaN(d.getTime()) || d.getHours() === 0) return null
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return null
  }
}

export async function getEmailSnapshot(inquiryId: string): Promise<EmailSnapshotResult> {
  const user = await requireChef()
  const db = createServerClient()

  // Fetch inquiry
  const { data: inquiry } = await db
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!inquiry) {
    return {
      title: 'Dinner Details',
      lines: [],
      formatted: '- - -\n\nDinner Details\n\nDetails coming soon.',
    }
  }

  // Fetch event if converted
  const eventId = inquiry.converted_to_event_id || null
  let event: Record<string, any> | null = null
  if (eventId) {
    const { data } = await db
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single()
    event = data
  }

  // Check menu status
  let menuStatus = 'TBD'
  let menuConfirmed = false
  if (eventId) {
    const { data: menus } = await db
      .from('event_menus')
      .select('id, status')
      .eq('event_id', eventId)
      .limit(1)
    if (menus && menus.length > 0) {
      const s = menus[0].status
      if (s === 'confirmed' || s === 'locked') {
        menuStatus = 'Confirmed'
        menuConfirmed = true
      } else {
        menuStatus = 'In progress'
      }
    }
  }

  const contactName = inquiry.contact_name || null
  const occasion = inquiry.confirmed_occasion || null
  const title = computeTitle(contactName, occasion)

  const lines: SnapshotLine[] = []

  // Host
  lines.push({
    label: 'Host',
    value: contactName || 'TBD',
    status: contactName ? 'confirmed' : 'tbd',
  })

  // Guests
  const guestCount = inquiry.confirmed_guest_count
  lines.push({
    label: 'Guests',
    value: guestCount && guestCount > 0 ? `${guestCount}` : 'TBD',
    status: guestCount && guestCount > 0 ? 'confirmed' : 'tbd',
  })

  // Occasion (only if we have it)
  if (occasion) {
    lines.push({
      label: 'Occasion',
      value: occasion,
      status: 'confirmed',
    })
  }

  // Date
  const confirmedDate = inquiry.confirmed_date || (event?.serve_time as string | null) || null
  const dateInfo = formatDate(confirmedDate)
  lines.push({
    label: 'Date',
    value: dateInfo.text,
    status: dateInfo.status,
  })

  // Location
  const location = inquiry.confirmed_location || null
  lines.push({
    label: 'Location',
    value: location || 'TBD',
    status: location ? (location.match(/\d+/) ? 'confirmed' : 'partial') : 'tbd',
  })

  // Dietary
  const dietary = inquiry.confirmed_dietary_restrictions as string[] | null
  const hasDietary = Array.isArray(dietary) && dietary.length > 0
  lines.push({
    label: 'Dietary',
    value: hasDietary ? dietary.join(', ') : 'TBD',
    status: hasDietary ? 'confirmed' : 'tbd',
  })

  // Dishes discussed (only if present)
  const dishes = inquiry.discussed_dishes as string[] | null
  if (Array.isArray(dishes) && dishes.length > 0) {
    lines.push({
      label: 'Dishes discussed',
      value: dishes.join(', '),
      status: 'confirmed',
    })
  }

  // Course selection (only if present)
  const tier = inquiry.selected_tier as string | null
  if (tier) {
    lines.push({
      label: 'Course selection',
      value: tier,
      status: 'confirmed',
    })
  }

  // Service time
  const timeStr = formatTime(confirmedDate, event?.serve_time || null)
  lines.push({
    label: 'Service time',
    value: timeStr || 'TBD',
    status: timeStr ? 'confirmed' : 'tbd',
  })

  // Menu confirmed
  lines.push({
    label: 'Menu confirmed',
    value: menuStatus,
    status: menuConfirmed ? 'confirmed' : 'tbd',
  })

  // Build formatted plain text
  const formatted = formatSnapshot(title, lines)

  return { title, lines, formatted }
}

function formatSnapshot(title: string, lines: SnapshotLine[]): string {
  const parts: string[] = ['- - -', '', title, '']

  for (const line of lines) {
    if (line.label === 'Dishes discussed' && line.value) {
      // Sub-bullets for dishes
      parts.push('- Dishes discussed:')
      const dishes = line.value.split(', ')
      for (const dish of dishes) {
        parts.push(`  - ${dish}`)
      }
    } else {
      parts.push(`- ${line.label}: ${line.value || 'TBD'}`)
    }
  }

  return parts.join('\n')
}
