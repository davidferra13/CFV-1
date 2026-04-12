'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'

// ─── Types ───────────────────────────────────────────────────────

export type ClientProposal = {
  id: string
  tenantId: string
  eventId: string | null
  clientId: string | null
  templateId: string | null
  menuId: string | null
  shareToken: string
  title: string
  personalNote: string | null
  coverPhotoUrl: string | null
  totalPriceCents: number
  selectedAddons: ProposalAddonEntry[]
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'declined' | 'expired'
  sentAt: string | null
  viewedAt: string | null
  approvedAt: string | null
  declinedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type ProposalAddonEntry = {
  addonId: string
  name: string
  priceCents: number
}

export type PublicProposalData = {
  id: string
  title: string
  personalNote: string | null
  coverPhotoUrl: string | null
  totalPriceCents: number
  selectedAddons: ProposalAddonEntry[]
  status: string
  expiresAt: string | null
  createdAt: string
  chefName: string | null
  chefBusinessName: string | null
  clientName: string | null
  eventDate: string | null
  eventOccasion: string | null
  guestCount: number | null
  menu: {
    id: string
    name: string
    description: string | null
    dishes: { id: string; name: string; description: string | null; course: string | null }[]
  } | null
  template: {
    id: string
    name: string
    description: string | null
    coverPhotoUrl: string | null
    includedServices: Record<string, unknown> | null
  } | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const CreateProposalSchema = z.object({
  eventId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  menuId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  personalNote: z.string().optional(),
  coverPhotoUrl: z.string().url().optional(),
  totalPriceCents: z.number().int().min(0),
  selectedAddons: z
    .array(
      z.object({
        addonId: z.string().uuid(),
        name: z.string(),
        priceCents: z.number().int().min(0),
      })
    )
    .optional(),
  expiresAt: z.string().datetime().optional(),
})

const UpdateProposalSchema = z.object({
  title: z.string().min(1).optional(),
  personalNote: z.string().optional(),
  coverPhotoUrl: z.string().url().optional().nullable(),
  totalPriceCents: z.number().int().min(0).optional(),
  selectedAddons: z
    .array(
      z.object({
        addonId: z.string().uuid(),
        name: z.string(),
        priceCents: z.number().int().min(0),
      })
    )
    .optional(),
  templateId: z.string().uuid().optional().nullable(),
  menuId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
})

// ─── Chef Actions (authenticated) ───────────────────────────────

export async function createClientProposal(
  input: z.infer<typeof CreateProposalSchema>
): Promise<ClientProposal> {
  const user = await requireChef()
  const parsed = CreateProposalSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_proposals')
    .insert({
      tenant_id: user.tenantId!,
      event_id: parsed.eventId || null,
      client_id: parsed.clientId || null,
      template_id: parsed.templateId || null,
      menu_id: parsed.menuId || null,
      title: parsed.title,
      personal_note: parsed.personalNote || null,
      cover_photo_url: parsed.coverPhotoUrl || null,
      total_price_cents: parsed.totalPriceCents,
      selected_addons: parsed.selectedAddons || [],
      expires_at: parsed.expiresAt || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create proposal: ${error.message}`)

  revalidatePath('/proposals')

  return mapProposal(data)
}

export async function listClientProposals(): Promise<ClientProposal[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_proposals')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list proposals: ${error.message}`)

  return (data || []).map(mapProposal)
}

export async function getClientProposal(id: string): Promise<ClientProposal> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_proposals')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) throw new Error(`Failed to get proposal: ${error.message}`)

  return mapProposal(data)
}

export async function updateClientProposal(
  id: string,
  updates: z.infer<typeof UpdateProposalSchema>
): Promise<ClientProposal> {
  const user = await requireChef()
  const parsed = UpdateProposalSchema.parse(updates)
  const db: any = createServerClient()

  const payload: Record<string, unknown> = {}
  if (parsed.title !== undefined) payload.title = parsed.title
  if (parsed.personalNote !== undefined) payload.personal_note = parsed.personalNote
  if (parsed.coverPhotoUrl !== undefined) payload.cover_photo_url = parsed.coverPhotoUrl
  if (parsed.totalPriceCents !== undefined) payload.total_price_cents = parsed.totalPriceCents
  if (parsed.selectedAddons !== undefined) payload.selected_addons = parsed.selectedAddons
  if (parsed.templateId !== undefined) payload.template_id = parsed.templateId
  if (parsed.menuId !== undefined) payload.menu_id = parsed.menuId
  if (parsed.eventId !== undefined) payload.event_id = parsed.eventId
  if (parsed.clientId !== undefined) payload.client_id = parsed.clientId
  if (parsed.expiresAt !== undefined) payload.expires_at = parsed.expiresAt

  if (Object.keys(payload).length === 0) {
    throw new Error('No fields to update')
  }

  const { data, error } = await db
    .from('client_proposals')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update proposal: ${error.message}`)

  revalidatePath('/proposals')

  return mapProposal(data)
}

export async function sendProposal(id: string): Promise<ClientProposal> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_proposals')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to send proposal: ${error.message}`)

  revalidatePath('/proposals')

  return mapProposal(data)
}

// ─── Public Actions (no auth, token-gated) ──────────────────────

export async function getPublicProposal(shareToken: string): Promise<PublicProposalData | null> {
  const db: any = createAdminClient()

  // Fetch proposal by share token
  const { data: proposal, error } = await db
    .from('client_proposals')
    .select('*')
    .eq('share_token', shareToken)
    .single()

  if (error || !proposal) return null

  // Check expiry
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    // Auto-mark as expired if not already
    if (proposal.status !== 'expired') {
      await db.from('client_proposals').update({ status: 'expired' }).eq('id', proposal.id)
    }
    return {
      ...buildPublicData(proposal, null, null, null, null),
      status: 'expired',
    }
  }

  // Record view if status is 'sent' (first view) or 'viewed'
  if (proposal.status === 'sent') {
    await db
      .from('client_proposals')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', proposal.id)
  }

  // Fetch chef info
  const { data: chef } = await db
    .from('chefs')
    .select('display_name, business_name')
    .eq('id', proposal.tenant_id)
    .single()

  // Fetch client info (if linked)
  let client = null
  if (proposal.client_id) {
    const { data: c } = await db
      .from('clients')
      .select('full_name')
      .eq('id', proposal.client_id)
      .single()
    client = c
  }

  // Fetch event info (if linked)
  let event = null
  if (proposal.event_id) {
    const { data: e } = await db
      .from('events')
      .select('event_date, occasion, guest_count')
      .eq('id', proposal.event_id)
      .single()
    event = e
  }

  // Fetch menu + dishes (if linked)
  let menuData = null
  if (proposal.menu_id) {
    const { data: menu } = await db
      .from('menus')
      .select('id, name, description')
      .eq('id', proposal.menu_id)
      .single()

    if (menu) {
      const { data: dishes } = await db
        .from('dishes')
        .select('id, name, description, course_name')
        .eq('menu_id', menu.id)
        .order('course_number', { ascending: true })
        .order('sort_order', { ascending: true })

      menuData = {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        dishes: (dishes || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          course: d.course_name,
        })),
      }
    }
  }

  // Fetch template info (if linked)
  let template = null
  if (proposal.template_id) {
    const { data: t } = await db
      .from('proposal_templates')
      .select('id, name, description, cover_photo_url, included_services')
      .eq('id', proposal.template_id)
      .single()

    if (t) {
      template = {
        id: t.id,
        name: t.name,
        description: t.description,
        coverPhotoUrl: t.cover_photo_url,
        includedServices: t.included_services,
      }
    }
  }

  return buildPublicData(proposal, chef, client, event, menuData)
}

