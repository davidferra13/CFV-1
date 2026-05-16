export const LEGAL_READINESS_STATUSES = [
  'missing',
  'draft',
  'needs_review',
  'approved',
  'not_applicable',
] as const

export type LegalReadinessStatus = (typeof LEGAL_READINESS_STATUSES)[number]

export const LEGAL_POLICY_TYPES = [
  'terms_of_service',
  'privacy_policy',
  'cookie_policy',
  'acceptable_use_policy',
  'refund_cancellation_policy',
  'dmca_policy',
  'chef_agreement',
  'client_terms',
  'guest_terms',
  'staff_terms',
  'vendor_agreement',
  'partner_terms',
] as const

export type LegalPolicyType = (typeof LEGAL_POLICY_TYPES)[number]

export const ROLE_REQUIRED_POLICIES: Record<string, LegalPolicyType[]> = {
  chef: ['terms_of_service', 'privacy_policy', 'chef_agreement'],
  client: ['terms_of_service', 'privacy_policy', 'client_terms'],
  guest: ['privacy_policy', 'guest_terms'],
  staff: ['privacy_policy', 'staff_terms'],
  vendor: ['privacy_policy', 'vendor_agreement'],
  partner: ['privacy_policy', 'partner_terms'],
}

export type LegalReadinessItem = {
  id?: string
  scope: 'global' | 'tenant'
  tenantId?: string | null
  itemKey: string
  category: string
  title: string
  status: LegalReadinessStatus
  owner?: string | null
  notes?: string | null
  jurisdiction?: string | null
  state?: string | null
  relatedLink?: string | null
  requiresProfessionalReview: boolean
  lastReviewedAt?: string | null
}

export type LegalPolicyVersion = {
  id?: string
  policyType: LegalPolicyType
  version: string
  status: Exclude<LegalReadinessStatus, 'missing' | 'not_applicable'> | 'retired'
  publicPath: string
  effectiveAt?: string | null
  materialChange: boolean
  requiresReacceptance: boolean
  requiresProfessionalReview: boolean
}

export type LegalPolicyAcceptance = {
  policyType: LegalPolicyType
  version: string
  policyVersionId?: string
  userId?: string | null
  tenantId?: string | null
  subjectType: 'user' | 'guest' | 'email' | 'staff' | 'vendor' | 'partner'
  subjectId?: string | null
  role: string
  acceptedAt: string
  source: string
  reacceptanceRequired: boolean
  ipHash?: string | null
  userAgent?: string | null
}

export type MarketingSmsConsent = {
  tenantId?: string | null
  subjectType: 'user' | 'client' | 'guest' | 'subscriber' | 'phone'
  subjectId?: string | null
  email?: string | null
  phone?: string | null
  channel: 'email' | 'sms'
  messageClass: 'transactional' | 'marketing'
  consentState: 'opted_in' | 'opted_out' | 'implied' | 'unknown'
  source: string
  sourceTextVersion?: string | null
  consentedAt?: string | null
  optedOutAt?: string | null
  stopKeywordSeenAt?: string | null
  helpKeywordSeenAt?: string | null
}

export type DataRightsCase = {
  tenantId?: string | null
  requestType: 'access' | 'export' | 'deletion' | 'correction' | 'opt_out' | 'appeal'
  requesterEmail: string
  requesterRole?: string | null
  status: 'submitted' | 'verifying' | 'in_progress' | 'fulfilled' | 'denied' | 'cancelled'
  jurisdiction?: string | null
  dueAt?: string | null
  requiresIdentityVerification: boolean
}

export type ReviewFlagArea =
  | 'saas_tax'
  | 'prepared_food_tax'
  | 'marketplace_facilitator'
  | 'stripe_connect_kyc'
  | 'refund_disclosures'
  | 'vendor_1099'
  | 'alcohol_cannabis'
  | 'worker_classification'

export type PaymentTaxMarketplaceReviewFlag = {
  tenantId?: string | null
  area: ReviewFlagArea
  status: Exclude<LegalReadinessStatus, 'missing' | 'approved'>
  jurisdiction?: string | null
  notes?: string | null
  requiresProfessionalReview: true
}

export type DmcaTakedownCase = {
  tenantId?: string | null
  complainantEmail: string
  contentType: string
  contentId?: string | null
  contentUrl?: string | null
  status:
    | 'submitted'
    | 'needs_review'
    | 'action_taken'
    | 'rejected'
    | 'counter_notice'
    | 'repeat_infringer_review'
  requiresProfessionalReview: boolean
}

const GLOBAL_DEFAULT_ITEMS: LegalReadinessItem[] = [
  {
    scope: 'global',
    itemKey: 'policy_terms_privacy',
    category: 'policy',
    title: 'Terms and privacy policy professional review',
    status: 'needs_review',
    owner: 'admin',
    relatedLink: '/admin/legal-readiness',
    requiresProfessionalReview: true,
  },
  {
    scope: 'global',
    itemKey: 'data_rights_workflow',
    category: 'privacy',
    title: 'Data rights request workflow',
    status: 'draft',
    owner: 'admin',
    relatedLink: '/data-request',
    requiresProfessionalReview: true,
  },
  {
    scope: 'global',
    itemKey: 'dmca_takedown_agent',
    category: 'ugc',
    title: 'DMCA designated-agent and takedown workflow',
    status: 'needs_review',
    owner: 'admin',
    relatedLink: '/dmca',
    requiresProfessionalReview: true,
  },
]

