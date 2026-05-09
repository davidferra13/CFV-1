'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { mapToFOHMenuData, type FOHMenuData } from './foh-menu-data'
import { getChefLayoutData } from '@/lib/chef/layout-cache'

/**
 * Fetch FOH menu data scoped to the authenticated client.
 * Validates the client owns the event before returning data.
 * Returns null if not found, unauthorized, or no menu attached.
 */
export async function getFOHMenuDataForClient(eventId: string): Promise<FOHMenuData | null> {
  const user = await requireClient()
  if (!user.entityId) return null

  const db: any = createServerClient()

  // Fetch event, verifying client ownership
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, service_style, tenant_id,
      client:clients!inner(full_name)
    `
    )
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) return null

  // Fetch the first menu with dishes
  const { data: menus } = await db
    .from('menus')
    .select(
      `
      id, name, description, service_style, cuisine_type,
      target_guest_count, notes, simple_mode, simple_mode_content,
      dishes (
        course_name, course_number, name, description,
        dietary_tags, allergen_flags, beverage_pairing, sort_order
      )
    `
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (!menus || menus.length === 0) return null

  const menu = menus[0]
  if (!menu.dishes || menu.dishes.length === 0) return null

  // Sort dishes by course_number then sort_order
  const sortedDishes = [...menu.dishes].sort((a: any, b: any) => {
    if (a.course_number !== b.course_number) return a.course_number - b.course_number
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  // Fetch chef branding
  const chefData = await getChefLayoutData(event.tenant_id).catch(() => null)

  const clientObj = event.client as { full_name?: string } | null

  return mapToFOHMenuData({
    menu: {
      ...menu,
      dishes: sortedDishes,
    },
    event: {
      occasion: event.occasion ?? null,
      event_date: event.event_date ?? null,
      guest_count: event.guest_count ?? null,
      client_name: clientObj?.full_name ?? null,
    },
    chefName: chefData?.business_name ?? null,
    tagline: chefData?.tagline ?? null,
  })
}
