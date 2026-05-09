'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/db/admin'
import { createServerClient } from '@/lib/db/server'
import { mapToFOHMenuData, type FOHMenuData } from './foh-menu-data'

/**
 * Create a shareable public link for a menu's front-of-house view.
 * Auth-gated: only the owning chef can create share links.
 */
export async function createMenuShareLink(menuId: string): Promise<{ token: string; url: string }> {
  const user = await requireChef()
  if (!user.tenantId) throw new Error('No tenant')

  const db: any = createServerClient()

  // Verify menu belongs to this chef
  const { data: menu, error: menuError } = await db
    .from('menus')
    .select('id')
    .eq('id', menuId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (menuError || !menu) throw new Error('Menu not found')

  // Create share token
  const { data: tokenRow, error: insertError } = await db
    .from('menu_share_tokens')
    .insert({
      menu_id: menuId,
      chef_id: user.tenantId,
    })
    .select('token')
    .single()

  if (insertError || !tokenRow) {
    throw new Error('Failed to create share link')
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  return {
    token: tokenRow.token,
    url: `${baseUrl}/menu/${tokenRow.token}`,
  }
}

/**
 * Fetch FOH menu data by public share token. No auth required.
 * Returns null if token is invalid, expired, or menu not found.
 */
export async function getFOHMenuDataByToken(
  token: string
): Promise<(FOHMenuData & { menuId: string }) | null> {
  if (!token || typeof token !== 'string') return null

  const db: any = createAdminClient()

  // Look up token
  const { data: tokenRow, error: tokenError } = await db
    .from('menu_share_tokens')
    .select('id, menu_id, chef_id, expires_at')
    .eq('token', token)
    .single()

  if (tokenError || !tokenRow) return null

  // Check expiry
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return null
  }

  // Fetch menu
  const { data: menu, error: menuError } = await db
    .from('menus')
    .select('*')
    .eq('id', tokenRow.menu_id)
    .eq('tenant_id', tokenRow.chef_id)
    .single()

  if (menuError || !menu) return null

  // Fetch dishes
  const { data: dishes } = await db
    .from('dishes')
    .select('*')
    .eq('menu_id', tokenRow.menu_id)
    .eq('tenant_id', tokenRow.chef_id)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  // Fetch event if menu has one
  let event: Parameters<typeof mapToFOHMenuData>[0]['event'] = null
  if (menu.event_id) {
    const { data: ev } = await db
      .from('events')
      .select('id, occasion, event_date, guest_count, clients(full_name)')
      .eq('id', menu.event_id)
      .single()

    if (ev) {
      const clientObj = ev.clients as { full_name?: string } | null
      event = {
        occasion: ev.occasion ?? null,
        event_date: ev.event_date ?? null,
        guest_count: ev.guest_count ?? null,
        client_name: clientObj?.full_name ?? null,
      }
    }
  }

  // Fetch chef name
  const { data: chef } = await db
    .from('chefs')
    .select('business_name, tagline')
    .eq('id', tokenRow.chef_id)
    .single()

  const menuWithDishes = {
    ...menu,
    dishes: dishes || [],
  }

  const fohData = mapToFOHMenuData({
    menu: menuWithDishes as any,
    event,
    chefName: chef?.business_name ?? null,
    tagline: chef?.tagline ?? null,
  })

  return { ...fohData, menuId: tokenRow.menu_id }
}
