'use server'

import { createHash } from 'crypto'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { requireAuth, requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildDataRightsCase,
  buildMarketingSmsConsent,
  buildPolicyAcceptance,
  getDefaultLegalReadinessItems,
  summarizeLegalReadiness,
  type LegalPolicyType,
  type LegalReadinessItem,
  type LegalReadinessStatus,
} from '@/lib/legal/readiness'
import { checkRateLimit } from '@/lib/rateLimit'

type LegalDbRow = Record<string, any>

type QueryResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null
  return createHash('sha256').update(ip).digest('hex')
}

async function requestMetadata() {
  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || hdrs.get('x-real-ip')?.trim() || null

  return {
    ipHash: hashIp(ip),
    userAgent: hdrs.get('user-agent')?.slice(0, 512) ?? null,
  }
}

function toReadinessItem(row: LegalDbRow): LegalReadinessItem {
  return {
    id: row.id,
    scope: row.scope,
    tenantId: row.tenant_id ?? null,
    itemKey: row.item_key,
    category: row.category,
    title: row.title,
    status: row.status as LegalReadinessStatus,
    owner: row.owner_role ?? null,
    notes: row.notes ?? null,
    jurisdiction: row.jurisdiction ?? null,
    state: row.state ?? null,
    relatedLink: row.related_link ?? null,
    requiresProfessionalReview: row.requires_professional_review !== false,
    lastReviewedAt: row.last_reviewed_at ?? null,
  }
}

async function safeSelect<T extends LegalDbRow>(
  table: string,
  build: (query: any) => PromiseLike<QueryResult<T>>
): Promise<{ rows: T[]; warning: string | null }> {
  const db: any = createServerClient({ admin: true })
  const result = await build(db.from(table))

  if (result.error) {
    return {
      rows: [],
      warning: `${table}: ${result.error.message}`,
    }
  }

  return { rows: result.data ?? [], warning: null }
}

export async function getAdminLegalReadinessOverview() {
  await requireAdmin()

  const [
    itemsResult,
    policiesResult,
    acceptancesResult,
    consentsResult,
    dataRightsResult,
    dmcaResult,
  ] = await Promise.all([
    safeSelect('legal_readiness_items', (query) =>
      query.select('*').order('created_at', { ascending: false })
    ),
    safeSelect('legal_policy_versions', (query) =>
      query.select('*').order('policy_type', { ascending: true })
    ),
    safeSelect('legal_policy_acceptances', (query) =>
      query.select('*').order('accepted_at', { ascending: false }).limit(500)
    ),
    safeSelect('legal_marketing_sms_consents', (query) =>
      query.select('*').order('updated_at', { ascending: false }).limit(500)
    ),
    safeSelect('legal_data_rights_cases', (query) =>
      query.select('*').order('created_at', { ascending: false }).limit(100)
    ),
    safeSelect('legal_dmca_takedown_cases', (query) =>
      query.select('*').order('created_at', { ascending: false }).limit(100)
    ),
  ])

  const warnings = [
    itemsResult.warning,
    policiesResult.warning,
    acceptancesResult.warning,
    consentsResult.warning,
    dataRightsResult.warning,
    dmcaResult.warning,
  ].filter(Boolean) as string[]

  const items =
    itemsResult.rows.length > 0
      ? itemsResult.rows.map(toReadinessItem)
      : getDefaultLegalReadinessItems('global')
  const summary = summarizeLegalReadiness(items)
  const missingReviewItems = items.filter(
    (item) => item.requiresProfessionalReview && item.status !== 'approved'
  )
  const draftPolicies = policiesResult.rows.filter((policy) =>
    ['draft', 'needs_review'].includes(policy.status)
  )
  const marketingConsents = consentsResult.rows.filter(
    (consent) => consent.message_class === 'marketing'
  )
  const transactionalConsents = consentsResult.rows.filter(
    (consent) => consent.message_class === 'transactional'
  )

  return {
    summary,
    items,
    policyVersions: policiesResult.rows,
    acceptances: acceptancesResult.rows,
    dataRightsCases: dataRightsResult.rows,
    dmcaCases: dmcaResult.rows,
    consentCoverage: {
      marketing: marketingConsents.length,
      transactional: transactionalConsents.length,
      optOuts: consentsResult.rows.filter((consent) => consent.consent_state === 'opted_out')
        .length,
    },
    highRiskWarnings: [
      ...missingReviewItems.map((item) => `${item.title} is ${item.status}`),
      ...draftPolicies.map(
        (policy) => `${policy.policy_type} ${policy.version} is ${policy.status}`
      ),
      ...(policiesResult.rows.length === 0 ? ['No policy versions are persisted yet'] : []),
      ...(acceptancesResult.rows.length === 0
        ? ['No policy acceptance records are persisted yet']
        : []),
    ],
    queryWarnings: warnings,
  }
}

export async function getChefLegalReadinessCenter() {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const [itemsResult, reviewsResult, consentsResult, dataRightsResult, dmcaResult] =
    await Promise.all([
      safeSelect('legal_readiness_items', (query) =>
        query
          .select('*')
          .eq('scope', 'tenant')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
      ),
      safeSelect('legal_payment_tax_marketplace_reviews', (query) =>
        query.select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
      ),
      safeSelect('legal_marketing_sms_consents', (query) =>
        query
          .select('*')
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false })
          .limit(100)
      ),
      safeSelect('legal_data_rights_cases', (query) =>
        query
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(25)
      ),
      safeSelect('legal_dmca_takedown_cases', (query) =>
        query
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(25)
      ),
    ])

  const items =
    itemsResult.rows.length > 0
      ? itemsResult.rows.map(toReadinessItem)
      : getDefaultLegalReadinessItems('tenant').map((item) => ({ ...item, tenantId }))

  return {
    tenantId,
    summary: summarizeLegalReadiness(items),
    items,
    reviewFlags: reviewsResult.rows,
    consents: consentsResult.rows,
    dataRightsCases: dataRightsResult.rows,
    dmcaCases: dmcaResult.rows,
    queryWarnings: [
      itemsResult.warning,
      reviewsResult.warning,
      consentsResult.warning,
      dataRightsResult.warning,
      dmcaResult.warning,
    ].filter(Boolean) as string[],
  }
}

