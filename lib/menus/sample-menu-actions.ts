// Sample Menu Quick-Send Actions
// One-click flow: filter templates by occasion/season, chef picks menus, sends to client.
// Client selection auto-creates quote draft.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SampleMenu {
  id: string
  title: string
  description: string | null
  occasion: string | null
  season: string | null
  pricePerPersonCents: number | null
  courseCount: number
  shareToken: string | null
}

export interface SentSampleMenus {
  inquiryId: string
  menuIds: string[]
  sentAt: string
}

// ---------------------------------------------------------------------------
// Get available sample menus (filtered by occasion/season)
// ---------------------------------------------------------------------------

export async function getAvailableSampleMenus(filters?: {
  occasion?: string
  season?: string
}): Promise<SampleMenu[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('menu_templates')
    .select('id, title, description, occasion, season, price_per_person_cents, share_token')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  if (filters?.occasion) {
    query = query.ilike('occasion', `%${filters.occasion}%`)
  }
  if (filters?.season) {
    query = query.ilike('season', `%${filters.season}%`)
  }

  const { data, error } = await query.limit(20)

  if (error || !data) return []

  return data.map((m: any) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    occasion: m.occasion,
    season: m.season,
    pricePerPersonCents: m.price_per_person_cents,
    courseCount: 0, // Would count from menu_template_items
    shareToken: m.share_token,
  }))
}

// ---------------------------------------------------------------------------
// Send sample menus to a client
// ---------------------------------------------------------------------------

export async function sendSampleMenus(
  inquiryId: string,
  menuIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (menuIds.length === 0) return { success: false, error: 'No menus selected' }
  if (menuIds.length > 5) return { success: false, error: 'Maximum 5 menus allowed' }

  const user = await requireChef()
  const chefId = user.tenantId!
  const db: any = createServerClient()

  // Get inquiry + client info
  const { data: inquiry, error: inqError } = await db
    .from('inquiries')
    .select('id, client_id, contact_name, contact_email')
    .eq('id', inquiryId)
    .eq('tenant_id', chefId)
    .single()

  if (inqError || !inquiry) {
    return { success: false, error: 'Inquiry not found' }
  }

  // Get client email
  let clientEmail = inquiry.contact_email
  let clientName = inquiry.contact_name || 'there'
  if (inquiry.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('full_name, email')
      .eq('id', inquiry.client_id)
      .single()
    if (client) {
      clientEmail = client.email || clientEmail
      clientName = client.full_name || clientName
    }
  }

  if (!clientEmail) {
    return { success: false, error: 'No client email available' }
  }

  // Get menu details
  const { data: menus } = await db
    .from('menu_templates')
    .select('id, title, description, price_per_person_cents, share_token')
    .in('id', menuIds)
    .eq('tenant_id', chefId)

  if (!menus || menus.length === 0) {
    return { success: false, error: 'Selected menus not found' }
  }

  // Ensure each menu has a share token
  for (const menu of menus) {
    if (!menu.share_token) {
      const token = generateToken()
      await db.from('menu_templates').update({ share_token: token }).eq('id', menu.id)
      menu.share_token = token
    }
  }

  // Get chef name
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', chefId)
    .single()
  const chefName = chef?.display_name || chef?.business_name || 'Your chef'

  // Record the send
  await db.from('inquiry_sample_menus').insert({
    inquiry_id: inquiryId,
    tenant_id: chefId,
    menu_ids: menuIds,
    sent_at: new Date().toISOString(),
  })

  // Send email with menu cards
  try {
    const { sendSampleMenusEmail } = await import('@/lib/email/notifications')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

    await sendSampleMenusEmail({
      clientEmail,
      clientName,
      chefName,
      menus: menus.map((m: any) => ({
        title: m.title,
        description: m.description || '',
        pricePerPerson: m.price_per_person_cents
          ? `$${(m.price_per_person_cents / 100).toFixed(0)}/person`
          : null,
        viewUrl: `${appUrl}/menu/${m.share_token}`,
        selectUrl: `${appUrl}/menu/${m.share_token}?select=1&inquiry=${inquiryId}`,
      })),
    })
  } catch (err) {
    console.error('[sample-menu-actions] Email send failed:', err)
    return { success: false, error: 'Failed to send email' }
  }

  // Update inquiry status
  await db
    .from('inquiries')
    .update({ status: 'awaiting_client', updated_at: new Date().toISOString() })
    .eq('id', inquiryId)
    .eq('tenant_id', chefId)

  revalidatePath(`/inquiries/${inquiryId}`)
  revalidatePath('/inquiries')

  return { success: true }
}

// ---------------------------------------------------------------------------
// Client selects a menu (creates quote draft)
// ---------------------------------------------------------------------------

export async function clientSelectsMenu(
  inquiryId: string,
  menuId: string,
  clientToken: string
): Promise<{ success: boolean; quoteId?: string; error?: string }> {
  const db: any = createServerClient({ admin: true })

  // Validate the menu was actually sent to this inquiry
  const { data: sentRecord } = await db
    .from('inquiry_sample_menus')
    .select('id, tenant_id, menu_ids')
    .eq('inquiry_id', inquiryId)
    .single()

  if (!sentRecord) {
    return { success: false, error: 'No sample menus found for this inquiry' }
  }

  const menuIds = sentRecord.menu_ids as string[]
  if (!menuIds.includes(menuId)) {
    return { success: false, error: 'This menu was not offered for this inquiry' }
  }

  const chefId = sentRecord.tenant_id

  // Record the selection
  await db
    .from('inquiries')
    .update({ selected_menu_id: menuId, updated_at: new Date().toISOString() })
    .eq('id', inquiryId)

  // Trigger quote auto-generation
  try {
    const { autoGenerateQuote } = await import('@/lib/quotes/auto-generate')
    const result = await autoGenerateQuote(chefId, inquiryId, menuId)
    if (result.success && result.quoteId) {
      return { success: true, quoteId: result.quoteId }
    }
  } catch (err) {
    console.error('[sample-menu-actions] Auto-generate quote failed:', err)
  }

  // Even if quote generation fails, the selection was recorded
  return { success: true }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
