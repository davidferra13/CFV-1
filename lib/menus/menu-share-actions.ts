'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { checkRateLimit } from '@/lib/rateLimit'

// ─── Types ───────────────────────────────────────────────────────

export type MenuSelectionToken = {
  id: string
  eventId: string
  tenantId: string
  token: string
  label: string | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
}

export type PublicMenuData = {
  eventOccasion: string | null
  eventDate: string | null
  chefName: string | null
  chefSlug: string | null
  menuName: string | null
  dishes: Array<{
    id: string
    name: string
    description: string | null
    course: string | null
  }>
}

export type TokenMenuSelection = {
  id: string
  submitterName: string | null
  menuTokenId: string
  specialRequests: string | null
  submittedAt: string
  tokenLabel: string | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreateTokenSchema = z.object({
  eventId: z.string().uuid(),
  label: z.string().optional(),
})

const SubmitSelectionsSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, 'Name is required'),
  dishIds: z.array(z.string().uuid()).min(1, 'Select at least one dish'),
  notes: z.string().optional(),
})

// ─── Chef Actions (authenticated) ───────────────────────────────

export async function createMenuSelectionToken(
  eventId: string,
  label?: string
): Promise<{ token: string; url: string }> {
  const user = await requireChef()
  const parsed = CreateTokenSchema.parse({ eventId, label })
  const db: any = createServerClient()

  // Verify event belongs to chef and has a menu
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, menu_id')
    .eq('id', parsed.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')
  if (!event.menu_id) throw new Error('Event has no menu assigned. Assign a menu first.')

  const { data, error } = await db
    .from('menu_selection_tokens')
    .insert({
      event_id: parsed.eventId,
      tenant_id: user.tenantId!,
      label: parsed.label || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create share token: ${error.message}`)

  revalidatePath(`/events/${parsed.eventId}`)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  return {
    token: data.token,
    url: `${baseUrl}/menu-pick/${data.token}`,
  }
}

export async function getMenuSelectionTokens(eventId: string): Promise<MenuSelectionToken[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_selection_tokens')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) return []

  return (data || []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    tenantId: row.tenant_id,
    token: row.token,
    label: row.label,
    isActive: row.is_active,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }))
}

export async function deactivateMenuSelectionToken(tokenId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('menu_selection_tokens')
    .update({ is_active: false })
    .eq('id', tokenId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath('/')
}

export async function getTokenMenuSelections(eventId: string): Promise<TokenMenuSelection[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('menu_preferences')
    .select('id, submitter_name, menu_token_id, special_requests, submitted_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .not('menu_token_id', 'is', null)
    .order('submitted_at', { ascending: false })

  if (error || !data) return []

  // Get token labels
  const tokenIds = [...new Set(data.map((r: any) => r.menu_token_id))]
  const { data: tokens } = await db
    .from('menu_selection_tokens')
    .select('id, label')
    .in('id', tokenIds)

  const tokenMap = new Map((tokens || []).map((t: any) => [t.id, t.label]))

  return data.map((row: any) => ({
    id: row.id,
    submitterName: row.submitter_name,
    menuTokenId: row.menu_token_id,
    specialRequests: row.special_requests,
    submittedAt: row.submitted_at,
    tokenLabel: tokenMap.get(row.menu_token_id) || null,
  }))
}

// ─── Public Actions (no auth, token-gated) ──────────────────────

export async function getMenuByToken(token: string): Promise<PublicMenuData | null> {
  const db: any = createAdminClient()

  const { data: tokenRow, error } = await db
    .from('menu_selection_tokens')
    .select('id, event_id, tenant_id, is_active, expires_at')
    .eq('token', token)
    .single()

  if (error || !tokenRow) return null
  if (!tokenRow.is_active) return null
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) return null

  // Get event
  const { data: event } = await db
    .from('events')
    .select('id, occasion, event_date, menu_id')
    .eq('id', tokenRow.event_id)
    .eq('tenant_id', tokenRow.tenant_id)
    .single()

  if (!event || !event.menu_id) return null

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name, booking_slug')
    .eq('id', tokenRow.tenant_id)
    .single()

  // Get menu + dishes
  const { data: menu } = await db.from('menus').select('id, name').eq('id', event.menu_id).single()

  if (!menu) return null

  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, description, course_name')
    .eq('menu_id', menu.id)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  return {
    eventOccasion: event.occasion,
    eventDate: event.event_date,
    chefName: chef?.business_name || chef?.display_name || null,
    chefSlug: chef?.booking_slug || null,
    menuName: menu.name,
    dishes: (dishes || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      course: d.course_name,
    })),
  }
}

export async function submitTokenMenuSelections(input: {
  token: string
  name: string
  dishIds: string[]
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`menu-pick:${ip}`, 30, 15 * 60 * 1000)
  } catch {
    return { success: false, error: 'Too many submissions. Please try again later.' }
  }

  const parsed = SubmitSelectionsSchema.parse(input)
  const db: any = createAdminClient()

  // Validate token
  const { data: tokenRow, error: tokenError } = await db
    .from('menu_selection_tokens')
    .select('id, event_id, tenant_id, is_active, expires_at')
    .eq('token', parsed.token)
    .single()

  if (tokenError || !tokenRow) return { success: false, error: 'Invalid link' }
  if (!tokenRow.is_active) return { success: false, error: 'This link is no longer active' }
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return { success: false, error: 'This link has expired' }
  }

  const { data: eventRow, error: eventError } = await db
    .from('events')
    .select('id, menu_id')
    .eq('id', tokenRow.event_id)
    .eq('tenant_id', tokenRow.tenant_id)
    .single()

  if (eventError || !eventRow?.menu_id) {
    return { success: false, error: 'This menu is no longer available' }
  }

  const { data: selectedDishes, error: selectedDishesError } = await db
    .from('dishes')
    .select('id, name, course_name, course_number, sort_order')
    .eq('menu_id', eventRow.menu_id)
    .in('id', parsed.dishIds)
    .order('course_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (selectedDishesError) {
    console.error('[submitTokenMenuSelections] Dish lookup failed:', selectedDishesError)
    return { success: false, error: 'Failed to verify selections. Please try again.' }
  }

  const selectedDishNames = (selectedDishes || []).map((dish: any) => String(dish.name || '').trim()).filter(Boolean)
  if (selectedDishNames.length !== parsed.dishIds.length) {
    return { success: false, error: 'One or more selected dishes are no longer available.' }
  }

  const specialRequests = [
    `Selected dishes:\n${selectedDishNames.map((name: string) => `- ${name}`).join('\n')}`,
    parsed.notes ? `Notes:\n${parsed.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  // Write to menu_preferences with token reference, no client_id
  const { error: insertError } = await db.from('menu_preferences').insert({
    event_id: tokenRow.event_id,
    tenant_id: tokenRow.tenant_id,
    menu_token_id: tokenRow.id,
    submitter_name: parsed.name,
    special_requests: specialRequests,
    selection_mode: 'picked',
    adventurousness: 'balanced',
    submitted_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error('[submitTokenMenuSelections] Insert failed:', insertError)
    return { success: false, error: 'Failed to save selections. Please try again.' }
  }

  // Non-blocking: notify chef
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefAuthId = await getChefAuthUserId(tokenRow.tenant_id)
    if (chefAuthId) {
      await createNotification({
        tenantId: tokenRow.tenant_id,
        recipientId: chefAuthId,
        category: 'event',
        action: 'menu_preferences_submitted',
        title: 'Menu picks received',
        body: `${parsed.name} submitted their menu selections`,
        eventId: tokenRow.event_id,
      })
    }
  } catch (err) {
    console.error('[submitTokenMenuSelections] Notification failed (non-blocking):', err)
  }

  return { success: true }
}
