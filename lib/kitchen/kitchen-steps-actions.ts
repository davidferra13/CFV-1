'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface KitchenEventStep {
  id: string
  title: string
  description?: string
  completed: boolean
}

export interface KitchenEventContext {
  eventId: string
  eventTitle: string
  clientName: string | null
  eventDate: string
  startTime: string | null
  guestCount: number | null
  steps: KitchenEventStep[]
}

/**
 * Fetch kitchen mode context for today's most relevant event.
 * Returns in_progress events first, then confirmed events with today's date.
 * Steps are derived from menu items and the event's food prep checklist.
 */
export async function getKitchenModeContext(eventId?: string): Promise<KitchenEventContext | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const today = new Date().toISOString().split('T')[0]

  // Find the target event
  let targetEventId = eventId

  if (!targetEventId) {
    // Look for in_progress event first, then today's confirmed event
    const { data: events } = await db
      .from('events')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .in('status', ['in_progress', 'confirmed'])
      .gte('event_date', today)
      .lte('event_date', today)
      .order('status', { ascending: true }) // in_progress sorts before confirmed alphabetically... use limit
      .limit(10)

    if (!events?.length) return null

    // Prefer in_progress over confirmed
    const inProgress = (events as any[]).find((e) => e.status === 'in_progress')
    targetEventId = inProgress?.id ?? events[0].id
  }

  // Fetch event details
  const { data: event } = await db
    .from('events')
    .select('id, title, event_date, start_time, guest_count, status, occasion, client_id')
    .eq('id', targetEventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return null

  // Fetch client name
  let clientName: string | null = null
  if (event.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name')
      .eq('id', event.client_id)
      .eq('tenant_id', tenantId)
      .single()
    clientName = client?.full_name ?? null
  }

  // Fetch menu items for this event (via the event's linked menu)
  const { data: eventMenus } = await db
    .from('event_menus')
    .select('menu_id')
    .eq('event_id', targetEventId)
    .limit(1)

  const steps: KitchenEventStep[] = []

  if (eventMenus?.length) {
    const menuId = eventMenus[0].menu_id
    const { data: dishes } = await db
      .from('dishes')
      .select('id, name, description, course_number, course_name')
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .not('name', 'is', null)
      .order('course_number', { ascending: true })

    for (const item of (dishes ?? []) as any[]) {
      steps.push({
        id: `menu-${item.id}`,
        title: item.name,
        description: item.course_name
          ? `${item.course_name}${item.description ? ` - ${item.description}` : ''}`
          : (item.description ?? undefined),
        completed: false,
      })
    }
  }

  // If no menu items, generate generic service steps
  if (steps.length === 0) {
    const genericSteps = [
      { id: 'setup', title: 'Station setup complete' },
      { id: 'ingredients', title: 'Ingredients prepped and staged' },
      { id: 'equipment', title: 'Equipment checked and ready' },
      { id: 'service', title: 'Service in progress' },
      { id: 'cleanup', title: 'Post-service cleanup' },
    ]
    for (const s of genericSteps) {
      steps.push({ ...s, completed: false })
    }
  }

  return {
    eventId: event.id,
    eventTitle: event.title ?? event.occasion ?? 'Private Event',
    clientName,
    eventDate: event.event_date,
    startTime: event.start_time ?? null,
    guestCount: event.guest_count ?? null,
    steps,
  }
}
