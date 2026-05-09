'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getMenuById, getMenuEvent } from '@/lib/menus/actions'
import { getChefLayoutData } from '@/lib/chef/layout-cache'
import { mapToFOHMenuData, type FOHMenuData } from './foh-menu-data'

/**
 * Fetch fully normalized front-of-house menu data for a given menu.
 * Returns null if menu not found or unauthorized.
 */
export async function getFOHMenuData(menuId: string): Promise<FOHMenuData | null> {
  const user = await requireChef()
  if (!user.tenantId) return null

  const menu = await getMenuById(menuId)
  if (!menu) return null

  // Fetch event + chef data in parallel (non-critical)
  const [eventResult, chefData] = await Promise.all([
    getMenuEvent(menuId).catch(() => null),
    getChefLayoutData(user.tenantId).catch(() => null),
  ])

  // Extract event fields if available
  // getMenuEvent returns: { id, occasion, event_date, status, quoted_price_cents, clients: { full_name } }
  let event: Parameters<typeof mapToFOHMenuData>[0]['event'] = null
  if (eventResult) {
    const ev = eventResult as any
    const clientObj = ev.clients as { full_name?: string } | null
    event = {
      occasion: ev.occasion ?? null,
      event_date: ev.event_date ?? null,
      guest_count: ev.guest_count ?? null,
      client_name: clientObj?.full_name ?? null,
    }
  }

  return mapToFOHMenuData({
    menu: menu as any,
    event,
    chefName: chefData?.business_name ?? null,
    tagline: chefData?.tagline ?? null,
  })
}
