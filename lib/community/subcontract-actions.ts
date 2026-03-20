// Subcontract Agreement Server Actions
// Chef-to-chef subcontracting with COI verification (Feature 13.5)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type SubcontractRole =
  | 'sous_chef'
  | 'line_cook'
  | 'prep_cook'
  | 'server'
  | 'bartender'
  | 'pastry'
  | 'lead_chef'
  | 'other'
type SubcontractRateType = 'hourly' | 'flat' | 'percentage'
type SubcontractStatus = 'draft' | 'sent' | 'accepted' | 'active' | 'completed' | 'cancelled'

export type SubcontractAgreement = {
  id: string
  hiring_chef_id: string
  subcontractor_chef_id: string | null
  subcontractor_name: string
  subcontractor_email: string | null
  subcontractor_phone: string | null
  event_id: string | null
  role: SubcontractRole
  rate_type: SubcontractRateType
  rate_cents: number
  estimated_hours: number | null
  status: SubcontractStatus
  coi_document_url: string | null
  coi_expiry_date: string | null
  coi_verified: boolean
  insurance_required: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

type SubcontractFilters = {
  status?: SubcontractStatus
  eventId?: string
}

type CreateSubcontractInput = {
  subcontractor_chef_id?: string | null
  subcontractor_name: string
  subcontractor_email?: string | null
  subcontractor_phone?: string | null
  event_id?: string | null
  role: SubcontractRole
  rate_type: SubcontractRateType
  rate_cents: number
  estimated_hours?: number | null
  insurance_required?: boolean
  notes?: string | null
}

type UpdateSubcontractInput = Partial<
  Omit<CreateSubcontractInput, 'rate_cents'> & { rate_cents: number }
>

// List agreements for the current chef, with optional filters
export async function getSubcontracts(filters?: SubcontractFilters) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('subcontract_agreements')
    .select('*')
    .eq('hiring_chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getSubcontracts] Error:', error)
    throw new Error('Failed to fetch subcontract agreements')
  }

  return (data ?? []) as SubcontractAgreement[]
}

// Create a new subcontract agreement
export async function createSubcontract(input: CreateSubcontractInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!input.subcontractor_name?.trim()) {
    throw new Error('Subcontractor name is required')
  }
  if (input.rate_cents < 0) {
    throw new Error('Rate must be a positive amount')
  }

  const { data, error } = await supabase
    .from('subcontract_agreements')
    .insert({
      hiring_chef_id: user.tenantId!,
      subcontractor_chef_id: input.subcontractor_chef_id ?? null,
      subcontractor_name: input.subcontractor_name.trim(),
      subcontractor_email: input.subcontractor_email?.trim() || null,
      subcontractor_phone: input.subcontractor_phone?.trim() || null,
      event_id: input.event_id ?? null,
      role: input.role,
      rate_type: input.rate_type,
      rate_cents: input.rate_cents,
      estimated_hours: input.estimated_hours ?? null,
      insurance_required: input.insurance_required ?? true,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[createSubcontract] Error:', error)
    throw new Error('Failed to create subcontract agreement')
  }

  revalidatePath('/community/subcontracts')
  return data as SubcontractAgreement
}

// Update an existing agreement
export async function updateSubcontract(id: string, input: UpdateSubcontractInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (input.subcontractor_name !== undefined)
    updateData.subcontractor_name = input.subcontractor_name.trim()
  if (input.subcontractor_email !== undefined)
    updateData.subcontractor_email = input.subcontractor_email?.trim() || null
  if (input.subcontractor_phone !== undefined)
    updateData.subcontractor_phone = input.subcontractor_phone?.trim() || null
  if (input.subcontractor_chef_id !== undefined)
    updateData.subcontractor_chef_id = input.subcontractor_chef_id ?? null
  if (input.event_id !== undefined) updateData.event_id = input.event_id ?? null
  if (input.role !== undefined) updateData.role = input.role
  if (input.rate_type !== undefined) updateData.rate_type = input.rate_type
  if (input.rate_cents !== undefined) updateData.rate_cents = input.rate_cents
  if (input.estimated_hours !== undefined)
    updateData.estimated_hours = input.estimated_hours ?? null
  if (input.insurance_required !== undefined)
    updateData.insurance_required = input.insurance_required
  if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null

  const { data, error } = await supabase
    .from('subcontract_agreements')
    .update(updateData)
    .eq('id', id)
    .eq('hiring_chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateSubcontract] Error:', error)
    throw new Error('Failed to update subcontract agreement')
  }

  revalidatePath('/community/subcontracts')
  return data as SubcontractAgreement
}

// Delete a draft agreement only
export async function deleteSubcontract(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify it's in draft status before deleting
  const { data: existing, error: fetchError } = await supabase
    .from('subcontract_agreements')
    .select('status')
    .eq('id', id)
    .eq('hiring_chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) {
    throw new Error('Agreement not found')
  }

  if (existing.status !== 'draft') {
    throw new Error('Only draft agreements can be deleted')
  }

  const { error } = await supabase
    .from('subcontract_agreements')
    .delete()
    .eq('id', id)
    .eq('hiring_chef_id', user.tenantId!)

  if (error) {
    console.error('[deleteSubcontract] Error:', error)
    throw new Error('Failed to delete subcontract agreement')
  }

  revalidatePath('/community/subcontracts')
}

