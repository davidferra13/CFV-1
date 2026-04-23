// Packing List Generator - Working Document
// Used at home during packing. Organizes prepped food by transport zone,
// lists the equipment kit, and gives component verification counts per course.
// Distinct from the Non-Negotiables Checklist (Printed Sheet #3) - that covers
// personal/operational items. This covers what the prep list produced.
// MUST fit on ONE page - no exceptions.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { PDFLayout } from './pdf-layout'
import { format, parseISO } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { getGearDefaults } from '@/lib/gear/actions'
import { DEFAULT_GEAR_ITEMS, GEAR_CATEGORY_ORDER, GEAR_CATEGORY_LABELS } from '@/lib/gear/defaults'
import type { GearCategory } from '@/lib/gear/defaults'

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
    departure_time_display: string | null
    location_address: string
    location_city: string
    location_state: string
    access_instructions: string | null
    service_style: string | null
    special_requests: string | null
  }
  clientName: string
  guestCount: number
  coldItems: PackingComponent[]
  frozenItems: PackingComponent[]
  roomTempItems: PackingComponent[]
  fragileItems: PackingComponent[]
  courseVerification: { courseNumber: number; courseName: string; count: number }[]
  totalFoodItems: number
  standardKitItems: string[]
  mustBringEquipment: string[]
  eventEquipment: string[]
  servicewareItems: string[]
  personalGear: { name: string; category: string }[]
  kitchenNotes: string | null
  houseRules: string | null
  allergies: string[]
}

// ─── Equipment ────────────────────────────────────────────────────────────────

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

// ─── Serviceware by Style ────────────────────────────────────────────────────

function buildServicewareItems(
  serviceStyle: string | null,
  guestCount: number,
  dishCount: number
): string[] {
  const gc = guestCount || 4
  const plateCount = gc + Math.ceil(gc * 0.1)
  const flatwareCount = plateCount
  const napkinCount = gc + Math.ceil(gc * 0.15)
  const servingUtensilCount = Math.max(2, dishCount)

  const items: string[] = []

  switch (serviceStyle) {
    case 'plated':
      items.push(`Dinner plates (${plateCount})`)
      items.push(`Salad plates (${plateCount})`)
      items.push(`Flatware sets (${flatwareCount})`)
      items.push(`Water glasses (${plateCount})`)
      break
    case 'buffet':
      items.push(`Serving platters (${servingUtensilCount})`)
      items.push(`Serving utensils (${servingUtensilCount})`)
      items.push(`Stacked plates (${plateCount})`)
      items.push(`Bundled flatware (${flatwareCount})`)
      break
    case 'family_style':
      items.push(`Serving bowls (${Math.ceil(dishCount * 0.75)})`)
      items.push(`Serving platters (${Math.ceil(dishCount * 0.5)})`)
      items.push(`Large serving spoons/forks (${servingUtensilCount})`)
      items.push(`Dinner plates (${plateCount})`)
      items.push(`Flatware sets (${flatwareCount})`)
      break
    case 'cocktail':
      items.push(`Cocktail napkins (${napkinCount * 2})`)
      items.push(`Small plates (${plateCount})`)
      items.push('Picks / skewers')
      items.push(`Glassware (${plateCount})`)
      break
    default:
      items.push(`Dinner plates (${plateCount})`)
      items.push(`Flatware sets (${flatwareCount})`)
      break
  }

  items.push(`Napkins (${napkinCount})`)
  items.push(`Serving utensils (${servingUtensilCount})`)

  return [...new Set(items)]
}

// ─── Equipment Scaling ───────────────────────────────────────────────────────