const TENANT_DEFAULT_ITEMS: LegalReadinessItem[] = [
  {
    scope: 'tenant',
    itemKey: 'business_entity_tax_setup',
    category: 'business',
    title: 'Entity, EIN, business banking, and tax setup',
    status: 'needs_review',
    owner: 'chef',
    relatedLink: '/settings/legal-readiness',
    requiresProfessionalReview: true,
  },
  {
    scope: 'tenant',
    itemKey: 'license_insurance_food_safety',
    category: 'food_safety',
    title: 'Licenses, permits, insurance, food safety, and allergy disclosures',
    status: 'needs_review',
    owner: 'chef',
    relatedLink: '/settings/compliance',
    requiresProfessionalReview: true,
  },
  {
    scope: 'tenant',
    itemKey: 'payment_tax_marketplace_review',
    category: 'payments_tax',
    title: 'Payment, refund, marketplace, sales-tax, and 1099 review',
    status: 'needs_review',
    owner: 'chef',
    relatedLink: '/finance/sales-tax',
    requiresProfessionalReview: true,
  },
]

export function getDefaultLegalReadinessItems(scope: 'global' | 'tenant'): LegalReadinessItem[] {
  return (scope === 'global' ? GLOBAL_DEFAULT_ITEMS : TENANT_DEFAULT_ITEMS).map((item) => ({
    ...item,
  }))
}

export function isProfessionalReviewSafeStatus(status: LegalReadinessStatus): boolean {
  return status !== 'approved'
}

export function assertNoUnreviewedApproval(item: {
  status: LegalReadinessStatus
  requiresProfessionalReview?: boolean
  lastReviewedAt?: string | null
}): void {
  if (item.status === 'approved' && item.requiresProfessionalReview && !item.lastReviewedAt) {
    throw new Error('Professional-review-dependent legal items cannot be approved without review')
  }
}

export function getRequiredPoliciesForRole(role: string): LegalPolicyType[] {
  return ROLE_REQUIRED_POLICIES[role] ?? ['terms_of_service', 'privacy_policy']
}

export function buildPolicyAcceptance(input: {
  policy: LegalPolicyVersion
  role: string
  userId?: string | null
  tenantId?: string | null
  subjectType?: LegalPolicyAcceptance['subjectType']
  subjectId?: string | null
  acceptedAt?: string
  source?: string
  ipHash?: string | null
  userAgent?: string | null
}): LegalPolicyAcceptance {
  return {
    policyType: input.policy.policyType,
    version: input.policy.version,
    policyVersionId: input.policy.id,
    userId: input.userId ?? null,
    tenantId: input.tenantId ?? null,
    subjectType: input.subjectType ?? 'user',
    subjectId: input.subjectId ?? input.userId ?? null,
    role: input.role,
    acceptedAt: input.acceptedAt ?? new Date().toISOString(),
    source: input.source ?? 'settings',
    reacceptanceRequired: input.policy.materialChange || input.policy.requiresReacceptance,
    ipHash: input.ipHash ?? null,
    userAgent: input.userAgent ?? null,
  }
}

export function buildMarketingSmsConsent(input: MarketingSmsConsent): MarketingSmsConsent {
  if (input.messageClass === 'transactional' && input.consentState === 'opted_in') {
    return { ...input, consentState: 'implied' }
  }

  return { ...input }
}

export function buildDataRightsCase(
  input: Omit<DataRightsCase, 'status'> & { status?: DataRightsCase['status'] }
): DataRightsCase {
  return {
    ...input,
    status: input.status ?? 'submitted',
    requiresIdentityVerification: input.requiresIdentityVerification,
  }
}

export function buildPaymentTaxMarketplaceReviewFlag(
  input: Omit<PaymentTaxMarketplaceReviewFlag, 'status' | 'requiresProfessionalReview'> & {
    status?: PaymentTaxMarketplaceReviewFlag['status']
  }
): PaymentTaxMarketplaceReviewFlag {
  return {
    ...input,
    status: input.status ?? 'needs_review',
    requiresProfessionalReview: true,
  }
}

export function buildDmcaTakedownCase(
  input: Omit<DmcaTakedownCase, 'status' | 'requiresProfessionalReview'> & {
    status?: DmcaTakedownCase['status']
  }
): DmcaTakedownCase {
  return {
    ...input,
    status: input.status ?? 'submitted',
    requiresProfessionalReview: true,
  }
}

export function summarizeLegalReadiness(items: LegalReadinessItem[]) {
  const counts = LEGAL_READINESS_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<LegalReadinessStatus, number>
  )

  for (const item of items) {
    counts[item.status] += 1
  }

  const highRisk = items.filter(
    (item) =>
      item.requiresProfessionalReview && ['missing', 'draft', 'needs_review'].includes(item.status)
  )

  return {
    total: items.length,
    counts,
    highRisk,
    readyCount: counts.approved + counts.not_applicable,
    needsWorkCount: counts.missing + counts.draft + counts.needs_review,
  }
}
