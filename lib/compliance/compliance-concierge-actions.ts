'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildCompliancePacket,
  buildQuoteComplianceGate,
  computeComplianceProofStatus,
  filterPublicCredentialChips,
  type ComplianceCredentialCategory,
  type ComplianceCredentialProof,
  type ComplianceEventRiskInput,
  type CompliancePacket,
  type ComplianceProofStatus,
  type ComplianceVisibility,
  type QuoteComplianceGate,
} from '@/lib/compliance/compliance-concierge'

const PROOF_CATEGORIES = [
  'license',
  'insurance',
  'permit',
  'food_safety',
  'allergen',
  'alcohol',
  'cannabis',
  'staff_vendor',
  'venue',
  'other',
] as const

const PROOF_VISIBILITIES = [
  'private_only',
  'chef_internal',
  'client_safe',
  'public_profile',
  'requires_evidence',
  'expired',
  'never_publish',
] as const

const ComplianceProfileSchema = z.object({
  default_jurisdiction: z.string().trim().max(120).optional().nullable(),
  private_notes: z.string().trim().max(2000).optional().nullable(),
  alcohol_service: z.boolean().optional(),
  cannabis_service: z.boolean().optional(),
  public_events: z.boolean().optional(),
  staff_or_vendor_service: z.boolean().optional(),
})

const ProofVaultFormSchema = z.object({
  label: z.string().trim().min(1).max(160),
  category: z.enum(PROOF_CATEGORIES),
  visibility: z.enum(PROOF_VISIBILITIES),
  evidence_url: z.string().trim().url().optional().or(z.literal('')),
  expires_at: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  jurisdiction: z.string().trim().max(120).optional().or(z.literal('')),
  public_label: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
})

type DbClient = ReturnType<typeof createServerClient> & { from: (table: string) => any }

export type ComplianceProfileRecord = {
  tenant_id: string
  default_jurisdiction: string | null
  regulated_service_flags: Record<string, boolean>
  private_notes: string | null
  disclaimer_acknowledged_at: string | null
}

export type ComplianceCenterState = {
  profile: ComplianceProfileRecord | null
  credentials: ComplianceCredentialProof[]
  publicCredentialChips: ReturnType<typeof filterPublicCredentialChips>
  missingCoreCategories: ComplianceCredentialCategory[]
  expiringCount: number
  expiredCount: number
}

function getDb(): DbClient {
  return createServerClient({ admin: true }) as DbClient
}

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function categoryFromCertification(
  certType: string | null | undefined
): ComplianceCredentialCategory {
  if (!certType) return 'other'
  if (certType.includes('insurance')) return 'insurance'
  if (certType.includes('permit') || certType === 'cottage_food') return 'permit'
  if (certType.includes('allergen')) return 'allergen'
  if (certType.includes('license') || certType === 'llc') return 'license'
  if (certType.includes('servsafe') || certType.includes('food_handler')) return 'food_safety'
  return 'other'
}

function normalizeStatus(
  rawStatus: string | null | undefined,
  expiresAt?: string | null
): ComplianceProofStatus {
  if (rawStatus === 'expired' || rawStatus === 'missing' || rawStatus === 'needs_review') {
    return rawStatus
  }
  if (rawStatus === 'expiring_soon') return 'expiring_soon'
  return computeComplianceProofStatus(expiresAt ?? null)
}

function mapCertification(row: any): ComplianceCredentialProof {
  const expiresAt = row.expires_at ?? row.expiry_date ?? null
  const label = row.name ?? row.cert_name ?? row.cert_type ?? 'Certification'
  return {
    id: row.id,
    label,
    category: categoryFromCertification(row.cert_type),
    visibility: 'private_only',
    status: normalizeStatus(row.status, expiresAt),
    evidenceUrl: row.document_url ?? null,
    expiresAt,
    jurisdiction: null,
    publicLabel: null,
  }
}

function mapPermit(row: any): ComplianceCredentialProof {
  return {
    id: row.id,
    label: row.name ?? row.permit_type ?? 'Permit',
    category: 'permit',
    visibility: 'private_only',
    status: normalizeStatus(row.status, row.expiry_date ?? null),
    evidenceUrl: row.document_url ?? null,
    expiresAt: row.expiry_date ?? null,
    jurisdiction: row.issuing_authority ?? null,
    publicLabel: null,
  }
}

