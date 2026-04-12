'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { dateToDateString } from '@/lib/utils/format'

// ── Types ────────────────────────────────────────────────────────────────────

const CERT_TYPES = [
  'servsafe',
  'food_handler',
  'servsafe_manager',
  'allergen_awareness',
  'business_license',
  'health_permit',
  'liability_insurance',
  'workers_comp',
  'auto_insurance',
  'llc',
  'cottage_food',
  'other',
] as const

export type CertType = (typeof CERT_TYPES)[number]
export type CertStatus = 'active' | 'expiring_soon' | 'expired' | 'pending_renewal'

const CERT_TYPE_LABELS: Record<CertType, string> = {
  servsafe: 'ServSafe',
  food_handler: 'Food Handler Permit',
  servsafe_manager: 'ServSafe Manager',
  allergen_awareness: 'Allergen Awareness',
  business_license: 'Business License',
  health_permit: 'Health Permit',
  liability_insurance: 'Liability Insurance',
  workers_comp: "Workers' Compensation",
  auto_insurance: 'Auto Insurance',
  llc: 'LLC',
  cottage_food: 'Cottage Food',
  other: 'Other',
}

// Cert types that every chef should have (used for "missing required" count)
const REQUIRED_CERT_TYPES: CertType[] = ['food_handler', 'business_license', 'liability_insurance']

const CertificationInputSchema = z.object({
  cert_type: z.enum(CERT_TYPES),
  name: z.string().min(1, 'Name is required'),
  issuer: z.string().optional().nullable(),
  cert_number: z.string().optional().nullable(),
  issued_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  expires_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  document_url: z.string().url().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
})

export type CertificationInput = z.infer<typeof CertificationInputSchema>

export interface Certification {
  id: string
  cert_type: CertType
  name: string
  issuer: string | null
  cert_number: string | null
  issued_at: string | null
  expires_at: string | null
  document_url: string | null
  notes: string | null
  status: CertStatus
  created_at: string
  updated_at: string
}

// ── Status Computation ───────────────────────────────────────────────────────

function computeStatus(expiresAt: Date | string | null): CertStatus {
  if (!expiresAt) return 'active'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(dateToDateString(expiresAt) + 'T00:00:00')

  const diffMs = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'expiring_soon'
  return 'active'
}

function withComputedStatus(cert: any): Certification {
  return {
    ...cert,
    // Use expires_at, falling back to expiry_date for older rows
    status: computeStatus(cert.expires_at ?? cert.expiry_date ?? null),
  }
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function getCertifications(): Promise<Certification[]> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  // Query using both possible FK columns (chef_id from original, tenant_id from later migration)
  const { data, error } = await db
    .from('chef_certifications')
    .select('*')
    .or(`chef_id.eq.${tenantId},tenant_id.eq.${tenantId}`)
    .order('expires_at', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)

  // Deduplicate by id (both columns may match same row)
  const seen = new Set<string>()
  const unique = (data ?? []).filter((row: any) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })

  return unique.map(withComputedStatus)
}

export async function addCertification(input: CertificationInput): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!
  const parsed = CertificationInputSchema.parse(input)

  const { error } = await db.from('chef_certifications').insert({
    chef_id: tenantId,
    tenant_id: tenantId,
    cert_type: parsed.cert_type,
    name: parsed.name,
    cert_name: parsed.name, // backcompat column
    issuer: parsed.issuer || null,
    issuing_body: parsed.issuer || null, // backcompat column
    cert_number: parsed.cert_number || null,
    issued_at: parsed.issued_at || null,
    issued_date: parsed.issued_at || null, // backcompat column
    expires_at: parsed.expires_at || null,
    expiry_date: parsed.expires_at || null, // backcompat column
    document_url: parsed.document_url || null,
    notes: parsed.notes || null,
    status: computeStatus(parsed.expires_at ?? null),
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/protection')
  revalidatePath('/settings/protection/certifications')
  revalidatePath('/dashboard')
}

export async function updateCertification(
  certId: string,
  input: CertificationInput
): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!
  const parsed = CertificationInputSchema.parse(input)

  const { error } = await db
    .from('chef_certifications')
    .update({
      cert_type: parsed.cert_type,
      name: parsed.name,
      cert_name: parsed.name,
      issuer: parsed.issuer || null,
      issuing_body: parsed.issuer || null,
      cert_number: parsed.cert_number || null,
      issued_at: parsed.issued_at || null,
      issued_date: parsed.issued_at || null,
      expires_at: parsed.expires_at || null,
      expiry_date: parsed.expires_at || null,
      document_url: parsed.document_url || null,
      notes: parsed.notes || null,
      status: computeStatus(parsed.expires_at ?? null),
    })
    .eq('id', certId)
    .or(`chef_id.eq.${tenantId},tenant_id.eq.${tenantId}`)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/protection')
  revalidatePath('/settings/protection/certifications')
  revalidatePath('/dashboard')
}

export async function deleteCertification(certId: string): Promise<void> {
  const chef = await requireChef()
  const db: any = createServerClient()
  const tenantId = chef.tenantId!

  const { error } = await db
    .from('chef_certifications')
    .delete()
    .eq('id', certId)
    .or(`chef_id.eq.${tenantId},tenant_id.eq.${tenantId}`)

  if (error) throw new Error(error.message)
  revalidatePath('/settings/protection')
  revalidatePath('/settings/protection/certifications')
  revalidatePath('/dashboard')
}

export async function getExpiringCertifications(daysAhead: number = 60): Promise<Certification[]> {
  const certs = await getCertifications()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threshold = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  return certs.filter((cert) => {
    if (!cert.expires_at) return false
    const expiry = new Date(dateToDateString(cert.expires_at as Date | string) + 'T00:00:00')
    // Include expired and expiring within threshold
    return expiry <= threshold
  })
}

export async function getCertificationSummary(): Promise<{
  totalActive: number
  expiringSoon: number
  expired: number
  missingRequired: number
}> {
  const certs = await getCertifications()

  const totalActive = certs.filter((c) => c.status === 'active').length
  const expiringSoon = certs.filter((c) => c.status === 'expiring_soon').length
  const expired = certs.filter((c) => c.status === 'expired').length

  // Check which required cert types have at least one active cert
  const activeCertTypes = new Set(
    certs
      .filter((c) => c.status === 'active' || c.status === 'expiring_soon')
      .map((c) => c.cert_type)
  )
  const missingRequired = REQUIRED_CERT_TYPES.filter((t) => !activeCertTypes.has(t)).length

  return { totalActive, expiringSoon, expired, missingRequired }
}
