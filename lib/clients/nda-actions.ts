'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const PhotoPermissionEnum = z.enum([
  'none',
  'portfolio_only',
  'public_with_approval',
  'public_freely',
])

const NDAUpdateSchema = z.object({
  nda_active: z.boolean().optional(),
  nda_coverage: z.string().optional(),
  nda_effective_date: z.string().optional(),
  nda_expiry_date: z.string().optional(),
  nda_document_url: z.string().url().optional().or(z.literal('')).optional(),
  photo_permission: PhotoPermissionEnum.optional(),
})

export type NDAUpdateInput = z.infer<typeof NDAUpdateSchema>

export type NDAStatus = {
  nda_active: boolean | null
  nda_coverage: string | null
  nda_effective_date: string | null
  nda_expiry_date: string | null
  nda_document_url: string | null
  photo_permission: string | null
}

/**
 * Update NDA and photo permission columns on a client record.
 * Verifies that the client belongs to the current tenant.
 */
export async function updateNDA(clientId: string, input: NDAUpdateInput) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const validated = NDAUpdateSchema.parse(input)

  const supabase = createServerClient()

  // Verify the client belongs to this tenant
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Client not found or access denied')

  const { data, error } = await supabase
    .from('clients')
    .update(validated)
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .select(
      'nda_active, nda_coverage, nda_effective_date, nda_expiry_date, nda_document_url, photo_permission'
    )
    .single()

  if (error) throw new Error(`Failed to update NDA: ${error.message}`)

  revalidatePath(`/clients/${clientId}`)
  return data
}

/**
 * Fetch NDA and photo permission fields for a single client.
 * Verifies that the client belongs to the current tenant.
 */
export async function getNDAStatus(clientId: string): Promise<NDAStatus> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('clients')
    .select(
      'nda_active, nda_coverage, nda_effective_date, nda_expiry_date, nda_document_url, photo_permission'
    )
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) throw new Error('Client not found or access denied')

  return data as NDAStatus
}

/**
 * Returns clients in this tenant who do NOT have an active NDA
 * (nda_active is false or null) but who have had at least one event.
 */
export async function getClientsRequiringNDA() {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  // Get all client IDs that have at least one event in this tenant
  const { data: clientsWithEvents, error: eventsError } = await supabase
    .from('events')
    .select('client_id')
    .eq('tenant_id', tenantId)
    .not('client_id', 'is', null)

  if (eventsError) throw new Error(`Failed to fetch events: ${eventsError.message}`)

  const clientIdsWithEvents = [
    ...new Set(
      (clientsWithEvents ?? [])
        .map((e: { client_id: string | null }) => e.client_id)
        .filter(Boolean) as string[]
    ),
  ]

  if (clientIdsWithEvents.length === 0) return []

  // Fetch those clients that have nda_active = false or null
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, full_name, email, nda_active, photo_permission')
    .eq('tenant_id', tenantId)
    .in('id', clientIdsWithEvents)
    .or('nda_active.is.null,nda_active.eq.false')
    .order('full_name', { ascending: true })

  if (clientsError) throw new Error(`Failed to fetch clients: ${clientsError.message}`)

  return clients ?? []
}