function scaleStandardKit(guestCount: number): string[] {
  const gc = guestCount || 4
  return [
    'Knife roll',
    'Cutting board',
    'Apron',
    `Towels (${Math.max(6, Math.ceil(gc / 4))})`,
    'Trash bags',
    `Sheet pans (${Math.max(2, Math.ceil(gc / 8))})`,
    `Mixing bowls (${Math.max(3, Math.ceil(gc / 10))})`,
  ]
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

export async function fetchPackingListData(eventId: string): Promise<PackingListData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      occasion, event_date, departure_time, guest_count,
      location_address, location_city, location_state,
      access_instructions, service_style, special_requests,
      allergies, ambiance_notes,
      client:clients(
        full_name, equipment_must_bring, kitchen_notes, house_rules, allergies
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
    allergies: string[] | null
  } | null

  const allAllergies = new Set<string>()
  for (const a of event.allergies ?? []) allAllergies.add(a.trim())
  for (const a of clientData?.allergies ?? []) allAllergies.add(a.trim())

  const departureTimeDisplay = event.departure_time
    ? format(new Date(event.departure_time), 'h:mm a')
    : null

  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })
    .limit(1)

  const menuId = menus?.[0]?.id ?? null
  let components: PackingComponent[] = []

  if (menuId) {
    const { data: dishes } = await db
      .from('dishes')
      .select('id, course_name, course_number')
      .eq('menu_id', menuId)
      .eq('tenant_id', user.tenantId!)
      .order('course_number', { ascending: true })

    if (dishes && dishes.length > 0) {
      const dishIds = dishes.map((d: any) => d.id)
      const dishMap = new Map<string, any>(dishes.map((d: any) => [d.id, d]))

      type RawComp = {
        name: string
        transport_category: string | null
        storage_notes: string | null
        sort_order: number
        dish_id: string
      }
      const { data: rawComps } = await db
        .from('components')
        .select('name, transport_category, storage_notes, sort_order, dish_id')
        .in('dish_id', dishIds)
        .eq('is_make_ahead', true)
        .eq('tenant_id', user.tenantId!)
        .order('sort_order', { ascending: true })

      components = (rawComps || []).map((c: any) => {
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

  const coldItems = components.filter(
    (c) => c.transport_category === 'cold' || c.transport_category === 'liquid'
  )
  const frozenItems = components.filter((c) => c.transport_category === 'frozen')
  const roomTempItems = components.filter((c) => c.transport_category === 'room_temp')
  const fragileItems = components.filter((c) => c.transport_category === 'fragile')

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

  const eventEquipment: string[] = []
  const serviceStyle = event.service_style ?? ''
  const specialRequests = (event.special_requests ?? '').toLowerCase()

  if (serviceStyle === 'buffet') eventEquipment.push(...EQUIPMENT_TRIGGERS.buffet)
  if (serviceStyle === 'cocktail') eventEquipment.push(...EQUIPMENT_TRIGGERS.cocktail)
  if (specialRequests.includes('sous vide')) eventEquipment.push(...EQUIPMENT_TRIGGERS.sous_vide)
  if (specialRequests.includes('grill') || specialRequests.includes('bbq'))
    eventEquipment.push(...EQUIPMENT_TRIGGERS.grill)
  if (frozenItems.length > 0) eventEquipment.push(...EQUIPMENT_TRIGGERS.dessert_frozen)

  const uniqueEventEquipment = [...new Set(eventEquipment)]

  const guestCount = event.guest_count ?? 4
  const dishCount = components.length || 4
  const servicewareItems = buildServicewareItems(event.service_style, guestCount, dishCount)
  const scaledKitItems = scaleStandardKit(guestCount)

  let personalGear: { name: string; category: string }[] = []
  try {
    const gearList = await getGearDefaults(user.entityId!)
    if (gearList.length > 0) {
      personalGear = gearList
        .filter((g) => g.is_active)
        .map((g) => ({ name: g.item_name, category: g.category }))
    } else {
      personalGear = DEFAULT_GEAR_ITEMS.map((g) => ({ name: g.item_name, category: g.category }))
    }
  } catch {
    personalGear = DEFAULT_GEAR_ITEMS.map((g) => ({ name: g.item_name, category: g.category }))
  }

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
    guestCount,
    coldItems,
    frozenItems,
    roomTempItems,
    fragileItems,
    courseVerification,
    totalFoodItems: components.length,
    standardKitItems: scaledKitItems,
    mustBringEquipment: clientData?.equipment_must_bring ?? [],
    eventEquipment: uniqueEventEquipment,
    servicewareItems,
    personalGear,
    kitchenNotes: clientData?.kitchen_notes ?? null,
    houseRules: clientData?.house_rules ?? null,
    allergies: Array.from(allAllergies),
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

  const totalItems =
    coldItems.length +
    frozenItems.length +
    roomTempItems.length +
    fragileItems.length +
    standardKitItems.length +
    mustBringEquipment.length +
    eventEquipment.length +
    data.servicewareItems.length +
    data.personalGear.length

  if (totalItems > 30) pdf.setFontScale(0.85)
  if (totalItems > 45) pdf.setFontScale(0.75)

  pdf.title('PACKING LIST', 14)

  const dateStr = format(
    parseISO(dateToDateString(event.event_date as Date | string)),
    'EEE, MMM d, yyyy'
  )
  pdf.headerBar([
    ['Event', event.occasion || 'Service'],
    ['Date', dateStr],
    ['Client', clientName],
    ['Covers', String(data.guestCount)],
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

  if (data.allergies.length > 0) {
    pdf.warningBox(`* ALLERGY ALERT: ${data.allergies.map((a) => a.toUpperCase()).join(', ')}`)
  }

  pdf.space(2)

  // ─── Food sections ────────────────────────────────────────────────────────

  if (coldItems.length > 0) {
    pdf.sectionHeader('COOLER - COLD ITEMS', 11, true)
    for (const item of coldItems) {
      const label = item.storage_notes ? `${item.name} - ${item.storage_notes}` : item.name
      pdf.checkbox(label, 9, `C${item.course_number}`)
    }
    pdf.space(1)
  }

  if (frozenItems.length > 0) {
    pdf.sectionHeader('COOLER - FROZEN (pack last, on top)', 11, true)
    for (const item of frozenItems) {
      const label = item.storage_notes ? `${item.name} - ${item.storage_notes}` : item.name
      pdf.checkbox(label, 9, `C${item.course_number}`)
    }
    pdf.space(1)
  }

  if (roomTempItems.length > 0) {
    pdf.sectionHeader('DRY BAG - ROOM TEMP', 11, true)
    for (const item of roomTempItems) {
      const label = item.storage_notes ? `${item.name} - ${item.storage_notes}` : item.name
      pdf.checkbox(label, 9, `C${item.course_number}`)
    }
    pdf.space(1)
  }

  if (fragileItems.length > 0) {
    pdf.sectionHeader('FRAGILE - own padded container, nothing stacked on top', 11, true)
    for (const item of fragileItems) {
      const label = item.storage_notes ? `${item.name} - ${item.storage_notes}` : item.name
      pdf.checkbox(label, 9, `C${item.course_number}`)
    }
    pdf.space(1)
  }

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

  // ─── Serviceware ──────────────────────────────────────────────────────────

  if (data.servicewareItems.length > 0) {
    pdf.sectionHeader('SERVICEWARE', 11, true)
    for (const item of data.servicewareItems) {
      pdf.checkbox(item, 9)
    }
    pdf.space(1)
  }

  // ─── Personal Gear ────────────────────────────────────────────────────────

  if (data.personalGear.length > 0) {
    pdf.sectionHeader('PERSONAL GEAR', 11, true)
    const byCategory = new Map<string, string[]>()
    for (const g of data.personalGear) {
      const list = byCategory.get(g.category) ?? []
      list.push(g.name)
      byCategory.set(g.category, list)
    }
    for (const cat of GEAR_CATEGORY_ORDER) {
      const items = byCategory.get(cat)
      if (items && items.length > 0) {
        pdf.text(GEAR_CATEGORY_LABELS[cat] ?? cat, 8, 'bold', 2)
        for (const item of items) {
          pdf.checkbox(item, 9)
        }
      }
    }
    pdf.space(1)
  }

  // ─── Component Verification ────────────────────────────────────────────────

  if (courseVerification.length > 0) {
    pdf.sectionHeader('COMPONENT VERIFICATION', 11, true)
    for (const { courseNumber, courseName, count } of courseVerification) {
      pdf.text(
        `Course ${courseNumber} - ${courseName}: ${count} item${count !== 1 ? 's' : ''}`,
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

export async function generatePackingList(
  eventId: string,
  generatedByName?: string
): Promise<Buffer> {
  const data = await fetchPackingListData(eventId)
  if (!data) throw new Error('Cannot generate packing list: event not found')

  const pdf = new PDFLayout()
  renderPackingList(pdf, data)
  if (generatedByName) pdf.generatedBy(generatedByName, 'Packing List')
  return pdf.toBuffer()
}