function mapInsurance(row: any): ComplianceCredentialProof {
  const expiresAt = row.end_date ?? row.expiry_date ?? null
  return {
    id: row.id,
    label: row.provider ?? row.carrier ?? row.policy_type ?? 'Insurance policy',
    category: 'insurance',
    visibility: 'private_only',
    status: normalizeStatus(row.status, expiresAt),
    evidenceUrl: row.document_url ?? null,
    expiresAt,
    jurisdiction: null,
    publicLabel: null,
  }
}

function mapProofVault(row: any): ComplianceCredentialProof {
  return {
    id: row.id,
    label: row.label,
    category: row.category,
    visibility: row.visibility,
    status: normalizeStatus(row.status, row.expires_at ?? null),
    evidenceUrl: row.evidence_url ?? null,
    expiresAt: row.expires_at ?? null,
    jurisdiction: row.jurisdiction ?? null,
    publicLabel: row.public_label ?? null,
  }
}

async function loadCredentialsForTenant(
  db: DbClient,
  tenantId: string
): Promise<ComplianceCredentialProof[]> {
  const [certsResponse, legacyCertsResponse, permitsResponse, insuranceResponse, proofResponse] =
    await Promise.all([
      db
        .from('chef_certifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('expiry_date', { ascending: true, nullsFirst: false }),
      db
        .from('chef_certifications')
        .select('*')
        .eq('chef_id', tenantId)
        .order('expiry_date', { ascending: true, nullsFirst: false }),
      db
        .from('permits')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('expiry_date', { ascending: true }),
      db.from('insurance_policies').select('*').eq('chef_id', tenantId).order('end_date', {
        ascending: true,
      }),
      db
        .from('compliance_proof_vault')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('expires_at', { ascending: true, nullsFirst: false }),
    ])

  const seen = new Set<string>()
  const credentials = [
    ...(certsResponse.data ?? []).map(mapCertification),
    ...(legacyCertsResponse.data ?? []).map(mapCertification),
    ...(permitsResponse.data ?? []).map(mapPermit),
    ...(insuranceResponse.data ?? []).map(mapInsurance),
    ...(proofResponse.data ?? []).map(mapProofVault),
  ].filter((credential) => {
    if (seen.has(credential.id)) return false
    seen.add(credential.id)
    return true
  })

  return credentials
}

async function loadProfileForTenant(
  db: DbClient,
  tenantId: string
): Promise<ComplianceProfileRecord | null> {
  const { data, error } = await db
    .from('compliance_profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) return null
  return data ?? null
}

export async function getComplianceCenterState(): Promise<ComplianceCenterState> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const db = getDb()
  const [profile, credentials] = await Promise.all([
    loadProfileForTenant(db, tenantId),
    loadCredentialsForTenant(db, tenantId),
  ])

  const usableCategories = new Set(
    credentials
      .filter((item) => item.status === 'active' || item.status === 'expiring_soon')
      .map((item) => item.category)
  )
  const missingCoreCategories = (['insurance', 'food_safety', 'permit'] as const).filter(
    (category) => !usableCategories.has(category)
  )

  return {
    profile,
    credentials,
    publicCredentialChips: filterPublicCredentialChips(credentials),
    missingCoreCategories,
    expiringCount: credentials.filter((item) => item.status === 'expiring_soon').length,
    expiredCount: credentials.filter((item) => item.status === 'expired').length,
  }
}

export async function saveComplianceProfile(formData: FormData): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const db = getDb()
  const parsed = ComplianceProfileSchema.parse({
    default_jurisdiction: formValue(formData, 'default_jurisdiction') || null,
    private_notes: formValue(formData, 'private_notes') || null,
    alcohol_service: formData.get('alcohol_service') === 'on',
    cannabis_service: formData.get('cannabis_service') === 'on',
    public_events: formData.get('public_events') === 'on',
    staff_or_vendor_service: formData.get('staff_or_vendor_service') === 'on',
  })

  const { error } = await db.from('compliance_profiles').upsert(
    {
      tenant_id: tenantId,
      default_jurisdiction: parsed.default_jurisdiction ?? null,
      regulated_service_flags: {
        alcohol_service: parsed.alcohol_service ?? false,
        cannabis_service: parsed.cannabis_service ?? false,
        public_events: parsed.public_events ?? false,
        staff_or_vendor_service: parsed.staff_or_vendor_service ?? false,
      },
      private_notes: parsed.private_notes ?? null,
      disclaimer_acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) throw new Error(error.message)
  revalidatePath('/settings/compliance')
}

export async function createComplianceProofVaultItem(formData: FormData): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const db = getDb()
  const parsed = ProofVaultFormSchema.parse({
    label: formValue(formData, 'label'),
    category: formValue(formData, 'category'),
    visibility: formValue(formData, 'visibility') || 'private_only',
    evidence_url: formValue(formData, 'evidence_url'),
    expires_at: formValue(formData, 'expires_at'),
    jurisdiction: formValue(formData, 'jurisdiction'),
    public_label: formValue(formData, 'public_label'),
    notes: formValue(formData, 'notes'),
  })

  if (parsed.visibility === 'public_profile' && !parsed.public_label) {
    throw new Error('Public profile proof needs a public-safe label.')
  }

  const status = computeComplianceProofStatus(parsed.expires_at || null)
  const { error } = await db.from('compliance_proof_vault').insert({
    tenant_id: tenantId,
    label: parsed.label,
    category: parsed.category,
    visibility: parsed.visibility,
    status,
    evidence_url: parsed.evidence_url || null,
    expires_at: parsed.expires_at || null,
    jurisdiction: parsed.jurisdiction || null,
    public_label: parsed.public_label || null,
    notes: parsed.notes || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/compliance')
}

async function loadEventRiskInput(
  db: DbClient,
  tenantId: string,
  eventId: string
): Promise<ComplianceEventRiskInput | null> {
  const { data: event, error } = await db
    .from('events')
    .select(
      'id, tenant_id, client_id, occasion, location_city, location_state, guest_count, service_style, dietary_restrictions, allergies, cannabis_preference, site_notes, location_notes'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !event) return null

  const { data: client } = event.client_id
    ? await db
        .from('clients')
        .select('id, tenant_id, dietary_restrictions, allergies')
        .eq('id', event.client_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
    : { data: null }

  const allergyText = [
    event.allergies,
    event.dietary_restrictions,
    client?.allergies,
    client?.dietary_restrictions,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const notesText = [event.site_notes, event.location_notes].filter(Boolean).join(' ').toLowerCase()

  return {
    eventId: event.id,
    eventType: event.occasion ?? null,
    locationState: event.location_state ?? null,
    locationCity: event.location_city ?? null,
    venueType: notesText.includes('rented') || notesText.includes('venue') ? 'rented_venue' : null,
    isPublicEvent: notesText.includes('public') || notesText.includes('ticket'),
    guestCount: event.guest_count ?? null,
    serviceStyle: event.service_style ?? null,
    allergenSeverity: allergyText
      ? allergyText.includes('anaphyl') || allergyText.includes('severe')
        ? 'severe'
        : 'standard'
      : 'none',
    hasAlcohol: notesText.includes('alcohol') || notesText.includes('bar'),
    hasCannabis: event.cannabis_preference === true,
    staffOrVendorInvolved: notesText.includes('staff') || notesText.includes('vendor'),
    transportRequired: notesText.includes('transport') || notesText.includes('delivery'),
    rentedKitchen: notesText.includes('rented kitchen') || notesText.includes('commissary'),
    reheatingRequired: notesText.includes('reheat') || notesText.includes('reheating'),
    leftoversPlanned: notesText.includes('leftover'),
    vulnerableDiners:
      allergyText.includes('elder') ||
      allergyText.includes('pregnan') ||
      allergyText.includes('child'),
  }
}

export async function getEventCompliancePacket(eventId: string): Promise<CompliancePacket> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const db = getDb()
  const [eventRisk, credentials] = await Promise.all([
    loadEventRiskInput(db, tenantId, eventId),
    loadCredentialsForTenant(db, tenantId),
  ])

  if (!eventRisk) {
    throw new Error('Event not found')
  }

  return buildCompliancePacket({ event: eventRisk, credentials })
}

export async function createEventCompliancePacketSnapshot(eventId: string): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const db = getDb()
  const packet = await getEventCompliancePacket(eventId)

  const { error } = await db.from('compliance_event_packets').upsert(
    {
      tenant_id: tenantId,
      event_id: eventId,
      readiness_state: packet.readinessState,
      packet,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,event_id' }
  )

  if (error) throw new Error(error.message)
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/compliance`)
}

export async function getQuoteComplianceGateForChef(quoteId: string): Promise<QuoteComplianceGate> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const db = getDb()

  const { data: quote, error } = await db
    .from('quotes')
    .select('id, tenant_id, event_id')
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !quote) {
    throw new Error('Quote not found')
  }

  const [eventRisk, credentials] = await Promise.all([
    quote.event_id ? loadEventRiskInput(db, tenantId, quote.event_id) : Promise.resolve(null),
    loadCredentialsForTenant(db, tenantId),
  ])

  return buildQuoteComplianceGate({
    quoteId,
    event: eventRisk,
    credentials,
  })
}