export async function recordCurrentUserPolicyAcceptance(input: {
  policyType: LegalPolicyType
  version: string
  source?: string
}) {
  const user = await requireAuth()
  const db: any = createServerClient({ admin: true })
  const meta = await requestMetadata()

  const { data: policy, error: policyError } = await db
    .from('legal_policy_versions')
    .select('*')
    .eq('policy_type', input.policyType)
    .eq('version', input.version)
    .maybeSingle()

  if (policyError) throw new Error(policyError.message)
  if (!policy) throw new Error('Policy version not found')

  const acceptance = buildPolicyAcceptance({
    policy: {
      id: policy.id,
      policyType: policy.policy_type,
      version: policy.version,
      status: policy.status,
      publicPath: policy.public_path,
      effectiveAt: policy.effective_at,
      materialChange: policy.material_change,
      requiresReacceptance: policy.requires_reacceptance,
      requiresProfessionalReview: policy.requires_professional_review,
    },
    role: user.role,
    userId: user.userId,
    tenantId: user.tenantId,
    acceptedAt: new Date().toISOString(),
    source: input.source ?? 'settings',
    ...meta,
  })

  const { error } = await db.from('legal_policy_acceptances').insert({
    policy_version_id: acceptance.policyVersionId,
    policy_type: acceptance.policyType,
    version: acceptance.version,
    user_id: acceptance.userId,
    tenant_id: acceptance.tenantId,
    subject_type: acceptance.subjectType,
    subject_id: acceptance.subjectId,
    role: acceptance.role,
    accepted_at: acceptance.acceptedAt,
    source: acceptance.source,
    reacceptance_required: acceptance.reacceptanceRequired,
    ip_hash: acceptance.ipHash,
    user_agent: acceptance.userAgent,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/legal-readiness')

  return { success: true }
}

export async function submitPublicDataRightsRequest(input: {
  name: string
  email: string
  requestType: 'access' | 'export' | 'deletion' | 'correction' | 'opt_out' | 'appeal'
  requesterRole?: string | null
  jurisdiction?: string | null
  details?: string | null
  website?: string | null
}) {
  if (input.website?.trim()) {
    return { success: true, caseId: null }
  }

  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const details = input.details?.trim() || null

  if (!name || !email) throw new Error('Name and email are required')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email address')

  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  try {
    await checkRateLimit(`data-rights:ip:${ip}`, 6, 10 * 60_000)
    await checkRateLimit(`data-rights:email:${email}`, 3, 60 * 60_000)
  } catch {
    throw new Error('Too many submissions. Please try again later.')
  }

  const meta = await requestMetadata()
  const db: any = createServerClient({ admin: true })
  const dataRightsCase = buildDataRightsCase({
    requestType: input.requestType,
    requesterEmail: email,
    requesterRole: input.requesterRole?.trim() || null,
    jurisdiction: input.jurisdiction?.trim() || null,
    requiresIdentityVerification: true,
  })

  const { data, error } = await db
    .from('legal_data_rights_cases')
    .insert({
      tenant_id: dataRightsCase.tenantId ?? null,
      request_type: dataRightsCase.requestType,
      requester_email: dataRightsCase.requesterEmail,
      requester_role: dataRightsCase.requesterRole,
      status: dataRightsCase.status,
      jurisdiction: dataRightsCase.jurisdiction ?? null,
      requires_identity_verification: dataRightsCase.requiresIdentityVerification,
      audit_notes: details,
      request_metadata: {
        name,
        source: 'public_data_request',
        ip_hash: meta.ipHash,
        user_agent: meta.userAgent,
      },
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/admin/legal-readiness')

  return { success: true, caseId: data?.id ?? null }
}

export async function recordChefMarketingSmsConsent(input: {
  subjectType: 'client' | 'guest' | 'subscriber' | 'phone'
  subjectId?: string | null
  email?: string | null
  phone?: string | null
  channel: 'email' | 'sms'
  messageClass: 'transactional' | 'marketing'
  consentState: 'opted_in' | 'opted_out' | 'implied' | 'unknown'
  source: string
  sourceTextVersion?: string | null
}) {
  const chef = await requireChef()
  const db: any = createServerClient({ admin: true })
  const meta = await requestMetadata()
  const consent = buildMarketingSmsConsent({
    ...input,
    tenantId: chef.tenantId!,
    consentedAt: input.consentState === 'opted_in' ? new Date().toISOString() : null,
    optedOutAt: input.consentState === 'opted_out' ? new Date().toISOString() : null,
  })

  const { error } = await db.from('legal_marketing_sms_consents').insert({
    tenant_id: consent.tenantId,
    subject_type: consent.subjectType,
    subject_id: consent.subjectId ?? null,
    email: consent.email ?? null,
    phone: consent.phone ?? null,
    channel: consent.channel,
    message_class: consent.messageClass,
    consent_state: consent.consentState,
    source: consent.source,
    source_text_version: consent.sourceTextVersion ?? null,
    consented_at: consent.consentedAt ?? null,
    opted_out_at: consent.optedOutAt ?? null,
    ip_hash: meta.ipHash,
    user_agent: meta.userAgent,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/legal-readiness')

  return { success: true }
}
