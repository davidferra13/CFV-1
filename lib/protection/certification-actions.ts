'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const REVALIDATE_PATH = '/settings/protection/certifications'

const CertTypeEnum = z.enum([
  'food_handler',
  'servsafe',
  'alcohol_service',
  'cpr_first_aid',
  'business_license',
  'culinary',
  'guild_membership',
  'other',
])

const CertificationSchema = z.object({
  cert_type: CertTypeEnum,
  cert_name: z.string().min(1, 'Certification name is required'),
  issuing_body: z.string().optional(),
  cert_number: z.string().optional(),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  renewal_url: z.string().url().optional().or(z.literal('')).optional(),
  document_url: z.string().url().optional().or(z.literal('')).optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
})

const UpdateCertificationSchema = CertificationSchema.partial()

export type AddCertificationInput = z.infer<typeof CertificationSchema>
export type UpdateCertificationInput = z.infer<typeof UpdateCertificationSchema>

/**
 * Add a new certification for the current tenant.
 */
export async function addCertification(input: AddCertificationInput) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const validated = CertificationSchema.parse(input)

  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_certifications')
    .insert({ ...validated, tenant_id: tenantId })
    .select()
    .single()

  if (error) throw new Error(`Failed to add certification: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Update an existing certification. Verifies tenant ownership.
 */
export async function updateCertification(id: string, input: UpdateCertificationInput) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const validated = UpdateCertificationSchema.parse(input)

  const supabase: any = createServerClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('chef_certifications')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Certification not found or access denied')

  const { data, error } = await supabase
    .from('chef_certifications')
    .update(validated)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update certification: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Delete a certification. Verifies tenant ownership.
 */
export async function deleteCertification(id: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase: any = createServerClient()

  // Verify ownership
  const { data: existing } = await supabase
    .from('chef_certifications')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) throw new Error('Certification not found or access denied')

  const { error } = await supabase
    .from('chef_certifications')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete certification: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
}

/**
 * List all certifications for the current tenant,
 * ordered by expiry_date ascending with nulls last.
 */
export async function getCertifications() {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_certifications')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('expiry_date', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`Failed to fetch certifications: ${error.message}`)

  return data ?? []
}

/**
 * Return certifications expiring within N days from today.
 * Intended for use in cron jobs or dashboard alerts.
 */
export async function getExpiringCertifications(daysAhead: number) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase: any = createServerClient()

  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setDate(today.getDate() + daysAhead)

  const { data, error } = await supabase
    .from('chef_certifications')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .lte('expiry_date', cutoff.toISOString().slice(0, 10))
    .gte('expiry_date', today.toISOString().slice(0, 10))
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch expiring certifications: ${error.message}`)

  return data ?? []
}

/**
 * Returns true if the tenant has at least one active certification of the given type.
 */
export async function hasActiveCertification(certType: string): Promise<boolean> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase: any = createServerClient()

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('chef_certifications')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('cert_type', certType)
    .eq('is_active', true)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .limit(1)

  if (error) throw new Error(`Failed to check certification: ${error.message}`)

  return (data ?? []).length > 0
}
