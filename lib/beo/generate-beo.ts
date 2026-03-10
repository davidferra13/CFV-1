'use server'

// BEO (Banquet Event Order) Generator
// Assembles all event data into a structured BEO object.
// Two modes: full (with financials) and kitchen-only (for staff, no pricing).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import type { BEOData, BEOCourse, BEOStaffMember, BEOFinancials } from './types'

// Re-export types for consumers
export type {
  BEOData,
  BEODish,
  BEOCourse,
  BEOStaffMember,
  BEOFinancials,
  BEOTimeline,
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

    generatedAt: new Date().toISOString(),
    version: options.includeFinancials ? 'full' : 'kitchen',
  }
}
