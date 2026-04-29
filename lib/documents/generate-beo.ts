// BEO (Banquet Event Order) Generator
// Master operational document: everything a venue coordinator, co-host,
// or staff member needs on one page. Consolidates event, client, venue,
// menu, timeline, staff, equipment, and dietary/allergy info.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'

const STAFF_ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Staff',
}

function formatStaffRole(role: string | null | undefined): string {
  if (!role) return 'Staff'
  return STAFF_ROLE_LABELS[role] ?? role.replace(/_/g, ' ')
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type BEOData = {
  event: {
    occasion: string | null
    event_date: string
    serve_time: string | null
    arrival_time: string | null
    departure_time: string | null
    guest_count: number
    status: string
    service_style: string | null
    special_requests: string | null
    allergies: string[]
    dietary_restrictions: string[]
    location_address: string | null
    location_city: string | null
    location_state: string | null
    location_zip: string | null
    access_instructions: string | null
    kitchen_notes: string | null
    ambiance_notes: string | null
    venue_contact_name: string | null
    venue_contact_phone: string | null
    venue_contact_email: string | null
    loading_dock: boolean | null
    load_in_path_notes: string | null
  }
  client: {
    full_name: string
    email: string | null
    phone: string | null
    allergies: string[]
    house_rules: string | null
  }
  menu: {
    courses: {
      courseNumber: number
      courseName: string
      dishes: { name: string; description: string | null; allergenFlags: string[] }[]
    }[]
  }
  timeline: {
    arrival: string | null
    serviceStart: string | null
    serviceEnd: string | null
    departure: string | null
  }
  staff: { name: string; role: string }[]
  equipmentSummary: string[]
  emergencyContacts: { name: string; phone: string; role: string }[]
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchBEOData(eventId: string): Promise<BEOData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, serve_time, arrival_time, departure_time,
      guest_count, status, service_style, special_requests,
      allergies, dietary_restrictions,
      location_address, location_city, location_state, location_zip,
      access_instructions, kitchen_notes, ambiance_notes,
      venue_contact_name, venue_contact_phone, venue_contact_email,
      loading_dock, load_in_path_notes,
      client:clients(
        full_name, email, phone, allergies, house_rules
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as {
    full_name: string
    email: string | null
    phone: string | null
    allergies: string[] | null
    house_rules: string | null
  } | null

  // Fetch menu courses + dishes
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  const menuId = menus?.[0]?.id ?? null
  const courses: BEOData['menu']['courses'] = []

  if (menuId) {
    const { data: dishes } = await db
      .from('dishes')
      .select('id, course_name, course_number, description, allergen_flags')
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })

    if (dishes && dishes.length > 0) {
      const courseMap = new Map<number, { courseName: string; dishes: any[] }>()
      for (const d of dishes) {
        const existing = courseMap.get(d.course_number)
        const dish = {
          name: d.course_name,
          description: d.description,
          allergenFlags: d.allergen_flags ?? [],
        }
        if (existing) {
          existing.dishes.push(dish)
        } else {
          courseMap.set(d.course_number, { courseName: d.course_name, dishes: [dish] })
        }
      }
      for (const [num, data] of Array.from(courseMap.entries()).sort((a, b) => a[0] - b[0])) {
        courses.push({ courseNumber: num, courseName: data.courseName, dishes: data.dishes })
      }
    }
  }

  // Fetch staff assignments
  const staff: BEOData['staff'] = []
  try {
    const { data: staffData } = await db
      .from('event_staff_assignments')
      .select(
        `
        role_override,
        staff_members (name, role)
      `
      )
      .eq('event_id', eventId)
      .eq('chef_id', user.tenantId!)
      .order('created_at')

    if (staffData) {
      for (const s of staffData) {
        const member = s.staff_members as unknown as { name: string; role: string | null } | null
        if (member) {
          staff.push({
            name: member.name,
            role: formatStaffRole(s.role_override ?? member.role),
          })
        }
      }
    }
  } catch {
    // Staff assignments are optional for BEO generation; keep document generation non-blocking.
  }

  // Build timeline
  const fmtTime = (val: string | null) => {
    if (!val) return null
    try {
      const d = new Date(val)
      return format(d, 'h:mm a')
    } catch {
      return val
    }
  }

  const timeline: BEOData['timeline'] = {
    arrival: fmtTime(event.arrival_time),
    serviceStart: fmtTime(event.serve_time),
    serviceEnd: null,
    departure: fmtTime(event.departure_time),
  }

  // Equipment summary (brief for BEO, not full pack list)
  const equipmentSummary: string[] = []
  if (event.service_style) {
    equipmentSummary.push(`Service style: ${event.service_style}`)
  }
  if (event.loading_dock) {
    equipmentSummary.push('Loading dock available')
  }
  if (event.load_in_path_notes) {
    equipmentSummary.push(`Load-in: ${event.load_in_path_notes}`)
  }

  // Emergency contacts: chef + client
  const emergencyContacts: BEOData['emergencyContacts'] = []
  if (clientData?.phone) {
    emergencyContacts.push({
      name: clientData.full_name,
      phone: clientData.phone,
      role: 'Client',
    })
  }

  // Chef contact
  try {
    const { data: chef } = await db
      .from('chefs')
      .select('business_name, phone')
      .eq('id', user.tenantId!)
      .single()
    if (chef?.phone) {
      emergencyContacts.push({
        name: chef.business_name || 'Chef',
        phone: chef.phone,
        role: 'Chef',
      })
    }
  } catch {
    // non-blocking
  }

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      serve_time: event.serve_time,
      arrival_time: event.arrival_time,
      departure_time: event.departure_time,
      guest_count: event.guest_count ?? 0,
      status: event.status,
      service_style: event.service_style,
      special_requests: event.special_requests,
      allergies: event.allergies ?? [],
      dietary_restrictions: event.dietary_restrictions ?? [],
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      location_zip: event.location_zip,
      access_instructions: event.access_instructions,
      kitchen_notes: event.kitchen_notes,
      ambiance_notes: event.ambiance_notes,
      venue_contact_name: event.venue_contact_name ?? null,
      venue_contact_phone: event.venue_contact_phone ?? null,
      venue_contact_email: event.venue_contact_email ?? null,
      loading_dock: event.loading_dock ?? null,
      load_in_path_notes: event.load_in_path_notes ?? null,
    },
    client: {
      full_name: clientData?.full_name ?? 'Unknown',
      email: clientData?.email ?? null,
      phone: clientData?.phone ?? null,
      allergies: clientData?.allergies ?? [],
      house_rules: clientData?.house_rules ?? null,
    },
    menu: { courses },
    timeline,
    staff,
    equipmentSummary,
    emergencyContacts,
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderBEO(pdf: PDFLayout, data: BEOData) {
  const { event, client, menu, timeline, staff, equipmentSummary, emergencyContacts } = data

  // Estimate density for font scaling
  const totalSections = menu.courses.length + (staff.length > 0 ? 1 : 0) + 4
  if (totalSections > 10) pdf.setFontScale(0.85)
  if (totalSections > 14) pdf.setFontScale(0.75)

  pdf.title('BANQUET EVENT ORDER', 14)

  const dateStr = format(
    parseISO(dateToDateString(event.event_date as Date | string)),
    'EEEE, MMMM d, yyyy'
  )

  // ─── Header ────────────────────────────────────────────────────────────────

  pdf.headerBar([
    ['Event', event.occasion || 'Service'],
    ['Date', dateStr],
    ['Covers', String(event.guest_count)],
    ['Status', event.status.replace(/_/g, ' ').toUpperCase()],
  ])

  pdf.space(1)

  // ─── Client & Venue ─────────────────────────────────────────────────────────

  pdf.sectionHeader('CLIENT', 10, true)
  pdf.text(`${client.full_name}`, 9, 'bold')
  if (client.email) pdf.text(client.email, 8, 'normal', 2)
  if (client.phone) pdf.text(client.phone, 8, 'normal', 2)
  pdf.space(1)

  const location = [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ]
    .filter(Boolean)
    .join(', ')

  if (location) {
    pdf.sectionHeader('VENUE', 10, true)
    pdf.text(location, 9, 'normal')
    if (event.access_instructions) pdf.text(`Access: ${event.access_instructions}`, 8, 'italic', 2)
    if (event.venue_contact_name) {
      const vcParts = [
        event.venue_contact_name,
        event.venue_contact_phone,
        event.venue_contact_email,
      ].filter(Boolean)
      pdf.text(`Venue contact: ${vcParts.join(' / ')}`, 8, 'normal', 2)
    }
    if (event.load_in_path_notes) pdf.text(`Load-in: ${event.load_in_path_notes}`, 8, 'italic', 2)
    if (event.loading_dock) pdf.text('Loading dock: Yes', 8, 'normal', 2)
    pdf.space(1)
  }

  // ─── Allergy & Dietary ──────────────────────────────────────────────────────

  const allAllergies = [...new Set([...event.allergies, ...client.allergies])]
  if (allAllergies.length > 0) {
    pdf.warningBox(`ALLERGY ALERT: ${allAllergies.map((a) => a.toUpperCase()).join(', ')}`)
  }

  if (event.dietary_restrictions.length > 0) {
    pdf.text(`Dietary: ${event.dietary_restrictions.join(', ')}`, 8, 'italic', 2)
  }

  pdf.space(1)

  // ─── Timeline ───────────────────────────────────────────────────────────────

  pdf.sectionHeader('TIMELINE', 10, true)
  const timeEntries: string[] = []
  if (timeline.arrival) timeEntries.push(`Arrival: ${timeline.arrival}`)
  if (timeline.serviceStart) timeEntries.push(`Service: ${timeline.serviceStart}`)
  if (timeline.serviceEnd) timeEntries.push(`End: ${timeline.serviceEnd}`)
  if (timeline.departure) timeEntries.push(`Departure: ${timeline.departure}`)

  if (timeEntries.length > 0) {
    pdf.text(timeEntries.join('  |  '), 9, 'normal')
  } else {
    pdf.text('Timeline not set', 8, 'italic')
  }

  if (event.service_style) {
    pdf.text(`Service style: ${event.service_style.replace(/_/g, ' ')}`, 8, 'normal', 2)
  }
  pdf.space(1)

  // ─── Menu ───────────────────────────────────────────────────────────────────

  if (menu.courses.length > 0) {
    pdf.sectionHeader('MENU', 10, true)
    for (const course of menu.courses) {
      pdf.text(`Course ${course.courseNumber}`, 9, 'bold', 2)
      for (const dish of course.dishes) {
        const allergenSuffix =
          dish.allergenFlags.length > 0 ? ` [${dish.allergenFlags.join(', ')}]` : ''
        pdf.text(`${dish.name}${allergenSuffix}`, 9, 'normal', 4)
        if (dish.description) {
          pdf.text(dish.description, 8, 'italic', 6)
        }
      }
    }
    pdf.space(1)
  }

  // ─── Staff ──────────────────────────────────────────────────────────────────

  if (staff.length > 0) {
    pdf.sectionHeader('STAFF', 10, true)
    for (const s of staff) {
      pdf.text(`${s.name} - ${s.role}`, 9, 'normal', 2)
    }
    pdf.space(1)
  }

  // ─── Special Requests & Notes ───────────────────────────────────────────────

  if (event.special_requests || event.ambiance_notes || event.kitchen_notes || client.house_rules) {
    pdf.sectionHeader('NOTES', 10, true)
    if (event.special_requests) pdf.text(`Requests: ${event.special_requests}`, 8, 'normal', 2)
    if (event.ambiance_notes) pdf.text(`Ambiance: ${event.ambiance_notes}`, 8, 'normal', 2)
    if (event.kitchen_notes) pdf.text(`Kitchen: ${event.kitchen_notes}`, 8, 'normal', 2)
    if (client.house_rules) pdf.text(`House rules: ${client.house_rules}`, 8, 'italic', 2)
    pdf.space(1)
  }

  // ─── Equipment Summary ──────────────────────────────────────────────────────

  if (equipmentSummary.length > 0) {
    pdf.sectionHeader('EQUIPMENT NOTES', 10, true)
    for (const item of equipmentSummary) {
      pdf.text(item, 8, 'normal', 2)
    }
    pdf.space(1)
  }

  // ─── Emergency Contacts ─────────────────────────────────────────────────────

  if (emergencyContacts.length > 0) {
    pdf.sectionHeader('EMERGENCY CONTACTS', 10, true)
    for (const c of emergencyContacts) {
      pdf.text(`${c.role}: ${c.name} - ${c.phone}`, 8, 'normal', 2)
    }
  }

  // ─── Footer ─────────────────────────────────────────────────────────────────

  const footerParts: string[] = [dateStr]
  if (event.guest_count > 0) footerParts.push(`${event.guest_count} covers`)
  if (event.occasion) footerParts.push(event.occasion)
  pdf.footer(footerParts.join('  |  '))
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generateBEO(eventId: string, generatedByName?: string): Promise<Buffer> {
  const data = await fetchBEOData(eventId)
  if (!data) throw new Error('Cannot generate BEO: event not found')

  const pdf = new PDFLayout()
  renderBEO(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Banquet Event Order')
  return pdf.toBuffer()
}
