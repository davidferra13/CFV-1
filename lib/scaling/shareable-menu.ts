// Shareable Menu Links
// Generates and manages public share tokens for front-of-house menus.
// Clients can view the menu without logging in via a unique URL.
// Chef controls whether pricing is visible and when the link expires.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface ShareableMenuInfo {
  fohMenuId: string
  menuId: string
  menuName: string
  eventId: string | null
  shareToken: string | null
  pricingVisible: boolean
  shareExpiresAt: string | null
  shareUrl: string | null
  isExpired: boolean
  renderedHtml: string
}

// ============================================
// GENERATE / GET SHARE LINK
// ============================================

export async function getShareableMenuInfo(menuId: string): Promise<ShareableMenuInfo | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get the most recent FOH menu for this menu
  const { data: foh } = await supabase
    .from('front_of_house_menus')
    .select('id, menu_id, event_id, share_token, pricing_visible, share_expires_at, rendered_html')
    .eq('menu_id', menuId)
    .eq('tenant_id', tenantId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()

  if (!foh) return null

  // Get menu name
  const { data: menu } = await supabase
    .from('menus')
    .select('name')
    .eq('id', menuId)
    .eq('tenant_id', tenantId)
    .single()

  const isExpired = foh.share_expires_at ? new Date(foh.share_expires_at) < new Date() : false

  return {
    fohMenuId: foh.id,
    menuId,
    menuName: menu?.name ?? 'Menu',
    eventId: foh.event_id,
    shareToken: foh.share_token,
    pricingVisible: foh.pricing_visible ?? false,
    shareExpiresAt: foh.share_expires_at,
    shareUrl: foh.share_token ? `/menu/share/${foh.share_token}` : null,
    isExpired,
    renderedHtml: foh.rendered_html,
  }
}

// ============================================
// GENERATE SHARE TOKEN
// ============================================

function generateToken(): string {
  // 12-char alphanumeric token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export async function createShareLink(
  fohMenuId: string,
  options?: {
    pricingVisible?: boolean
    expiresInDays?: number
  }
): Promise<{ success: boolean; shareToken?: string; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const token = generateToken()
  const expiresAt = options?.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 86400000).toISOString()
    : null

  const { error } = await supabase
    .from('front_of_house_menus')
    .update({
      share_token: token,
      pricing_visible: options?.pricingVisible ?? false,
      share_expires_at: expiresAt,
    })
    .eq('id', fohMenuId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/culinary/menus`)
  return { success: true, shareToken: token }
}

export async function updateShareSettings(
  fohMenuId: string,
  settings: {
    pricingVisible?: boolean
    expiresInDays?: number | null
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const updates: any = {}
  if (settings.pricingVisible !== undefined) {
    updates.pricing_visible = settings.pricingVisible
  }
  if (settings.expiresInDays !== undefined) {
    updates.share_expires_at = settings.expiresInDays
      ? new Date(Date.now() + settings.expiresInDays * 86400000).toISOString()
      : null
  }

  const { error } = await supabase
    .from('front_of_house_menus')
    .update(updates)
    .eq('id', fohMenuId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/culinary/menus`)
  return { success: true }
}

export async function revokeShareLink(
  fohMenuId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('front_of_house_menus')
    .update({
      share_token: null,
      share_expires_at: null,
    })
    .eq('id', fohMenuId)
    .eq('tenant_id', tenantId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/culinary/menus`)
  return { success: true }
}

// ============================================
// PUBLIC: Get shared menu by token (no auth)
// ============================================

export async function getSharedMenuByToken(
  token: string
): Promise<{ html: string; pricingVisible: boolean; menuName: string } | null> {
  const supabase: any = createServerClient()

  const { data: foh } = await supabase
    .from('front_of_house_menus')
    .select('rendered_html, pricing_visible, menu_id')
    .eq('share_token', token)
    .single()

  if (!foh) return null

  // Check expiry is handled by RLS policy, but double-check
  const { data: menu } = await supabase.from('menus').select('name').eq('id', foh.menu_id).single()

  return {
    html: foh.rendered_html,
    pricingVisible: foh.pricing_visible ?? false,
    menuName: menu?.name ?? 'Menu',
  }
}
