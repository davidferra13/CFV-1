'use server'

// BEO (Banquet Event Order) Generator
// Assembles all event data into a structured BEO object.
// Two modes: full (with financials) and kitchen-only (for staff, no pricing).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import type {
  BEOData,
  BEOCourse,
  BEOStaffMember,
  BEOFinancials,
  BEOEquipmentItem,
  BEOVendorDelivery,
  BEOStationAssignment,
  BEOBreakdownTask,
} from './types'

// Re-export types for consumers
export type {
  BEOData,
  BEODish,
  BEOCourse,
  BEOStaffMember,
  BEOFinancials,
  BEOTimeline,
  BEOEquipmentItem,
  BEOVendorDelivery,
  BEOStationAssignment,
  BEOBreakdownTask,
} from './types'

// ─── generateBEO ──────────────────────────────────────────────────────────────

export async function generateBEO(
  eventId: string,
  options: { includeFinancials: boolean } = { includeFinancials: true }
): Promise<BEOData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event with client data
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      `
      *,
      client:clients(id, full_name, email, phone)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .is('deleted_at' as any, null)
    .single()

  if (eventError || !event) return null

  // Fetch chef info
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone')
    .eq('id', user.tenantId!)
    .single()

  // Fetch menu and dishes
  let menuName: string | null = null
  let menuDescription: string | null = null
  let isSimpleMenu = false
  let simpleMenuContent: string | null = null
  let courses: BEOCourse[] = []

  if (event.menu_id) {
    const { data: menu } = await supabase
      .from('menus')
      .select('id, name, description, simple_mode, simple_mode_content')
      .eq('id', event.menu_id)
      .single()

    if (menu) {
      menuName = menu.name
      menuDescription = menu.description
      isSimpleMenu = menu.simple_mode
      simpleMenuContent = menu.simple_mode_content

      if (!menu.simple_mode) {
        // Fetch structured dishes
        const { data: dishes } = await supabase
          .from('dishes')
          .select('*')
          .eq('menu_id', menu.id)
          .order('course_number', { ascending: true })
          .order('sort_order', { ascending: true })

        if (dishes && dishes.length > 0) {
          // Group dishes by course
          const courseMap = new Map<number, BEOCourse>()
          for (const dish of dishes) {
            if (!courseMap.has(dish.course_number)) {
              courseMap.set(dish.course_number, {
                name: dish.course_name,
                number: dish.course_number,
                dishes: [],
              })
            }
            courseMap.get(dish.course_number)!.dishes.push({
              name: dish.name,
              description: dish.description,
              courseName: dish.course_name,
              courseNumber: dish.course_number,
              dietaryTags: dish.dietary_tags || [],
              allergenFlags: dish.allergen_flags || [],
              chefNotes: dish.chef_notes,
              platingInstructions: dish.plating_instructions,
              sortOrder: dish.sort_order,
            })
          }
          courses = Array.from(courseMap.values()).sort((a, b) => a.number - b.number)
        }
      }
    }
  }

  // Fetch staff assignments
  const { data: staffData } = await supabase
    .from('event_staff_assignments')
    .select(
      `
      *,
      staff_members (name, role, phone)
    `
    )
    .eq('event_id', eventId)
    .eq('chef_id', user.tenantId!)

  const staff: BEOStaffMember[] = (staffData || [])
    .filter((a: any) => a.staff_members)
    .map((a: any) => ({
      name: a.staff_members.name,
      role: a.staff_members.role || 'Staff',
      phone: a.staff_members.phone,
    }))

  // Fetch financials if requested
  let financials: BEOFinancials | null = null
  if (options.includeFinancials) {
    const { data: summary } = await supabase
      .from('event_financial_summary')
      .select('*')
      .eq('event_id', eventId)
      .single()

    financials = {
      quotedPriceCents: event.quoted_price_cents,
      depositAmountCents: event.deposit_amount_cents,
      totalPaidCents: summary?.total_paid_cents ?? 0,
      totalRefundedCents: summary?.total_refunded_cents ?? 0,
      outstandingBalanceCents: summary?.outstanding_balance_cents ?? 0,
      paymentStatus: event.payment_status || 'unpaid',
      tipAmountCents: summary?.tip_amount_cents ?? 0,
    }
  }

  // ── Enhanced BEO: Equipment Checklist (graceful if table doesn't exist) ──
  let equipmentChecklist: BEOEquipmentItem[] = []
  try {
    const { data: equipData } = await supabase
      .from('event_equipment_checklist')
      .select('item_name, quantity, source, category')
      .eq('event_id', eventId)
      .order('category')

    if (equipData) {
      equipmentChecklist = equipData.map((e: any) => ({
        name: e.item_name || e.name || 'Unknown',
        quantity: e.quantity ?? 1,
        source: e.source || 'In-house',
        category: e.category || 'General',
      }))
    }
  } catch (err) {
    // Table may not exist yet; BEO still generates
    console.warn('[generateBEO] Equipment checklist not available:', err)
  }

  // ── Enhanced BEO: Vendor Deliveries (graceful if table doesn't exist) ──
  let vendorDeliveries: BEOVendorDelivery[] = []
  try {
    const { data: vendorData } = await supabase
      .from('event_vendor_deliveries')
      .select('delivery_time, vendor_name, delivery_type, items, contact_info')
      .eq('event_id', eventId)
      .order('delivery_time')

    if (vendorData) {
      vendorDeliveries = vendorData.map((v: any) => ({
        deliveryTime: v.delivery_time || null,
        vendorName: v.vendor_name || 'Unknown Vendor',
        deliveryType: v.delivery_type || 'Delivery',
        items: v.items || '',
        contactInfo: v.contact_info || null,
      }))
    }
  } catch (err) {
    console.warn('[generateBEO] Vendor deliveries not available:', err)
  }

  // ── Enhanced BEO: Station Assignments (graceful if table doesn't exist) ──
  let stationAssignments: BEOStationAssignment[] = []
  try {
    const { data: stationData } = await supabase
      .from('event_station_assignments')
      .select('station_name, staff_name, role_notes')
      .eq('event_id', eventId)
      .order('station_name')

    if (stationData) {
      stationAssignments = stationData.map((s: any) => ({
        stationName: s.station_name || 'Unnamed Station',
        staffName: s.staff_name || 'Unassigned',
        roleNotes: s.role_notes || null,
      }))
    }
  } catch (err) {
    console.warn('[generateBEO] Station assignments not available:', err)
  }

  // ── Enhanced BEO: Breakdown Timeline (deterministic based on event type) ──
  const breakdownTimeline: BEOBreakdownTask[] = generateBreakdownTimeline(
    event.service_style,
    event.guest_count || 0,
    event.alcohol_being_served
  )

  const eventDate = event.event_date
  let formattedDate: string
  try {
    formattedDate = format(new Date(eventDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
  } catch {
    formattedDate = eventDate
  }

  return {
    eventId,
    eventName: event.occasion || 'Private Event',
    occasion: event.occasion,
    eventDate,
    formattedDate,
    serveTime: event.serve_time,
    serviceStyle: event.service_style,
    status: event.status,

    locationAddress: event.location_address || '',
    locationCity: event.location_city || '',
    locationState: event.location_state || '',
    locationZip: event.location_zip || '',
    locationNotes: event.location_notes,
    accessInstructions: event.access_instructions,

    client: {
      name: event.client?.full_name || 'Unknown Client',
      email: event.client?.email || '',
      phone: event.client?.phone || null,
    },
    guestCount: event.guest_count || 0,
    guestCountConfirmed: event.guest_count_confirmed || false,

    dietaryRestrictions: event.dietary_restrictions || [],
    allergies: event.allergies || [],

    menuName,
    menuDescription,
    isSimpleMenu,
    simpleMenuContent,
    courses,

    timeline: {
      arrivalTime: event.arrival_time,
      serveTime: event.serve_time,
      departureTime: event.departure_time,
      prepStartedAt: event.prep_started_at,
      serviceStartedAt: event.service_started_at,
      serviceCompletedAt: event.service_completed_at,
    },

    staff,

    specialRequests: event.special_requests,
    kitchenNotes: event.kitchen_notes,
    siteNotes: event.site_notes,

    alcoholBeingServed: event.alcohol_being_served,
    cannabisPreference: event.cannabis_preference,

    chef: {
      businessName: chef?.business_name || 'Chef',
      email: chef?.email || '',
      phone: chef?.phone || null,
    },

    financials,

    equipmentChecklist,
    vendorDeliveries,
    stationAssignments,
    breakdownTimeline,

    generatedAt: new Date().toISOString(),
    version: options.includeFinancials ? 'full' : 'kitchen',
  }
}

// ─── Breakdown Timeline Generator (deterministic) ────────────────────────────

function generateBreakdownTimeline(
  serviceStyle: string | null,
  guestCount: number,
  hasAlcohol: boolean | null
): BEOBreakdownTask[] {
  const tasks: BEOBreakdownTask[] = []
  let order = 1

  // Base minutes scale with guest count
  const scaleFactor = Math.max(1, Math.ceil(guestCount / 50))

  tasks.push({
    order: order++,
    task: 'Stop service, begin clearing tables',
    estimatedMinutes: 10,
    responsible: 'Servers',
  })

  tasks.push({
    order: order++,
    task: 'Clear and sort dishware, glassware, flatware',
    estimatedMinutes: 15 * scaleFactor,
    responsible: 'Dishwashers / Servers',
  })

  tasks.push({
    order: order++,
    task: 'Break down kitchen / cooking stations',
    estimatedMinutes: 20 * scaleFactor,
    responsible: 'Kitchen Staff',
  })

  tasks.push({
    order: order++,
    task: 'Clean cooking surfaces, equipment, and prep areas',
    estimatedMinutes: 15 * scaleFactor,
    responsible: 'Kitchen Staff',
  })

  if (hasAlcohol) {
    tasks.push({
      order: order++,
      task: 'Break down bar, secure remaining alcohol',
      estimatedMinutes: 15,
      responsible: 'Bartenders',
    })
  }

  if (serviceStyle === 'buffet' || serviceStyle === 'stations') {
    tasks.push({
      order: order++,
      task: 'Disassemble buffet / station displays',
      estimatedMinutes: 15 * scaleFactor,
      responsible: 'All Staff',
    })
  }

  tasks.push({
    order: order++,
    task: 'Pack and organize rental items for pickup',
    estimatedMinutes: 15,
    responsible: 'All Staff',
  })

  tasks.push({
    order: order++,
    task: 'Final floor sweep and trash removal',
    estimatedMinutes: 10,
    responsible: 'All Staff',
  })

  tasks.push({
    order: order++,
    task: 'Load out equipment and supplies to vehicles',
    estimatedMinutes: 20 * scaleFactor,
    responsible: 'All Staff',
  })

  tasks.push({
    order: order++,
    task: 'Final walkthrough and handoff with venue/client',
    estimatedMinutes: 10,
    responsible: 'Chef',
  })

  return tasks
}