export async function approveProposal(
  shareToken: string
): Promise<{ success: boolean; message: string }> {
  const db: any = createAdminClient()

  const { data: proposal, error: fetchError } = await db
    .from('client_proposals')
    .select('id, status, expires_at')
    .eq('share_token', shareToken)
    .single()

  if (fetchError || !proposal) {
    return { success: false, message: 'Proposal not found' }
  }

  // Check if expired
  if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
    return { success: false, message: 'This proposal has expired' }
  }

  // Check if already approved or declined
  if (proposal.status === 'approved') {
    return { success: false, message: 'This proposal has already been approved' }
  }
  if (proposal.status === 'declined') {
    return { success: false, message: 'This proposal has been declined' }
  }

  const { error } = await db
    .from('client_proposals')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', proposal.id)

  if (error) {
    return { success: false, message: 'Failed to approve proposal. Please try again.' }
  }

  return { success: true, message: 'Proposal approved successfully!' }
}

export async function declineProposal(
  shareToken: string,
  _reason?: string
): Promise<{ success: boolean; message: string }> {
  const db: any = createAdminClient()

  const { data: proposal, error: fetchError } = await db
    .from('client_proposals')
    .select('id, status, expires_at')
    .eq('share_token', shareToken)
    .single()

  if (fetchError || !proposal) {
    return { success: false, message: 'Proposal not found' }
  }

  if (proposal.status === 'approved') {
    return { success: false, message: 'This proposal has already been approved' }
  }
  if (proposal.status === 'declined') {
    return { success: false, message: 'This proposal has already been declined' }
  }

  const { error } = await db
    .from('client_proposals')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString(),
    })
    .eq('id', proposal.id)

  if (error) {
    return { success: false, message: 'Failed to decline proposal. Please try again.' }
  }

  return { success: true, message: 'Proposal declined.' }
}

// ─── Helpers ─────────────────────────────────────────────────────

function buildPublicData(
  proposal: any,
  chef: any,
  client: any,
  event: any,
  menuData: any
): PublicProposalData {
  return {
    id: proposal.id,
    title: proposal.title,
    personalNote: proposal.personal_note,
    coverPhotoUrl: proposal.cover_photo_url,
    totalPriceCents: proposal.total_price_cents,
    selectedAddons: proposal.selected_addons || [],
    status: proposal.status,
    expiresAt: proposal.expires_at,
    createdAt: proposal.created_at,
    chefName: chef?.display_name || null,
    chefBusinessName: chef?.business_name || null,
    clientName: client?.full_name ?? null,
    eventDate: event?.event_date || null,
    eventOccasion: event?.occasion || null,
    guestCount: event?.guest_count || null,
    menu: menuData,
    template: null,
  }
}

function mapProposal(row: any): ClientProposal {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
    clientId: row.client_id,
    templateId: row.template_id,
    menuId: row.menu_id,
    shareToken: row.share_token,
    title: row.title,
    personalNote: row.personal_note,
    coverPhotoUrl: row.cover_photo_url,
    totalPriceCents: row.total_price_cents,
    selectedAddons: row.selected_addons || [],
    status: row.status,
    sentAt: row.sent_at,
    viewedAt: row.viewed_at,
    approvedAt: row.approved_at,
    declinedAt: row.declined_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
