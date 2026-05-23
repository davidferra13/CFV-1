export type ComplianceVisibility =
  | 'private_only'
  | 'chef_internal'
  | 'client_safe'
  | 'public_profile'
  | 'requires_evidence'
  | 'expired'
  | 'never_publish'

export type ComplianceCredentialCategory =
  | 'license'
  | 'insurance'
  | 'permit'
  | 'food_safety'
  | 'allergen'
  | 'alcohol'
  | 'cannabis'
  | 'staff_vendor'
  | 'venue'
  | 'other'

export type ComplianceProofStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'missing'
  | 'needs_review'

export type ComplianceReadinessState =
  | 'clear'
  | 'needs-review'
  | 'blocked'
  | 'expired-proof'
  | 'unknown-jurisdiction'
  | 'consult-professional'

export type ComplianceSeverity = 'info' | 'warning' | 'critical'

export interface ComplianceCredentialProof {
  id: string
  label: string
  category: ComplianceCredentialCategory
  visibility: ComplianceVisibility
  status: ComplianceProofStatus
  evidenceUrl?: string | null
  expiresAt?: string | null
  jurisdiction?: string | null
  publicLabel?: string | null
}

export interface PublicCredentialChip {
  id: string
  label: string
  category: ComplianceCredentialCategory
  status: Extract<ComplianceProofStatus, 'active' | 'expiring_soon'>
}

export interface ComplianceEventRiskInput {
  eventId: string
  eventType?: string | null
  locationState?: string | null
  locationCity?: string | null
  venueType?: 'private_home' | 'rented_venue' | 'commercial_kitchen' | 'outdoor' | 'unknown' | null
  isPublicEvent?: boolean | null
  guestCount?: number | null
  serviceStyle?: string | null
  allergenSeverity?: 'none' | 'standard' | 'severe' | 'unknown' | null
  hasAlcohol?: boolean | null
  hasCannabis?: boolean | null
  staffOrVendorInvolved?: boolean | null
  transportRequired?: boolean | null
  rentedKitchen?: boolean | null
  reheatingRequired?: boolean | null
  leftoversPlanned?: boolean | null
  vulnerableDiners?: boolean | null
}

export interface ComplianceRiskFactor {
  key: string
  label: string
  state: ComplianceReadinessState
  severity: ComplianceSeverity
  evidenceCategory?: ComplianceCredentialCategory
  recommendation: string
  clientSafeSummary: string
}

export interface ComplianceEscalation {
  kind: 'chef-review' | 'consult-professional'
  label: string
  reason: string
}

export interface CompliancePacket {
  eventId: string
  readinessState: ComplianceReadinessState
  factors: ComplianceRiskFactor[]
  missingProofCategories: ComplianceCredentialCategory[]
  publicCredentialChips: PublicCredentialChip[]
  clientSafeSummary: string
  escalations: ComplianceEscalation[]
  disclaimer: string
}

export interface QuoteComplianceGate {
  quoteId: string
  canSend: boolean
  readinessState: ComplianceReadinessState
  message: string
  blockingFactors: ComplianceRiskFactor[]
  warnings: ComplianceRiskFactor[]
}

const PRIVATE_VISIBILITIES = new Set<ComplianceVisibility>([
  'private_only',
  'chef_internal',
  'requires_evidence',
  'expired',
  'never_publish',
])

const STATE_RANK: Record<ComplianceReadinessState, number> = {
  clear: 0,
  'needs-review': 1,
  'unknown-jurisdiction': 2,
  'consult-professional': 3,
  'expired-proof': 4,
  blocked: 5,
}

const CATEGORY_LABELS: Record<ComplianceCredentialCategory, string> = {
  license: 'License',
  insurance: 'Insurance',
  permit: 'Permit',
  food_safety: 'Food safety',
  allergen: 'Allergen readiness',
  alcohol: 'Alcohol service',
  cannabis: 'Cannabis service',
  staff_vendor: 'Staff/vendor proof',
  venue: 'Venue proof',
  other: 'Other',
}

export const COMPLIANCE_NON_LEGAL_ADVICE_DISCLAIMER =
  'Compliance Concierge provides operational readiness guidance only and is not legal advice. Confirm local requirements with a qualified professional or authority before relying on it.'

export function isPrivateComplianceVisibility(visibility: ComplianceVisibility): boolean {
  return PRIVATE_VISIBILITIES.has(visibility)
}

export function filterPublicCredentialChips(
  credentials: ComplianceCredentialProof[]
): PublicCredentialChip[] {
  return credentials
    .filter(
      (credential) =>
        credential.visibility === 'public_profile' &&
        (credential.status === 'active' || credential.status === 'expiring_soon') &&
        Boolean(credential.publicLabel)
    )
    .map((credential) => ({
      id: credential.id,
      label: credential.publicLabel!,
      category: credential.category,
      status: credential.status as 'active' | 'expiring_soon',
    }))
}

