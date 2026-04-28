'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import type { PublicReviewFeedResult } from '@/lib/reviews/public-actions'

// ─── Types ───────────────────────────────────────────────────────

type ClientProposal = {
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

type ProposalAddonEntry = {
  addonId: string
  name: string
  priceCents: number
}

type PublicProposalData = {
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
  chefSlug: string | null
  clientName: string | null
  eventDate: string | null
  eventServeTime: string | null
  eventOccasion: string | null
  guestCount: number | null
  serviceStyle: string | null
  locationAddress: string | null
  locationCity: string | null
  locationState: string | null
  locationZip: string | null
  locationNotes: string | null
  kitchenNotes: string | null
  dietaryRestrictions: string[]
  allergies: string[]
  specialRequests: string | null
  quotedPriceCents: number | null
  eventDepositAmountCents: number | null
  paymentStatus: string | null
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
  payment: {
    depositRequired: boolean | null
    depositPercentage: number | null
    depositAmountCents: number | null
    balanceDueCents: number | null
    balanceDueDaysBefore: number | null
    termsText: string | null
    source: 'event' | 'chef_settings' | 'not_published'
  }
  cancellationPolicy: {
    name: string
    gracePeriodHours: number | null
    tiers: Array<{
      label: string
      minDays: number | null
      maxDays: number | null
      refundPercent: number | null
    }>
    notes: string | null
  } | null
  reviews: {
    totalReviews: number
    averageRating: number
    highlights: Array<{
      id: string
      reviewerName: string
      rating: number | null
      reviewText: string
      sourceLabel: string
    }>
  }
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
    .select('display_name, business_name, booking_slug, public_slug')
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
      .select(
        'event_date, serve_time, occasion, guest_count, service_style, location_address, location_city, location_state, location_zip, location_notes, kitchen_notes, dietary_restrictions, allergies, special_requests, quoted_price_cents, deposit_amount_cents, payment_status'
      )
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

  const [{ data: depositSettings }, { data: cancellationPolicy }, reviewFeed] = await Promise.all([
    db
      .from('chef_deposit_settings')
      .select(
        'deposit_required, deposit_percentage, balance_due_days_before, payment_terms_text'
      )
      .eq('chef_id', proposal.tenant_id)
      .maybeSingle(),
    db
      .from('cancellation_policies')
      .select('name, grace_period_hours, tiers, notes')
      .eq('chef_id', proposal.tenant_id)
      .eq('is_default', true)
      .maybeSingle(),
    (async (): Promise<PublicReviewFeedResult | null> => {
      try {
        const { getPublicChefReviewFeed } = await import('@/lib/reviews/public-actions')
        return await getPublicChefReviewFeed(proposal.tenant_id)
      } catch (err) {
        console.error('[getPublicProposal] Failed to load public review feed', err)
        return null
      }
    })(),
  ])

  return buildPublicData(
    proposal,
    chef,
    client,
    event,
    menuData,
    template,
    depositSettings,
    cancellationPolicy,
    reviewFeed
  )
}

export async function approveProposal(
  shareToken: string
): Promise<{ success: boolean; message: string }> {
  try {
    await checkRateLimit(`proposal-approve:${shareToken.slice(0, 16)}`, 10, 60 * 60 * 1000)
  } catch {
    return { success: false, message: 'Too many attempts. Please try again later.' }
  }

  const db: any = createAdminClient()

  const { data: proposal, error: fetchError } = await db
    .from('client_proposals')
    .select('id, status, expires_at, tenant_id, title, event_id, client_id')
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

  // Notify the chef (non-blocking)
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: proposal.tenant_id,
      recipientId: proposal.tenant_id,
      category: 'event',
      action: 'proposal_accepted',
      title: 'Proposal approved',
      body: `A client approved your proposal: ${proposal.title || 'Untitled'}`,
      actionUrl: `/proposals`,
      eventId: proposal.event_id ?? undefined,
      clientId: proposal.client_id ?? undefined,
      metadata: { proposalId: proposal.id },
    })
  } catch (err) {
    console.error('[approveProposal] Chef notification failed (non-blocking):', err)
  }

  return { success: true, message: 'Proposal approved successfully!' }
}

