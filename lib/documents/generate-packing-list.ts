// Packing List Generator — Working Document
// Used at home during packing. Organizes prepped food by transport zone,
// lists the equipment kit, and gives component verification counts per course.
// Distinct from the Non-Negotiables Checklist (Printed Sheet #3) — that covers
// personal/operational items. This covers what the prep list produced.
// MUST fit on ONE page — no exceptions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type TransportCategory = 'cold' | 'frozen' | 'room_temp' | 'fragile' | 'liquid'

type PackingComponent = {
  name: string
  transport_category: TransportCategory
  course_name: string
  course_number: number
  storage_notes: string | null
}

export type PackingListData = {
  event: {
    occasion: string | null
    event_date: string
    // Pre-formatted for display: "2:00 PM" or null (departure_time is TIMESTAMPTZ in DB)
    departure_time_display: string | null
    location_address: string
    location_city: string
    location_state: string
    access_instructions: string | null
    service_style: string | null
    special_requests: string | null
  }
  clientName: string
  // Food items by transport zone (only is_make_ahead = true components)
  coldItems: PackingComponent[] // cold + liquid (cooler, perishable)
  frozenItems: PackingComponent[] // frozen (cooler, pack last)
  roomTempItems: PackingComponent[] // room_temp (dry goods bag)
  fragileItems: PackingComponent[] // fragile (own padded container)
  // Component verification counts per course
  courseVerification: { courseNumber: number; courseName: string; count: number }[]
  totalFoodItems: number
  // Equipment — single source of truth, passed to both PDF and interactive UI
  standardKitItems: string[] // always-bring kit (defined here, not in client component)
  mustBringEquipment: string[] // from client.equipment_must_bring[]
  eventEquipment: string[] // triggered by service_style / special_requests
  // Site info
  kitchenNotes: string | null
  houseRules: string | null
}

// ─── Equipment ────────────────────────────────────────────────────────────────

// Exported so they can be referenced if needed, but PackingListData is the runtime source of truth
export const PACKING_STANDARD_KIT = [
  'Knife roll',
  'Cutting board',
  'Apron',
  'Towels (min 6)',
  'Trash bags',
  'Sheet pans',
  'Mixing bowls',
]

