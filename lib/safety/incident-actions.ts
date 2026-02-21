'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const REVALIDATE_PATH = '/safety/incidents'

const IncidentTypeEnum = z.enum([
  'food_safety',
  'guest_injury',
  'property_damage',
  'equipment_failure',
  'near_miss',
  'other',
])

const ResolutionStatusEnum = z.enum(['open', 'in_progress', 'resolved'])

const IncidentSchema = z.object({
  event_id: z.string().uuid().optional(),
  incident_date: z.string().min(1, 'Incident date is required'),
  incident_type: IncidentTypeEnum,
  description: z.string().min(1, 'Description is required'),
  parties_involved: z.string().optional(),
  immediate_action: z.string().optional(),
  follow_up_steps: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        completed: z.boolean(),
        completed_at: z.string().nullable(),
      })
    )
    .optional(),
  resolution_status: ResolutionStatusEnum.optional(),
  document_urls: z.array(z.string()).optional(),
})

const UpdateIncidentSchema = IncidentSchema.partial()

export type CreateIncidentInput = z.infer<typeof IncidentSchema>
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentSchema>

export type FollowUpStep = {
  id: string
  label: string
  completed: boolean
  completed_at: string | null
}

/**
 * Create a new incident record for the current tenant.
 */
export async function createIncident(input: CreateIncidentInput) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const validated = IncidentSchema.parse(input)

  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_incidents')
    .insert({
      ...validated,
      tenant_id: tenantId,
      follow_up_steps: validated.follow_up_steps ?? [],
      document_urls: validated.document_urls ?? [],
      resolution_status: validated.resolution_status ?? 'open',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create incident: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Update an existing incident. Verifies tenant ownership.
 */
export async function updateIncident(id: string, input: UpdateIncidentInput) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const validated = UpdateIncidentSchema.parse(input)

  const supabase = createServerClient()

  const { data: existing } = await (supabase as any)
    .from('chef_incidents')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Incident not found or access denied')

  const { data, error } = await (supabase as any)
    .from('chef_incidents')
    .update({ ...validated, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update incident: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Append a new follow-up step to an incident's follow_up_steps JSONB array.
 * Each step gets a generated UUID (via crypto.randomUUID), starts as incomplete.
 */
export async function addFollowUpStep(id: string, step: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data: existing, error: fetchError } = await (supabase as any)
    .from('chef_incidents')
    .select('follow_up_steps')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existing) throw new Error('Incident not found or access denied')

  const currentSteps: FollowUpStep[] = (existing.follow_up_steps as unknown as FollowUpStep[]) ?? []

  const newStep: FollowUpStep = {
    id: crypto.randomUUID(),
    label: step,
    completed: false,
    completed_at: null,
  }

  const updatedSteps = [...currentSteps, newStep]

  const { data, error } = await (supabase as any)
    .from('chef_incidents')
    .update({
      follow_up_steps: updatedSteps,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to add follow-up step: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Toggle the completed status of a follow-up step within an incident.
 */
export async function toggleFollowUpStep(incidentId: string, stepId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data: existing, error: fetchError } = await (supabase as any)
    .from('chef_incidents')
    .select('follow_up_steps')
    .eq('id', incidentId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchError || !existing) throw new Error('Incident not found or access denied')

  const currentSteps: FollowUpStep[] = (existing.follow_up_steps as unknown as FollowUpStep[]) ?? []

  const updatedSteps = currentSteps.map((s) => {
    if (s.id !== stepId) return s
    const nowCompleted = !s.completed
    return {
      ...s,
      completed: nowCompleted,
      completed_at: nowCompleted ? new Date().toISOString() : null,
    }
  })

  const { data, error } = await (supabase as any)
    .from('chef_incidents')
    .update({
      follow_up_steps: updatedSteps,
      updated_at: new Date().toISOString(),
    })
    .eq('id', incidentId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to toggle follow-up step: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Update the resolution status of an incident.
 */
export async function updateResolutionStatus(
  id: string,
  status: 'open' | 'in_progress' | 'resolved'
) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data: existing } = await (supabase as any)
    .from('chef_incidents')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Incident not found or access denied')

  const { data, error } = await (supabase as any)
    .from('chef_incidents')
    .update({ resolution_status: status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update resolution status: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * List all incidents for the tenant.
 * Optionally filter by resolution_status or incident_type.
 */
export async function getIncidents(filters?: {
  resolution_status?: string
  incident_type?: string
}) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  let query = (supabase as any)
    .from('chef_incidents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('incident_date', { ascending: false })

  if (filters?.resolution_status) {
    query = query.eq('resolution_status', filters.resolution_status)
  }
  if (filters?.incident_type) {
    query = query.eq('incident_type', filters.incident_type)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch incidents: ${error.message}`)

  return data ?? []
}

/**
 * Fetch a single incident by ID. Verifies tenant ownership.
 */
export async function getIncident(id: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_incidents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) throw new Error('Incident not found or access denied')

  return data
}

/**
 * Fetch all incidents associated with a specific event.
 * Verifies the event belongs to the current tenant before returning results.
 */
export async function getIncidentsByEvent(eventId: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  // Verify the event belongs to this tenant
  const { data: eventCheck } = await (supabase as any)
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!eventCheck) throw new Error('Event not found or access denied')

  const { data, error } = await (supabase as any)
    .from('chef_incidents')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('incident_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch incidents for event: ${error.message}`)

  return data ?? []
}
