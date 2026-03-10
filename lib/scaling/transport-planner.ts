// Transport & Logistics Planner
// Reads from existing event_travel_legs table.
// Computes load estimates from menu components, suggests cooler needs,
// and summarizes the logistics plan for an event.
// Pure read + math, no AI.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ============================================
// TYPES
// ============================================

export interface TravelLeg {
  id: string
  legType: string
  legDate: string | null
  departureTime: string | null
  estimatedReturnTime: string | null
  originLabel: string | null
  originAddress: string | null
  destinationLabel: string | null
  destinationAddress: string | null
  stops: TravelStop[]
  totalDriveMinutes: number | null
  totalStopMinutes: number | null
  totalEstimatedMinutes: number | null
  purposeNotes: string | null
  status: string
}

export interface TravelStop {
  order: number
  name: string
  address: string
  purpose: string
  estimatedMinutes: number
  notes: string | null
}

export interface LoadEstimate {
  // Estimated from menu components
  totalComponents: number
  hotItems: number
  coldItems: number
  roomTempItems: number
  // Equipment count from assignments
  equipmentCount: number
  // Rough categorization
  needsCoolers: boolean
  needsHotHolding: boolean
  serviceStyle: string | null
}

export interface TransportPlan {
  eventId: string
  eventDate: string | null
  eventAddress: string | null
  serveTime: string | null
  // Travel legs
  legs: TravelLeg[]
  totalLegs: number
  totalDriveMinutes: number
  totalStopMinutes: number
  // Load estimate
  loadEstimate: LoadEstimate
  // Timing
  suggestedDepartureTime: string | null
  arrivalBufferMinutes: number
}

// ============================================
// CORE: Get transport plan for an event
// ============================================

export async function getTransportPlan(eventId: string): Promise<TransportPlan> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  // 1. Get event details
  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, event_date, location_address, location_city, location_state,
      serve_time, arrival_time, service_style, guest_count
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', chefId)
    .single()

  if (!event) {
    return emptyPlan(eventId)
  }

  const eventAddress = [event.location_address, event.location_city, event.location_state]
    .filter(Boolean)
    .join(', ')

  // 2. Get travel legs
  const { data: legs } = await supabase
    .from('event_travel_legs')
    .select('*')
    .or(`primary_event_id.eq.${eventId},linked_event_ids.cs.{${eventId}}`)
    .eq('chef_id', chefId)
    .order('leg_date', { ascending: true })

  const mappedLegs: TravelLeg[] = (legs || []).map((leg: any) => ({
    id: leg.id,
    legType: leg.leg_type,
    legDate: leg.leg_date,
    departureTime: leg.departure_time,
    estimatedReturnTime: leg.estimated_return_time,
    originLabel: leg.origin_label,
    originAddress: leg.origin_address,
    destinationLabel: leg.destination_label,
    destinationAddress: leg.destination_address,
    stops: (leg.stops || []).map((s: any) => ({
      order: s.order ?? 0,
      name: s.name ?? '',
      address: s.address ?? '',
      purpose: s.purpose ?? '',
      estimatedMinutes: s.estimated_minutes ?? 0,
      notes: s.notes ?? null,
    })),
    totalDriveMinutes: leg.total_drive_minutes,
    totalStopMinutes: leg.total_stop_minutes,
    totalEstimatedMinutes: leg.total_estimated_minutes,
    purposeNotes: leg.purpose_notes,
    status: leg.status,
  }))

  const totalDrive = mappedLegs.reduce((sum, l) => sum + (l.totalDriveMinutes || 0), 0)
  const totalStops = mappedLegs.reduce((sum, l) => sum + (l.totalStopMinutes || 0), 0)

  // 3. Load estimate from menu components
  const loadEstimate = await estimateLoad(supabase, eventId, chefId, event.service_style)

  // 4. Suggested departure time
  let suggestedDeparture: string | null = null
  const arrivalBuffer = 60 // 1 hour buffer for setup

  if (event.serve_time) {
    const serveTimeParts = event.serve_time.split(':')
    const serveHour = parseInt(serveTimeParts[0])
    const serveMin = parseInt(serveTimeParts[1] || '0')
    const totalServeMinutes = serveHour * 60 + serveMin

    // Subtract: drive time + setup buffer
    const serviceLeg = mappedLegs.find((l) => l.legType === 'service_travel')
    const driveToVenue = serviceLeg?.totalDriveMinutes || 30 // default 30 min
    const departureMinutes = totalServeMinutes - driveToVenue - arrivalBuffer

    if (departureMinutes > 0) {
      const depHour = Math.floor(departureMinutes / 60)
      const depMin = departureMinutes % 60
      const ampm = depHour >= 12 ? 'PM' : 'AM'
      const hour12 = depHour % 12 || 12
      suggestedDeparture =
        depMin === 0
          ? `${hour12} ${ampm}`
          : `${hour12}:${depMin.toString().padStart(2, '0')} ${ampm}`
    }
  }

  return {
    eventId,
    eventDate: event.event_date,
    eventAddress: eventAddress || null,
    serveTime: event.serve_time,
    legs: mappedLegs,
    totalLegs: mappedLegs.length,
    totalDriveMinutes: totalDrive,
    totalStopMinutes: totalStops,
    loadEstimate,
    suggestedDepartureTime: suggestedDeparture,
    arrivalBufferMinutes: arrivalBuffer,
  }
}