const EQUIPMENT_TRIGGERS: Record<string, string[]> = {
  sous_vide: ['Sous vide circulator', 'Vacuum seal bags'],
  cocktail: ['Cocktail shaker', 'Jigger', 'Bar spoon'],
  dessert_frozen: ['Ice cream machine'],
  grill: ['Long tongs', 'Grill brush', 'Meat thermometer'],
  buffet: ['Chafing dishes', 'Sterno fuel cans'],
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchPackingListData(eventId: string): Promise<PackingListData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event with client site info
  // Note: equipment_must_bring, kitchen_notes, house_rules were added in operational_refinements migration
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      occasion, event_date, departure_time,
      location_address, location_city, location_state,
      access_instructions, service_style, special_requests,
      client:clients(
        full_name, equipment_must_bring, kitchen_notes, house_rules
      )
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as {
    full_name: string
    equipment_must_bring: string[] | null
    kitchen_notes: string | null
    house_rules: string | null
  } | null

  // Format departure_time (TIMESTAMPTZ) to display string once here
  // so the PDF renderer and interactive UI both get a clean "2:00 PM" string
  const departureTimeDisplay = event.departure_time
    ? format(new Date(event.departure_time), 'h:mm a')
    : null

  // Find the menu for this event
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  // No menu = no food items, but equipment list still useful
  const menuId = menus?.[0]?.id ?? null

  let components: PackingComponent[] = []

  if (menuId) {
    // Fetch dishes for this menu
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, course_name, course_number')
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d) => d.id)
      const dishMap = new Map(dishes.map((d) => [d.id, d]))

      // Fetch only make-ahead components — these are what get packed
      // Note: transport_category was added in migration 20260301000001.
      // Using .returns<>() to override inferred type until types/database.ts is regenerated
      // via `supabase gen types typescript --linked > types/database.ts`.
      type RawComp = {
        name: string
        transport_category: string | null
        storage_notes: string | null
        sort_order: number
        dish_id: string
      }
      const { data: rawComps } = await supabase
        .from('components')
        .select('name, transport_category, storage_notes, sort_order, dish_id')
        .in('dish_id', dishIds)
        .eq('is_make_ahead', true)
        .eq('tenant_id', user.tenantId!)
        .order('sort_order', { ascending: true })
        .returns<RawComp[]>()

      components = (rawComps || []).map((c) => {
        const dish = dishMap.get(c.dish_id)
        return {
          name: c.name,
          transport_category: (c.transport_category as TransportCategory) ?? 'room_temp',
          course_name: dish?.course_name ?? 'Unknown',
          course_number: dish?.course_number ?? 0,
          storage_notes: c.storage_notes,
        }
      })
    }
  }

  // Sort food items into transport zones
  // cold and liquid both go in the cooler (cold section)
  const coldItems = components.filter(
    (c) => c.transport_category === 'cold' || c.transport_category === 'liquid'
  )
  const frozenItems = components.filter((c) => c.transport_category === 'frozen')
  const roomTempItems = components.filter((c) => c.transport_category === 'room_temp')
  const fragileItems = components.filter((c) => c.transport_category === 'fragile')

  // Component verification counts per course
  const countsByCourse = new Map<number, { courseName: string; count: number }>()
  for (const comp of components) {
    const existing = countsByCourse.get(comp.course_number)
    if (existing) {
      existing.count++
    } else {
      countsByCourse.set(comp.course_number, { courseName: comp.course_name, count: 1 })
    }
  }
  const courseVerification = Array.from(countsByCourse.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([courseNumber, { courseName, count }]) => ({ courseNumber, courseName, count }))

  // Equipment triggers: service_style + special_requests keywords
  const eventEquipment: string[] = []
  const serviceStyle = event.service_style ?? ''
  const specialRequests = (event.special_requests ?? '').toLowerCase()

  if (serviceStyle === 'buffet') eventEquipment.push(...EQUIPMENT_TRIGGERS.buffet)
  if (serviceStyle === 'cocktail') eventEquipment.push(...EQUIPMENT_TRIGGERS.cocktail)
  if (specialRequests.includes('sous vide')) eventEquipment.push(...EQUIPMENT_TRIGGERS.sous_vide)
  if (specialRequests.includes('grill') || specialRequests.includes('bbq'))
    eventEquipment.push(...EQUIPMENT_TRIGGERS.grill)
  if (frozenItems.length > 0) eventEquipment.push(...EQUIPMENT_TRIGGERS.dessert_frozen)

  // Deduplicate event equipment (multiple triggers can fire the same item)
  const uniqueEventEquipment = [...new Set(eventEquipment)]

  return {
    event: {
      occasion: event.occasion,
      event_date: event.event_date,
      departure_time_display: departureTimeDisplay,
      location_address: event.location_address,
      location_city: event.location_city,
      location_state: event.location_state,
      access_instructions: event.access_instructions,
      service_style: event.service_style,
      special_requests: event.special_requests,
    },
    clientName: clientData?.full_name ?? 'Unknown',
    coldItems,
    frozenItems,
    roomTempItems,
    fragileItems,
    courseVerification,
    totalFoodItems: components.length,
    standardKitItems: PACKING_STANDARD_KIT,
    mustBringEquipment: clientData?.equipment_must_bring ?? [],
    eventEquipment: uniqueEventEquipment,
    kitchenNotes: clientData?.kitchen_notes ?? null,
    houseRules: clientData?.house_rules ?? null,
  }
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

