'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type ClaimType =
  | 'property_damage'
  | 'bodily_injury'
  | 'food_illness'
  | 'equipment_loss'
  | 'vehicle'
  | 'other'
export type ClaimStatus =
  | 'documenting'
  | 'filed'
  | 'under_review'
  | 'approved'
  | 'denied'
  | 'settled'

export interface InsuranceClaim {
  id: string
  chef_id: string
  event_id: string | null
  claim_type: ClaimType
  incident_date: string
  description: string
  amount_cents: number | null
  status: ClaimStatus
  policy_number: string | null
  adjuster_name: string | null
  adjuster_phone: string | null
  adjuster_email: string | null
  evidence_urls: string[]
  witness_info: string | null
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// --- Validation Schemas ---

const ClaimTypeEnum = z.enum([
  'property_damage',
  'bodily_injury',
  'food_illness',
  'equipment_loss',
  'vehicle',
  'other',
])
const ClaimStatusEnum = z.enum([
  'documenting',
  'filed',
  'under_review',
  'approved',
  'denied',
  'settled',
])

const CreateClaimSchema = z.object({
  event_id: z.string().uuid().nullable().optional(),
  claim_type: ClaimTypeEnum,
  incident_date: z.string(),
  description: z.string().min(1),
  amount_cents: z.number().int().nonnegative().nullable().optional(),
  policy_number: z.string().nullable().optional(),
  adjuster_name: z.string().nullable().optional(),
  adjuster_phone: z.string().nullable().optional(),
  adjuster_email: z.string().email().nullable().optional(),
  evidence_urls: z.array(z.string().url()).optional(),
  witness_info: z.string().nullable().optional(),
})

const UpdateClaimSchema = z.object({
  event_id: z.string().uuid().nullable().optional(),
  claim_type: ClaimTypeEnum.optional(),
  incident_date: z.string().optional(),
  description: z.string().min(1).optional(),
  amount_cents: z.number().int().nonnegative().nullable().optional(),
  policy_number: z.string().nullable().optional(),
  adjuster_name: z.string().nullable().optional(),
  adjuster_phone: z.string().nullable().optional(),
  adjuster_email: z.string().email().nullable().optional(),
  evidence_urls: z.array(z.string().url()).optional(),
  witness_info: z.string().nullable().optional(),
  resolution_notes: z.string().nullable().optional(),
})

export type CreateClaimInput = z.infer<typeof CreateClaimSchema>
export type UpdateClaimInput = z.infer<typeof UpdateClaimSchema>

// --- Actions ---

/**
 * List claims with optional filters
 */
export async function getClaims(filters?: { status?: ClaimStatus; type?: ClaimType }) {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('insurance_claims')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.type) {
    query = query.eq('claim_type', filters.type)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch claims: ${error.message}`)

  return (data ?? []) as InsuranceClaim[]
}

/**
 * Create a new insurance claim
 */
export async function createClaim(input: CreateClaimInput) {
  const user = await requireChef()
  const validated = CreateClaimSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('insurance_claims')
    .insert({
      chef_id: user.tenantId!,
      event_id: validated.event_id ?? null,
      claim_type: validated.claim_type,
      incident_date: validated.incident_date,
      description: validated.description,
      amount_cents: validated.amount_cents ?? null,
      policy_number: validated.policy_number ?? null,
      adjuster_name: validated.adjuster_name ?? null,
      adjuster_phone: validated.adjuster_phone ?? null,
      adjuster_email: validated.adjuster_email ?? null,
      evidence_urls: validated.evidence_urls ?? [],
      witness_info: validated.witness_info ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create claim: ${error.message}`)

  revalidatePath('/compliance')
  revalidatePath('/safety/claims')
  revalidatePath('/safety/claims/new')
  return data as InsuranceClaim
}

/**
 * Update an existing claim
 */