// ============================================
// LOAD ESTIMATION
// ============================================

async function estimateLoad(
  supabase: any,
  eventId: string,
  chefId: string,
  serviceStyle: string | null
): Promise<LoadEstimate> {
  // Get menu for this event
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', chefId)
    .limit(1)

  if (!menus || menus.length === 0) {
    return {
      totalComponents: 0,
      hotItems: 0,
      coldItems: 0,
      roomTempItems: 0,
      equipmentCount: 0,
      needsCoolers: false,
      needsHotHolding: false,
      serviceStyle,
    }
  }

  const menuId = menus[0].id

  // Get dishes and components
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id')
    .eq('menu_id', menuId)
    .eq('tenant_id', chefId)

  const dishIds = (dishes || []).map((d: any) => d.id)

  let components: any[] = []
  if (dishIds.length > 0) {
    const { data: comps } = await supabase
      .from('components')
      .select('id, category, storage_notes')
      .in('dish_id', dishIds)
      .eq('tenant_id', chefId)

    components = comps || []
  }

  // Categorize by temperature needs based on category
  const coldCategories = ['dairy', 'protein', 'cheese', 'beverage']
  const hotCategories = ['sauce']
  // Most items are room temp safe for transport (bread, garnish, etc.)

  let hot = 0
  let cold = 0
  let roomTemp = 0

  for (const comp of components) {
    const cat = comp.category?.toLowerCase() || ''
    const notes = (comp.storage_notes || '').toLowerCase()

    if (
      notes.includes('cold') ||
      notes.includes('refrigerat') ||
      notes.includes('ice') ||
      coldCategories.includes(cat)
    ) {
      cold++
    } else if (notes.includes('hot') || notes.includes('warm') || hotCategories.includes(cat)) {
      hot++
    } else {
      roomTemp++
    }
  }

  // Equipment count
  const { count: equipmentCount } = await supabase
    .from('event_equipment_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('chef_id', chefId)

  return {
    totalComponents: components.length,
    hotItems: hot,
    coldItems: cold,
    roomTempItems: roomTemp,
    equipmentCount: equipmentCount || 0,
    needsCoolers: cold > 0,
    needsHotHolding: hot > 0,
    serviceStyle,
  }
}

// ============================================
// HELPERS
// ============================================

function emptyPlan(eventId: string): TransportPlan {
  return {
    eventId,
    eventDate: null,
    eventAddress: null,
    serveTime: null,
    legs: [],
    totalLegs: 0,
    totalDriveMinutes: 0,
    totalStopMinutes: 0,
    loadEstimate: {
      totalComponents: 0,
      hotItems: 0,
      coldItems: 0,
      roomTempItems: 0,
      equipmentCount: 0,
      needsCoolers: false,
      needsHotHolding: false,
      serviceStyle: null,
    },
    suggestedDepartureTime: null,
    arrivalBufferMinutes: 60,
  }
}