// Transition agreement status
const VALID_TRANSITIONS: Record<SubcontractStatus, SubcontractStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['accepted', 'cancelled'],
  accepted: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export async function updateSubcontractStatus(id: string, newStatus: SubcontractStatus) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch current status
  const { data: existing, error: fetchError } = await supabase
    .from('subcontract_agreements')
    .select('status')
    .eq('id', id)
    .eq('hiring_chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) {
    throw new Error('Agreement not found')
  }

  const currentStatus = existing.status as SubcontractStatus
  const allowed = VALID_TRANSITIONS[currentStatus] ?? []

  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`)
  }

  const { data, error } = await supabase
    .from('subcontract_agreements')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('hiring_chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateSubcontractStatus] Error:', error)
    throw new Error('Failed to update agreement status')
  }

  revalidatePath('/community/subcontracts')
  return data as SubcontractAgreement
}

// Mark COI as verified with document URL and expiry
export async function verifyCOI(id: string, documentUrl: string, expiryDate: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!documentUrl?.trim()) {
    throw new Error('COI document URL is required')
  }
  if (!expiryDate) {
    throw new Error('COI expiry date is required')
  }

  const { data, error } = await supabase
    .from('subcontract_agreements')
    .update({
      coi_document_url: documentUrl.trim(),
      coi_expiry_date: expiryDate,
      coi_verified: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('hiring_chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[verifyCOI] Error:', error)
    throw new Error('Failed to verify COI')
  }

  revalidatePath('/community/subcontracts')
  return data as SubcontractAgreement
}

// Get total subcontractor costs for an event
export async function getSubcontractCosts(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('subcontract_agreements')
    .select('rate_type, rate_cents, estimated_hours')
    .eq('hiring_chef_id', user.tenantId!)
    .eq('event_id', eventId)
    .in('status', ['accepted', 'active', 'completed'])

  if (error) {
    console.error('[getSubcontractCosts] Error:', error)
    throw new Error('Failed to fetch subcontract costs')
  }

  let totalCents = 0
  for (const agreement of data ?? []) {
    if (agreement.rate_type === 'flat') {
      totalCents += agreement.rate_cents
    } else if (agreement.rate_type === 'hourly') {
      const hours = Number(agreement.estimated_hours) || 0
      totalCents += agreement.rate_cents * hours
    }
    // percentage type requires event total, skip for now (computed at display time)
  }

  return { totalCents, agreementCount: (data ?? []).length }
}

// Get unique subcontractor roster with usage stats
export async function getSubcontractorRoster() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('subcontract_agreements')
    .select(
      'subcontractor_name, subcontractor_email, subcontractor_phone, subcontractor_chef_id, status, coi_verified, coi_expiry_date, created_at'
    )
    .eq('hiring_chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getSubcontractorRoster] Error:', error)
    throw new Error('Failed to fetch subcontractor roster')
  }

  // Group by subcontractor name (or chef ID if linked)
  const rosterMap = new Map<
    string,
    {
      name: string
      email: string | null
      phone: string | null
      chefId: string | null
      usageCount: number
      lastUsed: string
      coiVerified: boolean
      coiExpiry: string | null
    }
  >()

  for (const row of data ?? []) {
    const key = row.subcontractor_chef_id ?? row.subcontractor_name.toLowerCase()
    const existing = rosterMap.get(key)

    if (existing) {
      existing.usageCount += 1
      if (row.created_at > existing.lastUsed) {
        existing.lastUsed = row.created_at
      }
      // Use most recent COI info
      if (row.coi_verified) {
        existing.coiVerified = true
        existing.coiExpiry = row.coi_expiry_date
      }
    } else {
      rosterMap.set(key, {
        name: row.subcontractor_name,
        email: row.subcontractor_email,
        phone: row.subcontractor_phone,
        chefId: row.subcontractor_chef_id,
        usageCount: 1,
        lastUsed: row.created_at,
        coiVerified: row.coi_verified ?? false,
        coiExpiry: row.coi_expiry_date,
      })
    }
  }

  return Array.from(rosterMap.values()).sort((a, b) => b.usageCount - a.usageCount)
}

// Get COIs that are expiring within the given number of days
export async function getExpiringCOIs(daysAhead: number = 30) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('subcontract_agreements')
    .select('*')
    .eq('hiring_chef_id', user.tenantId!)
    .eq('coi_verified', true)
    .not('coi_expiry_date', 'is', null)
    .lte('coi_expiry_date', futureDateStr)
    .in('status', ['accepted', 'active'])
    .order('coi_expiry_date', { ascending: true })

  if (error) {
    console.error('[getExpiringCOIs] Error:', error)
    throw new Error('Failed to fetch expiring COIs')
  }

  const today = new Date().toISOString().split('T')[0]

  return (data ?? []).map((row: any) => ({
    ...row,
    isExpired: row.coi_expiry_date ? row.coi_expiry_date < today : false,
  })) as (SubcontractAgreement & { isExpired: boolean })[]
}
