// Proposal Builder Server Actions
// Drag-and-drop proposal builder with branding, images, and custom sections
// Stores proposal data as JSONB alongside existing quote data

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// TYPES
// ============================================

export type ProposalSectionType =
  | 'cover'
  | 'menu'
  | 'pricing'
  | 'terms'
  | 'photos'
  | 'bio'
  | 'custom'

export type ProposalSection = {
  id: string
  type: ProposalSectionType
  title: string
  content: Record<string, unknown>
  order: number
  visible: boolean
}

export type ProposalTemplate = {
  id: string
  chef_id: string
  default_sections: ProposalSection[]
  branding: {
    logo_url?: string
    primary_color?: string
    accent_color?: string
    font_family?: string
    business_name?: string
    tagline?: string
  }
  default_terms?: string
  bio_content?: string
  created_at: string
  updated_at: string
}

export type ProposalDraft = {
  sections: ProposalSection[]
  branding: ProposalTemplate['branding']
  status: 'draft' | 'published'
  published_at?: string
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const SectionSchema = z.object({
  id: z.string(),
  type: z.enum(['cover', 'menu', 'pricing', 'terms', 'photos', 'bio', 'custom']),
  title: z.string(),
  content: z.record(z.unknown()),
  order: z.number().int().nonnegative(),
  visible: z.boolean(),
})

const BrandingSchema = z.object({
  logo_url: z.string().optional(),
  primary_color: z.string().optional(),
  accent_color: z.string().optional(),
  font_family: z.string().optional(),
  business_name: z.string().optional(),
  tagline: z.string().optional(),
})

const SaveTemplateSchema = z.object({
  default_sections: z.array(SectionSchema),
  branding: BrandingSchema,
  default_terms: z.string().optional(),
  bio_content: z.string().optional(),
})

const SaveDraftSchema = z.object({
  sections: z.array(SectionSchema),
  branding: BrandingSchema.optional(),
})

// ============================================
// DEFAULT SECTIONS
// ============================================

function getDefaultSections(): ProposalSection[] {
  return [
    {
      id: crypto.randomUUID(),
      type: 'cover',
      title: 'Cover',
      content: { subtitle: '' },
      order: 0,
      visible: true,
    },
    {
      id: crypto.randomUUID(),
      type: 'menu',
      title: 'Proposed Menu',
      content: {},
      order: 1,
      visible: true,
    },
    {
      id: crypto.randomUUID(),
      type: 'pricing',
      title: 'Pricing',
      content: {},
      order: 2,
      visible: true,
    },
    {
      id: crypto.randomUUID(),
      type: 'terms',
      title: 'Terms & Conditions',
      content: { text: '' },
      order: 3,
      visible: true,
    },
    {
      id: crypto.randomUUID(),
      type: 'bio',
      title: 'About the Chef',
      content: { name: '', description: '' },
      order: 4,
      visible: true,
    },
  ]
}

// ============================================
// 1. GET PROPOSAL TEMPLATE
// ============================================

export async function getProposalTemplate(chefId: string): Promise<ProposalTemplate | null> {
  const user = await requireChef()
  if (user.tenantId !== chefId) {
    throw new Error('Unauthorized: tenant mismatch')
  }

  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('proposal_templates')
    .select('*')
    .eq('chef_id', chefId)
    .maybeSingle()

  if (error) {
    console.error('[proposal-builder] Failed to fetch template:', error)
    throw new Error('Failed to load proposal template')
  }

  if (!data) return null

  return {
    id: data.id,
    chef_id: data.chef_id,
    default_sections: data.default_sections ?? getDefaultSections(),
    branding: data.branding ?? {},
    default_terms: data.default_terms ?? '',
    bio_content: data.bio_content ?? '',
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

// ============================================
// 2. SAVE PROPOSAL TEMPLATE
// ============================================

export async function saveProposalTemplate(
  input: z.infer<typeof SaveTemplateSchema>
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const validated = SaveTemplateSchema.parse(input)
  const supabase = createServerClient()
  const chefId = user.tenantId!

  // Upsert: insert if no template exists, update if it does
  const { error } = await (supabase as any).from('proposal_templates').upsert(
    {
      chef_id: chefId,
      default_sections: validated.default_sections,
      branding: validated.branding,
      default_terms: validated.default_terms ?? '',
      bio_content: validated.bio_content ?? '',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id' }
  )

  if (error) {
    console.error('[proposal-builder] Failed to save template:', error)
    throw new Error('Failed to save proposal template')
  }

  return { success: true }
}

// ============================================
// 3. GET PROPOSAL DRAFT
// ============================================

export async function getProposalDraft(eventId: string): Promise<ProposalDraft | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .single()

  if (!event || event.tenant_id !== user.tenantId) {
    throw new Error('Event not found or does not belong to your tenant')
  }

  // Check if a proposal draft exists on the quote for this event
  const { data: quote } = await (supabase as any)
    .from('quotes')
    .select('proposal_data')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!quote?.proposal_data) return null

  return quote.proposal_data as ProposalDraft
}

// ============================================
// 4. SAVE PROPOSAL DRAFT
// ============================================

export async function saveProposalDraft(
  eventId: string,
  sections: ProposalSection[],
  branding?: ProposalTemplate['branding']
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const validated = SaveDraftSchema.parse({ sections, branding })
  const supabase = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .single()

  if (!event || event.tenant_id !== user.tenantId) {
    throw new Error('Event not found or does not belong to your tenant')
  }

  // Find or create quote for this event
  const { data: existingQuote } = await (supabase as any)
    .from('quotes')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proposalData: ProposalDraft = {
    sections: validated.sections,
    branding: validated.branding ?? {},
    status: 'draft',
  }

  if (existingQuote) {
    const { error } = await (supabase as any)
      .from('quotes')
      .update({
        proposal_data: proposalData,
        updated_by: user.id,
      })
      .eq('id', existingQuote.id)

    if (error) {
      console.error('[proposal-builder] Failed to save draft:', error)
      throw new Error('Failed to save proposal draft')
    }
  } else {
    // No quote exists yet for this event - can't create one without pricing
    throw new Error('No quote found for this event. Create a quote first, then build the proposal.')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ============================================
// 5. PUBLISH PROPOSAL
// ============================================

export async function publishProposal(eventId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify event belongs to tenant
  const { data: event } = await supabase
    .from('events')
    .select('tenant_id')
    .eq('id', eventId)
    .single()

  if (!event || event.tenant_id !== user.tenantId) {
    throw new Error('Event not found or does not belong to your tenant')
  }

  // Find the quote with proposal data
  const { data: quote } = await (supabase as any)
    .from('quotes')
    .select('id, proposal_data')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!quote?.proposal_data) {
    throw new Error('No proposal draft found for this event')
  }

  const updatedProposal: ProposalDraft = {
    ...quote.proposal_data,
    status: 'published',
    published_at: new Date().toISOString(),
  }

  const { error } = await (supabase as any)
    .from('quotes')
    .update({
      proposal_data: updatedProposal,
      updated_by: user.id,
    })
    .eq('id', quote.id)

  if (error) {
    console.error('[proposal-builder] Failed to publish proposal:', error)
    throw new Error('Failed to publish proposal')
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}
