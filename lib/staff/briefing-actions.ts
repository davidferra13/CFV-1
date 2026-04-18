'use server'

// Staff Briefing Generator
// Compiles a structured, one-page staff briefing from event data.
// Covers everything staff need to know before arriving: timeline, menu,
// plating style, service expectations, client vibe, allergies, roles.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { format, parse, addHours } from 'date-fns'

export type StaffBriefingMember = {
  name: string
  role: string
  phone: string | null
  scheduledHours: number | null
}

export type StaffBriefingData = {
  eventId: string
  occasion: string | null
  eventDate: string | null // formatted 'EEEE, MMMM d, yyyy'
  rawEventDate: string | null
  serveTime: string | null
  arrivalTime: string | null // 2h before serve time
  guestCount: number | null
  locationAddress: string | null
  clientName: string | null
  // Dietary
  dietaryRestrictions: string[]
  allergyNotes: string | null
  // Menu
  menuItems: string[]
  menuNotes: string | null
  // Service
  serviceStylePref: string | null
  specialRequests: string | null
  kitchenNotes: string | null
  // Staff
  staff: StaffBriefingMember[]
  // Meta
  generatedAt: string
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Assistant',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

function parseArrivalTime(serveTime: string | null): string | null {
  if (!serveTime) return null
  try {
    // serveTime is like "7:00 PM" or "07:00 PM"
    const parsed = parse(serveTime, 'h:mm aa', new Date())
    const arrival = addHours(parsed, -2)
    return format(arrival, 'h:mm aa')
  } catch {
    return null
  }
}

export async function generateStaffBriefing(eventId: string): Promise<StaffBriefingData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event + client in one query
  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, serve_time, guest_count,
      location_address, special_requests, notes, ambiance_notes,
      clients (
        id, full_name, allergies, dietary_restrictions,
        kitchen_constraints, kitchen_oven_notes, kitchen_burner_notes,
        kitchen_counter_notes, kitchen_refrigeration_notes, kitchen_plating_notes,
        kitchen_sink_notes
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) return null

  // Fetch staff assignments
  const { data: assignments } = await db
    .from('event_staff_assignments')
    .select(
      `
      role_override, scheduled_hours,
      staff_members (name, role, phone)
    `
    )
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)
    .order('created_at')

  // Fetch confirmed dietary restrictions from linked inquiry (if any)
  const { data: inquiry } = await db
    .from('inquiries')
    .select('confirmed_dietary_restrictions, service_style_pref')
    .eq('converted_to_event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .maybeSingle()

  // Fetch confirmed allergy records for the client
  let allergyRecords: any[] = []
  if (event.clients?.id) {
    const { data: allergyRows } = await db
      .from('client_allergy_records')
      .select('allergen, severity, notes')
      .eq('client_id', event.clients.id)
      .eq('tenant_id', user.tenantId!)
      .eq('confirmed_by_chef', true)
      .order('severity', { ascending: true })
    allergyRecords = allergyRows ?? []
  }

  // Fetch active menu dishes for this event via event_menus -> dishes chain
  const { data: eventMenuLinks } = await (db
    .from('event_menus' as any)
    .select('menu_id')
    .eq('event_id', eventId) as any)
  const briefingMenuIds = ((eventMenuLinks ?? []) as Array<{ menu_id: string }>).map(
    (em) => em.menu_id
  )
  const { data: menuRows } =
    briefingMenuIds.length > 0
      ? await (db
          .from('dishes' as any)
          .select('name, description, course_name')
          .eq('tenant_id', user.tenantId!)
          .in('menu_id', briefingMenuIds)
          .not('name', 'is', null)
          .order('course_number', { ascending: true }) as any)
      : { data: [] }

  // Build formatted event date
  let formattedDate: string | null = null
  try {
    if (event.event_date) {
      formattedDate = format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')
    }
  } catch {
    formattedDate = event.event_date
  }

  // Build staff list from assignments
  const staff: StaffBriefingMember[] = (assignments ?? []).map((a: any) => {
    const member = a.staff_members
    const role = ROLE_LABELS[a.role_override ?? member?.role ?? 'other'] ?? 'Other'
    return {
      name: member?.name ?? 'Unknown',
      role,
      phone: member?.phone ?? null,
      scheduledHours: a.scheduled_hours ?? null,
    }
  })

  // Include collaborating chefs as briefing members
  try {
    const { data: collabs } = await db
      .from('event_collaborators')
      .select('role, chefs(business_name, phone)')
      .eq('event_id', eventId)
      .neq('chef_id', user.tenantId!)
    if (collabs) {
      for (const c of collabs as any[]) {
        staff.push({
          name: c.chefs?.business_name || 'Collaborating Chef',
          role:
            c.role === 'co_host'
              ? 'Co-Host Chef'
              : c.role === 'subcontractor'
                ? 'Subcontractor Chef'
                : 'Collaborator',
          phone: c.chefs?.phone ?? null,
          scheduledHours: null,
        })
      }
    }
  } catch (err) {
    console.error('[non-blocking] Collaborator lookup for briefing failed', err)
  }

  // Combine kitchen notes into one string
  const client = event.clients as any

  // Build dietary restrictions list (merge inquiry + client profile, deduplicate)
  const inquiryDietary =
    inquiry?.confirmed_dietary_restrictions ?? event.confirmed_dietary_restrictions ?? []
  const clientDietary = client?.dietary_restrictions ?? []
  const mergedDietary = [
    ...(Array.isArray(inquiryDietary)
      ? inquiryDietary
      : typeof inquiryDietary === 'string'
        ? [inquiryDietary]
        : []),
    ...(Array.isArray(clientDietary)
      ? clientDietary
      : typeof clientDietary === 'string'
        ? [clientDietary]
        : []),
  ].filter(Boolean)
  const dietaryList: string[] = [...new Set(mergedDietary)]

  // Build menu items list (grouped by course if available)
  const menuItems: string[] = (menuRows ?? []).map((item: any) => {
    const course = item.course_name ? `[${item.course_name}] ` : ''
    const desc = item.description ? ` - ${item.description}` : ''
    return `${course}${item.name}${desc}`
  })
  const kitchenParts = [
    client?.kitchen_oven_notes ? `Oven: ${client.kitchen_oven_notes}` : null,
    client?.kitchen_burner_notes ? `Burners: ${client.kitchen_burner_notes}` : null,
    client?.kitchen_counter_notes ? `Counter space: ${client.kitchen_counter_notes}` : null,
    client?.kitchen_refrigeration_notes
      ? `Refrigeration: ${client.kitchen_refrigeration_notes}`
      : null,
    client?.kitchen_plating_notes ? `Plating surfaces: ${client.kitchen_plating_notes}` : null,
    client?.kitchen_sink_notes ? `Sink access: ${client.kitchen_sink_notes}` : null,
    client?.kitchen_constraints ? `General: ${client.kitchen_constraints}` : null,
  ].filter(Boolean)

  return {
    eventId,
    occasion: event.occasion ?? null,
    eventDate: formattedDate,
    rawEventDate: event.event_date ?? null,
    serveTime: event.serve_time ?? null,
    arrivalTime: parseArrivalTime(event.serve_time),
    guestCount: event.guest_count ?? null,
    locationAddress: event.location_address ?? null,
    clientName: client?.full_name ?? null,
    dietaryRestrictions: dietaryList,
    allergyNotes:
      allergyRecords.length > 0
        ? allergyRecords
            .map((a: any) => `${a.allergen} (${a.severity})${a.notes ? ': ' + a.notes : ''}`)
            .join('; ')
        : null,
    menuItems,
    menuNotes: event.notes ?? null,
    serviceStylePref: inquiry?.service_style_pref ?? null,
    specialRequests: event.special_requests ?? null,
    kitchenNotes: kitchenParts.length > 0 ? kitchenParts.join('\n') : null,
    staff,
    generatedAt: new Date().toISOString(),
  }
}