export async function declineProposal(
  shareToken: string,
  _reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    await checkRateLimit(`proposal-decline:${shareToken.slice(0, 16)}`, 10, 60 * 60 * 1000)
  } catch {
    return { success: false, message: 'Too many attempts. Please try again later.' }
  }

  const db: any = createAdminClient()

  const { data: proposal, error: fetchError } = await db
    .from('client_proposals')
    .select('id, status, expires_at, tenant_id, title, event_id, client_id')
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

  // Notify the chef (non-blocking)
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    await createNotification({
      tenantId: proposal.tenant_id,
      recipientId: proposal.tenant_id,
      category: 'event',
      action: 'proposal_declined',
      title: 'Proposal declined',
      body: `A client declined your proposal: ${proposal.title || 'Untitled'}`,
      actionUrl: `/proposals`,
      eventId: proposal.event_id ?? undefined,
      clientId: proposal.client_id ?? undefined,
      metadata: { proposalId: proposal.id },
    })
  } catch (err) {
    console.error('[declineProposal] Chef notification failed (non-blocking):', err)
  }

  return { success: true, message: 'Proposal declined.' }
}

// ─── Helpers ─────────────────────────────────────────────────────

function buildPublicData(
  proposal: any,
  chef: any,
  client: any,
  event: any,
  menuData: any,
  template: any = null,
  depositSettings: any = null,
  cancellationPolicy: any = null,
  reviewFeed: PublicReviewFeedResult | null = null
): PublicProposalData {
  const eventDeposit =
    typeof event?.deposit_amount_cents === 'number' ? event.deposit_amount_cents : null
  const settingDepositPercent =
    typeof depositSettings?.deposit_percentage === 'number'
      ? depositSettings.deposit_percentage
      : null
  const settingDeposit =
    eventDeposit == null &&
    depositSettings?.deposit_required === true &&
    settingDepositPercent != null &&
    proposal.total_price_cents > 0
      ? Math.round(proposal.total_price_cents * (settingDepositPercent / 100))
      : null
  const depositAmountCents = eventDeposit ?? settingDeposit
  const balanceDueCents =
    depositAmountCents != null ? Math.max(proposal.total_price_cents - depositAmountCents, 0) : null
  const tiers = Array.isArray(cancellationPolicy?.tiers) ? cancellationPolicy.tiers : []

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
    chefSlug: chef?.public_slug || chef?.booking_slug || null,
    clientName: client?.full_name ?? null,
    eventDate: event?.event_date || null,
    eventServeTime: event?.serve_time || null,
    eventOccasion: event?.occasion || null,
    guestCount: event?.guest_count || null,
    serviceStyle: event?.service_style || null,
    locationAddress: event?.location_address || null,
    locationCity: event?.location_city || null,
    locationState: event?.location_state || null,
    locationZip: event?.location_zip || null,
    locationNotes: event?.location_notes || null,
    kitchenNotes: event?.kitchen_notes || null,
    dietaryRestrictions: Array.isArray(event?.dietary_restrictions)
      ? event.dietary_restrictions.filter(Boolean)
      : [],
    allergies: Array.isArray(event?.allergies) ? event.allergies.filter(Boolean) : [],
    specialRequests: event?.special_requests || null,
    quotedPriceCents: event?.quoted_price_cents ?? null,
    eventDepositAmountCents: eventDeposit,
    paymentStatus: event?.payment_status || null,
    menu: menuData,
    template,
    payment: {
      depositRequired:
        eventDeposit != null
          ? true
          : typeof depositSettings?.deposit_required === 'boolean'
            ? depositSettings.deposit_required
            : null,
      depositPercentage: settingDepositPercent,
      depositAmountCents,
      balanceDueCents,
      balanceDueDaysBefore:
        typeof depositSettings?.balance_due_days_before === 'number'
          ? depositSettings.balance_due_days_before
          : null,
      termsText: depositSettings?.payment_terms_text || null,
      source: eventDeposit != null ? 'event' : settingDeposit != null ? 'chef_settings' : 'not_published',
    },
    cancellationPolicy: cancellationPolicy
      ? {
          name: cancellationPolicy.name || 'Cancellation policy',
          gracePeriodHours:
            typeof cancellationPolicy.grace_period_hours === 'number'
              ? cancellationPolicy.grace_period_hours
              : null,
          tiers: tiers.map((tier: any) => ({
            label: typeof tier?.label === 'string' ? tier.label : 'Policy tier',
            minDays: typeof tier?.min_days === 'number' ? tier.min_days : null,
            maxDays: typeof tier?.max_days === 'number' ? tier.max_days : null,
            refundPercent: typeof tier?.refund_percent === 'number' ? tier.refund_percent : null,
          })),
          notes: cancellationPolicy.notes || null,
        }
      : null,
    reviews: {
      totalReviews: reviewFeed?.stats.totalReviews ?? 0,
      averageRating: reviewFeed?.stats.averageRating ?? 0,
      highlights: (reviewFeed?.reviews ?? []).slice(0, 2).map((review) => ({
        id: review.id,
        reviewerName: review.reviewerName,
        rating: review.rating,
        reviewText: review.reviewText,
        sourceLabel: review.sourceLabel,
      })),
    },
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