export async function updateClaim(id: string, input: UpdateClaimInput) {
  const user = await requireChef()
  const validated = UpdateClaimSchema.parse(input)
  const db: any = createServerClient()

  const { data, error } = await db
    .from('insurance_claims')
    .update({
      ...validated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update claim: ${error.message}`)

  revalidatePath('/compliance')
  revalidatePath('/safety/claims')
  return data as InsuranceClaim
}

/**
 * Delete a claim (only allowed while still in 'documenting' status)
 */
export async function deleteClaim(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify claim is in documenting status before deleting
  const { data: existing, error: fetchError } = await db
    .from('insurance_claims')
    .select('id, status')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) throw new Error('Claim not found')
  if (existing.status !== 'documenting') {
    throw new Error('Only claims in "documenting" status can be deleted')
  }

  const { error } = await db
    .from('insurance_claims')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete claim: ${error.message}`)

  revalidatePath('/compliance')
  revalidatePath('/safety/claims')
  return { success: true }
}

/**
 * Transition a claim to a new status
 */
export async function updateClaimStatus(id: string, newStatus: ClaimStatus) {
  const user = await requireChef()
  ClaimStatusEnum.parse(newStatus)
  const db: any = createServerClient()

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  // Set resolved_at when claim reaches a terminal state
  if (newStatus === 'approved' || newStatus === 'denied' || newStatus === 'settled') {
    updateData.resolved_at = new Date().toISOString()
  }

  const { data, error } = await db
    .from('insurance_claims')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update claim status: ${error.message}`)

  revalidatePath('/compliance')
  revalidatePath('/safety/claims')
  return data as InsuranceClaim
}

/**
 * Gather all related event data into one document package for filing
 */
export async function getClaimDocumentPackage(id: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get the claim
  const { data: claim, error: claimError } = await db
    .from('insurance_claims')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (claimError || !claim) throw new Error('Claim not found')

  let eventData = null
  let clientData = null
  let menuData = null
  let timelineData = null

  // If the claim is linked to an event, gather related data
  if (claim.event_id) {
    const { data: event } = await db
      .from('events')
      .select('*')
      .eq('id', claim.event_id)
      .eq('tenant_id', user.tenantId!)
      .single()

    eventData = event

    if (event?.client_id) {
      const { data: client } = await db
        .from('clients')
        .select('id, full_name, email, phone, company')
        .eq('id', event.client_id)
        .eq('tenant_id', user.tenantId!)
        .single()

      clientData = client
    }

    // Get menu dishes via event_menus -> dishes chain
    const { data: claimEventMenus } = await (db
      .from('event_menus' as any)
      .select('menu_id')
      .eq('event_id', claim.event_id) as any)
    const claimMenuIds = ((claimEventMenus ?? []) as Array<{ menu_id: string }>).map(
      (em) => em.menu_id
    )
    if (claimMenuIds.length > 0) {
      const { data: claimDishes } = await (db
        .from('dishes' as any)
        .select('id, name, description, course_name, dietary_tags, allergen_flags')
        .eq('tenant_id', user.tenantId!)
        .in('menu_id', claimMenuIds)
        .not('name', 'is', null) as any)
      menuData = claimDishes ?? []
    } else {
      menuData = []
    }

    // Get event transitions for timeline
    const { data: transitions } = await db
      .from('event_transitions')
      .select('*')
      .eq('event_id', claim.event_id)
      .order('created_at', { ascending: true })

    timelineData = transitions
  }

  return {
    claim: claim as InsuranceClaim,
    event: eventData,
    client: clientData,
    menu: menuData ?? [],
    timeline: timelineData ?? [],
  }
}

/**
 * Get summary stats for claims
 */
export async function getClaimStats() {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: claims, error } = await db
    .from('insurance_claims')
    .select('status, amount_cents')
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to fetch claim stats: ${error.message}`)

  const allClaims = (claims ?? []) as { status: ClaimStatus; amount_cents: number | null }[]
  const openStatuses: ClaimStatus[] = ['documenting', 'filed', 'under_review']

  const openClaims = allClaims.filter((c) => openStatuses.includes(c.status)).length
  const totalClaimedCents = allClaims.reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)
  const totalSettledCents = allClaims
    .filter((c) => c.status === 'settled' || c.status === 'approved')
    .reduce((sum, c) => sum + (c.amount_cents ?? 0), 0)

  return {
    openClaims,
    totalClaimedCents,
    totalSettledCents,
  }
}
