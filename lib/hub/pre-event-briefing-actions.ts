'use server'

import { createServerClient } from '@/lib/supabase/server'
import { getCircleForEvent, getChefHubProfileId } from './circle-lookup'
import { generatePreEventBriefing } from '@/lib/templates/pre-event-briefing'

// ---------------------------------------------------------------------------
// Pre-Event Briefing Actions
// Posts a pre-event briefing to the Dinner Circle. Loads event, menu, client,
// chef, and service config to build the deterministic briefing message.
// ---------------------------------------------------------------------------

export async function postPreEventBriefing(input: {
  eventId: string
  tenantId: string
}): Promise<{ success: boolean; error?: string }> {
  const circle = await getCircleForEvent(input.eventId)
  if (!circle) {
    return { success: false, error: 'No Dinner Circle found for this event' }
  }

  const chefProfileId = await getChefHubProfileId(input.tenantId)
  if (!chefProfileId) {
    return { success: false, error: 'Chef hub profile not found' }
  }

  const supabase = createServerClient({ admin: true })

  // Load event + client + chef + menu in parallel
  const [eventResult, chefResult] = await Promise.all([
    supabase
      .from('events')
      .select(
        'event_date, serve_time, arrival_time, occasion, guest_count, location_name, location_address, client_id'
      )
      .eq('id', input.eventId)
      .eq('tenant_id', input.tenantId)
      .single(),
    supabase.from('chefs').select('display_name, business_name').eq('id', input.tenantId).single(),
  ])

  const event = eventResult.data
  const chef = chefResult.data

  if (!event) {
    return { success: false, error: 'Event not found' }
  }

  // Load client name
  const { data: client } = await supabase
    .from('clients')
    .select('full_name')
    .eq('id', event.client_id)
    .single()

  // Load linked menu with courses and top dishes
  const { data: menu } = await supabase
    .from('menus')
    .select('id, name')
    .eq('event_id', input.eventId)
    .eq('tenant_id', input.tenantId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let courseHighlights: string[] = []
  if (menu) {
    const { data: courses } = await supabase
      .from('menu_courses')
      .select('id, name')
      .eq('menu_id', menu.id)
      .order('display_order', { ascending: true })

    for (const course of courses ?? []) {
      const { data: dishes } = await supabase
        .from('menu_dishes')
        .select('name')
        .eq('course_id', course.id)
        .order('display_order', { ascending: true })
        .limit(2)

      const dishNames = (dishes ?? []).map((d: { name: string }) => d.name).join(', ')
      if (dishNames) {
        courseHighlights.push(`${course.name}: ${dishNames}`)
      }
    }
  }

  // Load dietary restrictions from event or inquiry
  let dietaryConfirmed: string[] = []
  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('confirmed_dietary_restrictions')
    .eq('converted_to_event_id', input.eventId)
    .limit(1)
    .maybeSingle()

  if (inquiry?.confirmed_dietary_restrictions) {
    dietaryConfirmed = inquiry.confirmed_dietary_restrictions
  }

  // Build "what to have ready" from service config
  let whatToHaveReady: string[] = []
  try {
    const { getServiceConfigForTenant } = await import('@/lib/chef-services/service-config-actions')
    const config = await getServiceConfigForTenant(input.tenantId)
    if (config) {
      if (config.requires_oven) whatToHaveReady.push('Oven available and working')
      if (config.requires_stovetop) whatToHaveReady.push('Stovetop available')
      if (config.requires_grill) whatToHaveReady.push('Grill available and preheated')
    }
  } catch {
    // Non-fatal
  }

  const chefName = chef?.display_name || chef?.business_name || 'Chef'
  const chefFirstName = chefName.split(' ')[0]

  const { body } = generatePreEventBriefing({
    clientName: client?.full_name || 'there',
    chefFirstName,
    eventDate: event.event_date || 'your event',
    eventTime: event.serve_time ?? null,
    arrivalTime: event.arrival_time ?? null,
    location: event.location_name || event.location_address || null,
    guestCount: event.guest_count ?? null,
    menuName: menu?.name ?? null,
    courseHighlights,
    dietaryConfirmed,
    whatToHaveReady,
  })

  // Post to circle
  await supabase.from('hub_messages').insert({
    group_id: circle.groupId,
    author_profile_id: chefProfileId,
    message_type: 'text',
    body,
    metadata: {
      system_event_type: 'pre_event_briefing',
      event_id: input.eventId,
    },
  })

  return { success: true }
}