export function renderPackingList(pdf: PDFLayout, data: PackingListData) {
  const {
    event,
    clientName,
    coldItems,
    frozenItems,
    roomTempItems,
    fragileItems,
    courseVerification,
    totalFoodItems,
    standardKitItems,
    mustBringEquipment,
    eventEquipment,
    kitchenNotes,
    houseRules,
  } = data

  // Estimate total item count for font scaling
  const totalItems =
    coldItems.length +
    frozenItems.length +
    roomTempItems.length +
    fragileItems.length +
    standardKitItems.length +
    mustBringEquipment.length +
    eventEquipment.length

  if (totalItems > 30) pdf.setFontScale(0.85)
  if (totalItems > 45) pdf.setFontScale(0.75)

  // ─── Header ────────────────────────────────────────────────────────────────

  pdf.title('PACKING LIST', 14)

  const dateStr = format(parseISO(event.event_date), 'EEE, MMM d, yyyy')
  pdf.headerBar([
    ['Event', event.occasion || 'Dinner'],
    ['Date', dateStr],
    ['Client', clientName],
  ])

  if (event.departure_time_display) {
    pdf.headerBar([['DEPART BY', event.departure_time_display]])
  }

  const location = [event.location_address, event.location_city, event.location_state]
    .filter(Boolean)
    .join(', ')
  if (location) {
    pdf.text(`Location: ${location}`, 8, 'normal')
  }
  if (event.access_instructions) {
    pdf.text(`Access: ${event.access_instructions}`, 8, 'italic')
  }

  pdf.space(2)

  // ─── Food: Cooler — Cold & Liquid ──────────────────────────────────────────

  if (coldItems.length > 0) {
    pdf.sectionHeader('COOLER — COLD ITEMS', 11, true)
    for (const item of coldItems) {
      const label = item.storage_notes ? `${item.name} — ${item.storage_notes}` : item.name
      pdf.checkbox(label, 9, `C${item.course_number}`)
    }
    pdf.space(1)
  }

  // ─── Food: Frozen (pack last) ───────────────────────────────────────────────

  if (frozenItems.length > 0) {
    pdf.sectionHeader('COOLER — FROZEN (pack last, on top)', 11, true)
    for (const item of frozenItems) {
      const label = item.storage_notes ? `${item.name} — ${item.storage_notes}` : item.name
      pdf.checkbox(label, 9, `C${item.course_number}`)
    }
    pdf.space(1)
  }

  // ─── Food: Room Temp ───────────────────────────────────────────────────────

  if (roomTempItems.length > 0) {
    pdf.sectionHeader('DRY BAG — ROOM TEMP', 11, true)
    for (const item of roomTempItems) {
      const label = item.storage_notes ? `${item.name} — ${item.storage_notes}` : item.name
      pdf.checkbox(label, 9, `C${item.course_number}`)
    }
    pdf.space(1)
  }

  // ─── Food: Fragile ─────────────────────────────────────────────────────────

  if (fragileItems.length > 0) {
    pdf.sectionHeader('FRAGILE — own padded container, nothing stacked on top', 11, true)
    for (const item of fragileItems) {
      const label = item.storage_notes ? `${item.name} — ${item.storage_notes}` : item.name
      pdf.checkbox(label, 9, `C${item.course_number}`)
    }
    pdf.space(1)
  }

  // Fallback when no food items exist yet
  if (
    coldItems.length === 0 &&
    frozenItems.length === 0 &&
    roomTempItems.length === 0 &&
    fragileItems.length === 0
  ) {
    pdf.sectionHeader('FOOD ITEMS', 11, true)
    pdf.text(
      'No make-ahead components found. Add components to the menu with "Make ahead" checked.',
      8,
      'italic'
    )
    pdf.space(1)
  }

  // ─── Equipment ─────────────────────────────────────────────────────────────

  pdf.sectionHeader('EQUIPMENT', 11, true)

  for (const item of standardKitItems) {
    pdf.checkbox(item, 9)
  }

  if (mustBringEquipment.length > 0) {
    pdf.space(0.5)
    pdf.text('Client-specific:', 8, 'bold', 2)
    for (const item of mustBringEquipment) {
      pdf.checkbox(item, 9)
    }
  }

  if (eventEquipment.length > 0) {
    pdf.space(0.5)
    pdf.text('This event:', 8, 'bold', 2)
    for (const item of eventEquipment) {
      pdf.checkbox(item, 9)
    }
  }

  pdf.space(1)

  // ─── Component Verification ────────────────────────────────────────────────

  if (courseVerification.length > 0) {
    pdf.sectionHeader('COMPONENT VERIFICATION', 11, true)
    for (const { courseNumber, courseName, count } of courseVerification) {
      pdf.text(
        `Course ${courseNumber} — ${courseName}: ${count} item${count !== 1 ? 's' : ''}`,
        9,
        'normal',
        2
      )
    }
    pdf.text(`TOTAL: ${totalFoodItems} food items to pack`, 9, 'bold', 2)
    pdf.space(1)
  }

  // ─── Site Notes ────────────────────────────────────────────────────────────

  if (kitchenNotes || houseRules) {
    pdf.sectionHeader('SITE NOTES', 10, true)
    if (kitchenNotes) pdf.text(`Kitchen: ${kitchenNotes}`, 8, 'normal', 2)
    if (houseRules) pdf.text(`House rules: ${houseRules}`, 8, 'italic', 2)
  }

  // ─── Footer ────────────────────────────────────────────────────────────────

  const footerParts: string[] = []
  if (event.departure_time_display) footerParts.push(`Depart ${event.departure_time_display}`)
  footerParts.push(
    [event.location_city, event.location_state].filter(Boolean).join(', ') || location
  )
  if (event.access_instructions) footerParts.push(`Access: ${event.access_instructions}`)

  pdf.footer(footerParts.filter(Boolean).join('  |  '))
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function generatePackingList(eventId: string): Promise<Buffer> {
  const data = await fetchPackingListData(eventId)
  if (!data) throw new Error('Cannot generate packing list: event not found')

  const pdf = new PDFLayout()
  renderPackingList(pdf, data)
  return pdf.toBuffer()
}