export function computeComplianceProofStatus(
  expiresAt: string | null | undefined,
  now: Date = new Date()
): Exclude<ComplianceProofStatus, 'missing' | 'needs_review'> {
  if (!expiresAt) return 'active'
  const expiry = new Date(`${expiresAt.slice(0, 10)}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'active'
}

function hasUsableProof(
  credentials: ComplianceCredentialProof[],
  category: ComplianceCredentialCategory
): boolean {
  return credentials.some(
    (credential) =>
      credential.category === category &&
      (credential.status === 'active' || credential.status === 'expiring_soon')
  )
}

function hasExpiredProof(
  credentials: ComplianceCredentialProof[],
  category: ComplianceCredentialCategory
): boolean {
  return credentials.some(
    (credential) => credential.category === category && credential.status === 'expired'
  )
}

function proofFactor(
  key: string,
  label: string,
  category: ComplianceCredentialCategory,
  recommendation: string,
  clientSafeSummary: string,
  credentials: ComplianceCredentialProof[],
  severity: ComplianceSeverity = 'critical'
): ComplianceRiskFactor | null {
  if (hasUsableProof(credentials, category)) return null
  return {
    key,
    label,
    state: hasExpiredProof(credentials, category) ? 'expired-proof' : 'blocked',
    severity,
    evidenceCategory: category,
    recommendation,
    clientSafeSummary,
  }
}

function rankState(states: ComplianceReadinessState[]): ComplianceReadinessState {
  return states.reduce<ComplianceReadinessState>(
    (current, state) => (STATE_RANK[state] > STATE_RANK[current] ? state : current),
    'clear'
  )
}

export function buildCompliancePacket(input: {
  event: ComplianceEventRiskInput
  credentials: ComplianceCredentialProof[]
}): CompliancePacket {
  const { event, credentials } = input
  const factors: ComplianceRiskFactor[] = []

  if (!event.locationState) {
    factors.push({
      key: 'jurisdiction_unknown',
      label: 'Jurisdiction missing',
      state: 'unknown-jurisdiction',
      severity: 'warning',
      recommendation:
        'Add the state or local jurisdiction before treating permits or regulated service requirements as complete.',
      clientSafeSummary: 'Local readiness is still being confirmed.',
    })
  }

  const insuranceFactor = proofFactor(
    'insurance_required',
    'Insurance proof',
    'insurance',
    'Attach current insurance proof before quote, contract, or service-day commitment.',
    'Insurance readiness is being verified.',
    credentials
  )
  if (insuranceFactor) factors.push(insuranceFactor)

  const foodSafetyFactor = proofFactor(
    'food_safety_required',
    'Food safety proof',
    'food_safety',
    'Attach current food handler, ServSafe, or local food safety proof.',
    'Food safety readiness is being verified.',
    credentials
  )
  if (foodSafetyFactor) factors.push(foodSafetyFactor)

  if (event.guestCount && event.guestCount >= 50) {
    factors.push({
      key: 'large_guest_count',
      label: 'Large guest count',
      state: 'needs-review',
      severity: event.guestCount >= 100 ? 'critical' : 'warning',
      recommendation:
        'Review staffing, permits, insurance limits, sanitation plan, and venue requirements for this guest count.',
      clientSafeSummary: 'Larger event readiness needs a final operational review.',
    })
  }

  if (event.venueType === 'rented_venue' || event.isPublicEvent || event.rentedKitchen) {
    const venueFactor = proofFactor(
      'venue_proof_required',
      'Venue or facility proof',
      'venue',
      'Capture venue certificate, kitchen agreement, house rules, or permit requirements before final commitment.',
      'Venue requirements are being verified.',
      credentials,
      'warning'
    )
    factors.push(
      venueFactor ?? {
        key: 'venue_review',
        label: 'Venue review',
        state: 'needs-review',
        severity: 'warning',
        evidenceCategory: 'venue',
        recommendation:
          'Confirm venue permissions, facility rules, transport, reheating, waste, and load-in constraints.',
        clientSafeSummary: 'Venue logistics are under review.',
      }
    )
  }

  if (event.hasAlcohol) {
    const alcoholFactor = proofFactor(
      'alcohol_proof_required',
      'Alcohol service proof',
      'alcohol',
      'Confirm alcohol service permissions, host responsibility, insurance rider, and local rules with a qualified professional.',
      'Alcohol service readiness is being confirmed.',
      credentials
    )
    if (alcoholFactor) factors.push(alcoholFactor)
  }

  if (event.hasCannabis) {
    const cannabisFactor = proofFactor(
      'cannabis_proof_required',
      'Cannabis service proof',
      'cannabis',
      'Escalate cannabis service for professional review and attach documented permissions before quote or service.',
      'Cannabis-related readiness requires review.',
      credentials
    )
    if (cannabisFactor) factors.push(cannabisFactor)
  }

  if (event.allergenSeverity === 'severe' || event.vulnerableDiners) {
    const allergenFactor = proofFactor(
      'allergen_plan_required',
      'Allergen or vulnerable diner plan',
      'allergen',
      'Capture allergen plan, cross-contact controls, menu notes, and client acknowledgments.',
      'Dietary and allergen controls are being confirmed.',
      credentials,
      event.allergenSeverity === 'severe' ? 'critical' : 'warning'
    )
    if (allergenFactor) factors.push(allergenFactor)
  }

  if (event.staffOrVendorInvolved) {
    const staffFactor = proofFactor(
      'staff_vendor_required',
      'Staff/vendor proof',
      'staff_vendor',
      'Confirm staff/vendor certificates, insurance, assignment scope, and confidentiality boundaries.',
      'Staff and vendor readiness is being checked.',
      credentials,
      'warning'
    )
    if (staffFactor) factors.push(staffFactor)
  }

  if (event.transportRequired || event.reheatingRequired || event.leftoversPlanned) {
    factors.push({
      key: 'food_safety_operations',
      label: 'Transport, reheating, or leftovers',
      state: 'needs-review',
      severity: 'warning',
      evidenceCategory: 'food_safety',
      recommendation:
        'Document temperature controls, reheating plan, holding windows, and leftover handling before service.',
      clientSafeSummary: 'Service-day food safety logistics are being finalized.',
    })
  }

  const missingProofCategories = Array.from(
    new Set(
      factors
        .filter((factor) => factor.evidenceCategory && factor.state !== 'needs-review')
        .map((factor) => factor.evidenceCategory!)
    )
  )

  const readinessState = rankState(factors.map((factor) => factor.state))
  const escalations: ComplianceEscalation[] = []

  if (
    factors.some(
      (factor) =>
        factor.key.includes('alcohol') ||
        factor.key.includes('cannabis') ||
        factor.state === 'unknown-jurisdiction'
    )
  ) {
    escalations.push({
      kind: 'consult-professional',
      label: 'Consult professional',
      reason:
        'Jurisdiction, alcohol, cannabis, or permit-dependent service cannot be resolved by ChefFlow guidance alone.',
    })
  }

  if (factors.some((factor) => factor.state === 'blocked' || factor.state === 'expired-proof')) {
    escalations.push({
      kind: 'chef-review',
      label: 'Chef review required',
      reason: 'Missing or expired proof should be resolved before quote, contract, or service day.',
    })
  }

  const clientSafeSummary =
    readinessState === 'clear'
      ? 'Compliance readiness looks current from available records.'
      : readinessState === 'blocked' || readinessState === 'expired-proof'
        ? 'Some readiness items need internal resolution before commitment.'
        : 'Some readiness items are still under review.'

  return {
    eventId: event.eventId,
    readinessState,
    factors,
    missingProofCategories,
    publicCredentialChips: filterPublicCredentialChips(credentials),
    clientSafeSummary,
    escalations,
    disclaimer: COMPLIANCE_NON_LEGAL_ADVICE_DISCLAIMER,
  }
}

export function buildQuoteComplianceGate(input: {
  quoteId: string
  event: ComplianceEventRiskInput | null
  credentials: ComplianceCredentialProof[]
}): QuoteComplianceGate {
  if (!input.event) {
    return {
      quoteId: input.quoteId,
      canSend: true,
      readinessState: 'needs-review',
      message: 'No linked event is available for compliance review. Send only after manual review.',
      blockingFactors: [],
      warnings: [],
    }
  }

  const packet = buildCompliancePacket({
    event: input.event,
    credentials: input.credentials,
  })
  const blockingFactors = packet.factors.filter(
    (factor) => factor.state === 'blocked' || factor.state === 'expired-proof'
  )
  const warnings = packet.factors.filter((factor) => !blockingFactors.includes(factor))
  const canSend = blockingFactors.length === 0

  return {
    quoteId: input.quoteId,
    canSend,
    readinessState: packet.readinessState,
    message: canSend
      ? 'Compliance warnings are present but not blocking quote send.'
      : `Compliance review required before sending: ${blockingFactors
          .map((factor) => CATEGORY_LABELS[factor.evidenceCategory ?? 'other'])
          .join(', ')}`,
    blockingFactors,
    warnings,
  }
}
