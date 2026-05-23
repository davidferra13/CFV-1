export const PRIVATE_MEMORY_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'staff_safe',
  'client_safe',
  'guest_safe',
  'vendor_safe',
  'public_profile',
  'website_only',
  'remy_safe',
  'requires_permission',
  'requires_evidence',
  'expired',
  'never_publish',
] as const

export type PrivateMemoryVisibility = (typeof PRIVATE_MEMORY_VISIBILITY_LEVELS)[number]

export const PRIVATE_MEMORY_AUDIENCES = [
  'chef',
  'staff',
  'client',
  'guest',
  'public',
  'website',
  'vendor',
  'admin',
  'remy',
  'server_automation',
] as const

export type PrivateMemoryAudience = (typeof PRIVATE_MEMORY_AUDIENCES)[number]

export const PRIVATE_MEMORY_INTENDED_USES = [
  'capacity_planning',
  'compliance_review',
  'household_operations',
  'crisis_recovery',
  'financial_planning',
  'craft_growth',
  'staff_delegation',
  'strategy_planning',
  'revenue_planning',
  'sustainability_review',
  'public_profile_display',
  'website_display',
  'client_safe_explanation',
  'guest_safe_explanation',
  'staff_safe_briefing',
  'vendor_safe_briefing',
  'admin_support',
  'remy_output',
] as const

export type PrivateMemoryIntendedUse = (typeof PRIVATE_MEMORY_INTENDED_USES)[number]

export type PrivateMemoryConfidence = 'low' | 'medium' | 'high' | 'verified'

export type PrivateMemorySourceKind = 'url' | 'file' | 'message' | 'manual_note' | 'source_system'

export type PrivateMemorySourceState =
  | 'sourced'
  | 'unsourced'
  | 'stale'
  | 'contradicted'
  | 'evidence_required'
  | 'verified'

export type ChefLifeUnknownProgram =
  | 'capacity'
  | 'compliance'
  | 'household'
  | 'crisis'
  | 'finance'
  | 'craft'
  | 'staff'
  | 'strategy'
  | 'revenue'
  | 'sustainability'
  | 'vendor'
  | 'event_readiness'

export type ChefLifeUnknownDecisionState = {
  id: string
  tenantId: string
  program: ChefLifeUnknownProgram
  subjectType: PrivateMemoryOwner['subjectType']
  subjectId: string | null
  label: string
  blocksDecision: boolean
  ownerRole: PrivateMemoryAudience
  reductionAction: string
  deadlineAt: string | null
  proofState: 'missing' | 'requested' | 'received' | 'verified'
  suppressedUntil: string | null
  suppressionReason: string | null
  sourceGap: string
}

export type PrivateMemoryOwner = {
  tenantId: string
  chefId: string
  subjectType:
    | 'chef'
    | 'client'
    | 'household'
    | 'event'
    | 'staff'
    | 'vendor'
    | 'business'
    | 'derived'
  subjectId: string | null
}

export type PrivateMemorySourceRef = {
  kind: PrivateMemorySourceKind
  system:
    | 'manual_chef_input'
    | 'client_profile'
    | 'event_plan'
    | 'staff_note'
    | 'compliance_record'
    | 'finance_record'
    | 'communication_thread'
    | 'remy_summary'
    | 'integration'
    | 'derived'
  table: string
  rowId: string | null
  capturedAt: string
  url?: string | null
  filePath?: string | null
  messageId?: string | null
  manualNote?: string | null
  sourceSystem?: string | null
}

export type PrivateMemoryFreshness = {
  capturedAt: string
  lastVerifiedAt: string | null
  staleAfter: string | null
  expiresAt: string | null
}

export type PrivateMemoryPermissionGrant = {
  audience: PrivateMemoryAudience
  grantedByUserId: string
  grantedAt: string
  expiresAt: string | null
}

export type PrivateMemoryEvidenceRef = {
  source: PrivateMemorySourceRef['system']
  table: string
  rowId: string
  verificationState?: 'required' | 'pending' | 'approved' | 'rejected'
  approvedForPublicClaim?: boolean
  approvedAt?: string | null
  approvedByUserId?: string | null
}

export type PrivateMemoryContradictionRef = {
  source: PrivateMemorySourceRef['system']
  table: string
  rowId: string
  reason: string
  contradictedAt: string
}

export type PrivateMemoryPublicClaimEligibility = {
  eligible: boolean
  requiresApprovedEvidence: boolean
  suppressionReason: string | null
  approvedAt: string | null
}

export type PrivateMemoryAuditTrailEvent = {
  id: string
  action:
    | 'created'
    | 'source_attached'
    | 'marked_stale'
    | 'contradicted'
    | 'evidence_required'
    | 'verified'
    | 'public_approved'
    | 'suppressed'
  actorUserId: string | null
  at: string
  note: string
}

export type PrivateMemoryAccessRule = {
  audience: PrivateMemoryAudience
  authGate: 'requireChef' | 'requireAuth' | 'requireAdmin' | 'service_role' | 'public_route'
  tenantScope: 'user.tenantId' | 'user.entityId' | 'public'
  canReadSource: boolean
  canReadDerived: boolean
  auditEvent: string | null
}

export type PrivateMemoryFact = {
  id: string
  owner: PrivateMemoryOwner
  visibility: PrivateMemoryVisibility
  privateValue: string
  safeSummary: string | null
  sourceRefs: PrivateMemorySourceRef[]
  confidence: PrivateMemoryConfidence
  freshness: PrivateMemoryFreshness
  intendedUse: PrivateMemoryIntendedUse[]
  accessRules: PrivateMemoryAccessRule[]
  permissionGrants?: PrivateMemoryPermissionGrant[]
  evidenceRefs?: PrivateMemoryEvidenceRef[]
  contradictionRefs?: PrivateMemoryContradictionRef[]
  publicClaimEligibility?: PrivateMemoryPublicClaimEligibility
  auditTrail?: PrivateMemoryAuditTrailEvent[]
}

export type PrivateMemoryDerivedView = {
  sourceRecordId: string
  tenantId: string
  visibility: Exclude<PrivateMemoryVisibility, 'private_only' | 'never_publish'>
  value: string
  confidence: PrivateMemoryConfidence
  sourceState: PrivateMemorySourceState
  sourceLabel: string
  intendedUse: PrivateMemoryIntendedUse[]
  freshness: PrivateMemoryFreshness
  redaction: 'none' | 'source_private' | 'permissioned' | 'evidence_backed'
}

export const PRIVATE_MEMORY_SAFE_BRIEFING_PURPOSES = [
  'staff_tasks',
  'vendor_instructions',
  'client_updates',
  'public_profile_copy',
  'event_readiness',
  'recovery_communications',
] as const

export type PrivateMemorySafeBriefingPurpose =
  (typeof PRIVATE_MEMORY_SAFE_BRIEFING_PURPOSES)[number]

export type PrivateMemorySafeBriefingCopyVariant = {
  id: 'summary' | 'sendable_message' | 'checklist' | 'public_profile'
  label: string
  body: string
  format: 'paragraph' | 'bullets' | 'profile'
}

export type PrivateMemorySafeBriefingSourceFact = Pick<
  PrivateMemoryDerivedView,
  | 'sourceRecordId'
  | 'tenantId'
  | 'confidence'
  | 'sourceState'
  | 'sourceLabel'
  | 'intendedUse'
  | 'freshness'
  | 'redaction'
> & {
  value: string
  approvedDerived: true
}

export type PrivateMemorySafeBriefing = {
  tenantId: string
  audience: Exclude<PrivateMemoryAudience, 'chef' | 'admin' | 'server_automation'>
  purpose?: PrivateMemorySafeBriefingPurpose
  title: string
  body: string
  sourceFacts: PrivateMemorySafeBriefingSourceFact[]
  sourceRecordIds: string[]
  redactionNotes: string[]
  copyVariants: PrivateMemorySafeBriefingCopyVariant[]
  approvalState: 'draft' | 'needs_chef_review' | 'approved_to_send'
}

export type PrivateMemoryAuthContext = {
  role: 'chef' | 'client' | 'guest' | 'staff' | 'partner' | 'vendor' | 'admin' | 'remy'
  entityId: string
  tenantId: string | null
}

export type ChefLifeReadModelSurface =
  | 'chef_workspace'
  | 'public_profile'
  | 'client_portal'
  | 'guest_portal'
  | 'staff_briefing'
  | 'vendor_briefing'
  | 'admin_support'
  | 'remy_output'

export type ChefLifeRoutePolicyExport =
  | 'CHEF_PROTECTED_PATHS'
  | 'CLIENT_PROTECTED_PATHS'
  | 'STAFF_PROTECTED_PATHS'
  | 'VENDOR_PROTECTED_PATHS'
  | 'PUBLIC_UNAUTHENTICATED_PATHS'
  | 'ADMIN_PATHS'

export type ChefLifeReadModelAccessContract = {
  surface: ChefLifeReadModelSurface
  audience: PrivateMemoryAudience
  routePolicyExport: ChefLifeRoutePolicyExport
  routePrefix: string
  serverActionGate: 'requireChef' | 'requireAuth' | null
  runtimeGuard: 'requireAdmin' | null
  tenantScope: PrivateMemoryAccessRule['tenantScope']
  tenantScopeColumn: 'tenant_id' | 'chef_id' | null
  tenantScopeValue: 'user.tenantId' | 'user.entityId' | null
  sourcePolicy: 'derived_only'
}

export type ChefLifeRoleSafeDerivedReadModel = {
  surface: ChefLifeReadModelSurface
  audience: PrivateMemoryAudience
  access: ChefLifeReadModelAccessContract
  sourceFiltered: true
  views: PrivateMemoryDerivedView[]
}

export const PRIVATE_MEMORY_ACCESS_RULES: Record<PrivateMemoryAudience, PrivateMemoryAccessRule> = {
  chef: {
    audience: 'chef',
    authGate: 'requireChef',
    tenantScope: 'user.tenantId',
    canReadSource: true,
    canReadDerived: true,
    auditEvent: 'private_memory_chef_access',
  },
  staff: {
    audience: 'staff',
    authGate: 'requireAuth',
    tenantScope: 'user.tenantId',
    canReadSource: false,
    canReadDerived: true,
    auditEvent: 'private_memory_staff_derived_access',
  },
  client: {
    audience: 'client',
    authGate: 'requireAuth',
    tenantScope: 'user.tenantId',
    canReadSource: false,
    canReadDerived: true,
    auditEvent: 'private_memory_client_derived_access',
  },
  guest: {
    audience: 'guest',
    authGate: 'requireAuth',
    tenantScope: 'user.tenantId',
    canReadSource: false,
    canReadDerived: true,
    auditEvent: 'private_memory_guest_derived_access',
  },
  public: {
    audience: 'public',
    authGate: 'public_route',
    tenantScope: 'public',
    canReadSource: false,
    canReadDerived: true,
    auditEvent: null,
  },
  website: {
    audience: 'website',
    authGate: 'public_route',
    tenantScope: 'public',
    canReadSource: false,
    canReadDerived: true,
    auditEvent: null,
  },
  vendor: {
    audience: 'vendor',
    authGate: 'requireAuth',
    tenantScope: 'user.tenantId',
    canReadSource: false,
    canReadDerived: true,
    auditEvent: 'private_memory_vendor_derived_access',
  },
  admin: {
    audience: 'admin',
    authGate: 'requireAdmin',
    tenantScope: 'user.entityId',
    canReadSource: true,
    canReadDerived: true,
    auditEvent: 'private_memory_admin_access',
  },
  remy: {
    audience: 'remy',
    authGate: 'requireChef',
    tenantScope: 'user.tenantId',
    canReadSource: false,
    canReadDerived: true,
    auditEvent: 'private_memory_remy_derived_access',
  },
  server_automation: {
    audience: 'server_automation',
    authGate: 'service_role',
    tenantScope: 'user.tenantId',
    canReadSource: true,
    canReadDerived: true,
    auditEvent: 'private_memory_server_automation_access',
  },
}

const DERIVED_VISIBILITY_BY_AUDIENCE: Record<PrivateMemoryAudience, PrivateMemoryVisibility[]> = {
  chef: [...PRIVATE_MEMORY_VISIBILITY_LEVELS],
  staff: ['staff_safe', 'requires_permission', 'requires_evidence'],
  client: ['client_safe', 'requires_permission'],
  guest: ['guest_safe', 'requires_permission'],
  public: ['public_profile'],
  website: ['public_profile', 'website_only'],
  vendor: ['vendor_safe', 'requires_permission'],
  admin: [...PRIVATE_MEMORY_VISIBILITY_LEVELS],
  remy: ['remy_safe'],
  server_automation: [...PRIVATE_MEMORY_VISIBILITY_LEVELS],
}

const SOURCE_AUDIENCES = new Set<PrivateMemoryAudience>(['chef', 'admin', 'server_automation'])

const BLOCKED_DERIVED_VISIBILITIES = new Set<PrivateMemoryVisibility>([
  'private_only',
  'expired',
  'never_publish',
])

const SAFE_BRIEFING_PURPOSE_INTENDED_USES: Record<
  PrivateMemorySafeBriefingPurpose,
  PrivateMemoryIntendedUse[]
> = {
  staff_tasks: ['staff_safe_briefing', 'staff_delegation', 'household_operations'],
  vendor_instructions: ['vendor_safe_briefing', 'household_operations'],
  client_updates: ['client_safe_explanation', 'household_operations', 'capacity_planning'],
  public_profile_copy: ['public_profile_display', 'website_display', 'craft_growth'],
  event_readiness: [
    'staff_safe_briefing',
    'vendor_safe_briefing',
    'guest_safe_explanation',
    'household_operations',
    'compliance_review',
  ],
  recovery_communications: ['crisis_recovery', 'client_safe_explanation', 'staff_safe_briefing'],
}

const SAFE_BRIEFING_PURPOSE_COPY_VARIANTS: Record<
  PrivateMemorySafeBriefingPurpose,
  Array<PrivateMemorySafeBriefingCopyVariant['id']>
> = {
  staff_tasks: ['summary', 'sendable_message', 'checklist'],
  vendor_instructions: ['summary', 'sendable_message', 'checklist'],
  client_updates: ['summary', 'sendable_message'],
  public_profile_copy: ['summary', 'public_profile'],
  event_readiness: ['summary', 'sendable_message', 'checklist'],
  recovery_communications: ['summary', 'sendable_message'],
}

export const CHEF_LIFE_READ_MODEL_ACCESS_CONTRACTS: Record<
  ChefLifeReadModelSurface,
  ChefLifeReadModelAccessContract
> = {
  chef_workspace: {
    surface: 'chef_workspace',
    audience: 'chef',
    routePolicyExport: 'CHEF_PROTECTED_PATHS',
    routePrefix: '/dashboard',
    serverActionGate: 'requireChef',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  },
  public_profile: {
    surface: 'public_profile',
    audience: 'public',
    routePolicyExport: 'PUBLIC_UNAUTHENTICATED_PATHS',
    routePrefix: '/chef',
    serverActionGate: null,
    runtimeGuard: null,
    tenantScope: 'public',
    tenantScopeColumn: null,
    tenantScopeValue: null,
    sourcePolicy: 'derived_only',
  },
  client_portal: {
    surface: 'client_portal',
    audience: 'client',
    routePolicyExport: 'CLIENT_PROTECTED_PATHS',
    routePrefix: '/my',
    serverActionGate: 'requireAuth',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  },
  guest_portal: {
    surface: 'guest_portal',
    audience: 'guest',
    routePolicyExport: 'CLIENT_PROTECTED_PATHS',
    routePrefix: '/my',
    serverActionGate: 'requireAuth',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  },
  staff_briefing: {
    surface: 'staff_briefing',
    audience: 'staff',
    routePolicyExport: 'STAFF_PROTECTED_PATHS',
    routePrefix: '/staff',
    serverActionGate: 'requireAuth',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  },
  vendor_briefing: {
    surface: 'vendor_briefing',
    audience: 'vendor',
    routePolicyExport: 'VENDOR_PROTECTED_PATHS',
    routePrefix: '/vendor',
    serverActionGate: 'requireAuth',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  },
  admin_support: {
    surface: 'admin_support',
    audience: 'admin',
    routePolicyExport: 'ADMIN_PATHS',
    routePrefix: '/admin',
    serverActionGate: 'requireAuth',
    runtimeGuard: 'requireAdmin',
    tenantScope: 'user.entityId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.entityId',
    sourcePolicy: 'derived_only',
  },
  remy_output: {
    surface: 'remy_output',
    audience: 'remy',
    routePolicyExport: 'CHEF_PROTECTED_PATHS',
    routePrefix: '/remy',
    serverActionGate: 'requireChef',
    runtimeGuard: null,
    tenantScope: 'user.tenantId',
    tenantScopeColumn: 'tenant_id',
    tenantScopeValue: 'user.tenantId',
    sourcePolicy: 'derived_only',
  },
}

export function buildPrivateMemoryFact(
  input: Omit<PrivateMemoryFact, 'accessRules'>
): PrivateMemoryFact {
  return {
    ...input,
    accessRules: Object.values(PRIVATE_MEMORY_ACCESS_RULES),
  }
}

export function resolvePrivateMemoryTenantScope(user: PrivateMemoryAuthContext): string {
  return user.tenantId ?? user.entityId
}

export type PrivateMemoryTenantScopedQuery<TQuery> = TQuery & {
  eq(column: string, value: string): TQuery
}

export function applyPrivateMemoryTenantScope<TQuery>(
  query: PrivateMemoryTenantScopedQuery<TQuery>,
  user: PrivateMemoryAuthContext,
  column: 'tenant_id' | 'chef_id' = 'tenant_id'
): TQuery {
  return query.eq(column, resolvePrivateMemoryTenantScope(user))
}

export function hasPrivateMemoryTenantAccess(
  fact: Pick<PrivateMemoryFact, 'owner'>,
  user: PrivateMemoryAuthContext
): boolean {
  return fact.owner.tenantId === resolvePrivateMemoryTenantScope(user)
}

export function isPrivateMemoryExpired(
  fact: Pick<PrivateMemoryFact, 'visibility' | 'freshness'>,
  now = new Date()
): boolean {
  if (fact.visibility === 'expired') return true
  if (!fact.freshness.expiresAt) return false
  return Date.parse(fact.freshness.expiresAt) <= now.getTime()
}

export function isPrivateMemoryStale(
  fact: Pick<PrivateMemoryFact, 'visibility' | 'freshness'>,
  now = new Date()
): boolean {
  if (isPrivateMemoryExpired(fact, now)) return true
  if (!fact.freshness.staleAfter) return false
  return Date.parse(fact.freshness.staleAfter) <= now.getTime()
}

export function validatePrivateMemoryFactContract(fact: Partial<PrivateMemoryFact>): string[] {
  const issues: string[] = []

  if (!fact.owner?.tenantId) issues.push('owner.tenantId is required')
  if (!fact.owner?.chefId) issues.push('owner.chefId is required')
  if (!fact.sourceRefs?.length) issues.push('at least one source ref is required')
  if (fact.sourceRefs?.some((sourceRef) => !sourceRef.kind)) {
    issues.push('sourceRefs.kind is required for source proof')
  }
  if (!fact.confidence) issues.push('confidence is required')
  if (!fact.freshness?.capturedAt) issues.push('freshness.capturedAt is required')
  if (!fact.intendedUse?.length) issues.push('intendedUse is required')
  if (!fact.accessRules?.length) issues.push('server-side access rules are required')

  return issues
}

export function classifyPrivateMemorySourceState(
  fact: Pick<
    PrivateMemoryFact,
    'sourceRefs' | 'confidence' | 'freshness' | 'visibility' | 'evidenceRefs' | 'contradictionRefs'
  >,
  now = new Date()
): PrivateMemorySourceState {
  if (!fact.sourceRefs.length) return 'unsourced'
  if ((fact.contradictionRefs?.length ?? 0) > 0) return 'contradicted'
  if (isPrivateMemoryStale(fact, now)) return 'stale'
  if (fact.visibility === 'requires_evidence' && !hasApprovedPrivateMemoryEvidence(fact)) {
    return 'evidence_required'
  }
  if (fact.confidence === 'verified' || hasApprovedPrivateMemoryEvidence(fact)) return 'verified'
  return 'sourced'
}

export function hasApprovedPrivateMemoryEvidence(
  fact: Pick<PrivateMemoryFact, 'evidenceRefs'>
): boolean {
  return (
    fact.evidenceRefs?.some(
      (evidenceRef) =>
        evidenceRef.verificationState === 'approved' ||
        evidenceRef.approvedForPublicClaim === true ||
        Boolean(evidenceRef.approvedAt)
    ) ?? false
  )
}

export function canPublishPrivateMemoryPublicClaim(input: {
  fact: PrivateMemoryFact
  now?: Date
}): boolean {
  const { fact, now } = input

  if (fact.visibility !== 'public_profile' && fact.visibility !== 'website_only') return false
  if (!fact.safeSummary?.trim()) return false
  if (classifyPrivateMemorySourceState(fact, now) === 'unsourced') return false
  if (classifyPrivateMemorySourceState(fact, now) === 'stale') return false
  if (classifyPrivateMemorySourceState(fact, now) === 'contradicted') return false
  if (fact.publicClaimEligibility?.eligible === false) return false
  if (fact.publicClaimEligibility?.requiresApprovedEvidence) {
    return (
      Boolean(fact.publicClaimEligibility.approvedAt) ||
      fact.evidenceRefs?.some((evidenceRef) => evidenceRef.approvedForPublicClaim === true) === true
    )
  }

  return true
}

export function canReadPrivateMemorySource(input: {
  fact: PrivateMemoryFact
  audience: PrivateMemoryAudience
  user?: PrivateMemoryAuthContext
  now?: Date
}): boolean {
  if (!SOURCE_AUDIENCES.has(input.audience)) return false
  if (
    input.audience !== 'admin' &&
    input.user &&
    !hasPrivateMemoryTenantAccess(input.fact, input.user)
  ) {
    return false
  }
  if (
    input.fact.visibility === 'never_publish' &&
    input.audience !== 'chef' &&
    input.audience !== 'admin'
  ) {
    return false
  }

  return true
}

export function canReadPrivateMemoryDerived(input: {
  fact: PrivateMemoryFact
  audience: PrivateMemoryAudience
  user?: PrivateMemoryAuthContext
  now?: Date
}): boolean {
  if (input.user && !hasPrivateMemoryTenantAccess(input.fact, input.user)) return false
  if (BLOCKED_DERIVED_VISIBILITIES.has(input.fact.visibility)) return false
  if (isPrivateMemoryStale(input.fact, input.now)) return false
  if (!DERIVED_VISIBILITY_BY_AUDIENCE[input.audience].includes(input.fact.visibility)) {
    return false
  }
  if (
    (input.audience === 'public' || input.audience === 'website') &&
    !canPublishPrivateMemoryPublicClaim({ fact: input.fact, now: input.now })
  ) {
    return false
  }
  if (input.fact.visibility === 'requires_permission') {
    return hasCurrentPermissionGrant(input.fact, input.audience, input.now)
  }
  if (input.fact.visibility === 'requires_evidence') {
    return hasApprovedPrivateMemoryEvidence(input.fact)
  }

  return Boolean(input.fact.safeSummary?.trim())
}

export function projectPrivateMemoryFactsForAudience(input: {
  facts: PrivateMemoryFact[]
  audience: PrivateMemoryAudience
  user?: PrivateMemoryAuthContext
  now?: Date
}): PrivateMemoryDerivedView[] {
  return input.facts
    .filter((fact) =>
      canReadPrivateMemoryDerived({
        fact,
        audience: input.audience,
        user: input.user,
        now: input.now,
      })
    )
    .map((fact) => ({
      sourceRecordId: fact.id,
      tenantId: fact.owner.tenantId,
      visibility: fact.visibility as PrivateMemoryDerivedView['visibility'],
      value: fact.safeSummary ?? '',
      confidence: fact.confidence,
      sourceState: classifyPrivateMemorySourceState(fact, input.now),
      sourceLabel: formatPrivateMemorySourceLabel(fact, input.now),
      intendedUse: [...fact.intendedUse],
      freshness: { ...fact.freshness },
      redaction: deriveRedactionMode(fact),
    }))
}

export function getChefLifeReadModelAccessContract(
  surface: ChefLifeReadModelSurface
): ChefLifeReadModelAccessContract {
  return { ...CHEF_LIFE_READ_MODEL_ACCESS_CONTRACTS[surface] }
}

export function buildChefLifeRoleSafeDerivedReadModel(input: {
  surface: ChefLifeReadModelSurface
  facts: PrivateMemoryFact[]
  user?: PrivateMemoryAuthContext
  now?: Date
}): ChefLifeRoleSafeDerivedReadModel {
  const access = getChefLifeReadModelAccessContract(input.surface)
  const views = projectPrivateMemoryFactsForAudience({
    facts: input.facts,
    audience: access.audience,
    user: input.user,
    now: input.now,
  })

  return {
    surface: input.surface,
    audience: access.audience,
    access,
    sourceFiltered: true,
    views,
  }
}

export function buildChefLifeUnknownDecisionState(input: {
  tenantId: string
  program: ChefLifeUnknownProgram
  subjectType: PrivateMemoryOwner['subjectType']
  subjectId?: string | null
  label: string
  reductionAction: string
  ownerRole?: PrivateMemoryAudience
  deadlineAt?: string | null
  sourceGap?: string
  proofState?: ChefLifeUnknownDecisionState['proofState']
}): ChefLifeUnknownDecisionState {
  const id = `${input.program}:${input.subjectType}:${input.subjectId ?? 'unassigned'}:${slug(input.label)}`

  return {
    id,
    tenantId: input.tenantId,
    program: input.program,
    subjectType: input.subjectType,
    subjectId: input.subjectId ?? null,
    label: input.label,
    blocksDecision: true,
    ownerRole: input.ownerRole ?? 'chef',
    reductionAction: input.reductionAction,
    deadlineAt: input.deadlineAt ?? null,
    proofState: input.proofState ?? 'missing',
    suppressedUntil: null,
    suppressionReason: null,
    sourceGap: input.sourceGap ?? input.label,
  }
}

export function suppressChefLifeUnknownDecisionState(
  unknown: ChefLifeUnknownDecisionState,
  input: { reason: string; until: string }
): ChefLifeUnknownDecisionState {
  return {
    ...unknown,
    blocksDecision: false,
    suppressedUntil: input.until,
    suppressionReason: input.reason,
  }
}

export function reduceChefLifeUnknownDecisionState(
  unknown: ChefLifeUnknownDecisionState,
  proofState: Exclude<ChefLifeUnknownDecisionState['proofState'], 'missing'>
): ChefLifeUnknownDecisionState {
  return {
    ...unknown,
    blocksDecision: proofState !== 'verified',
    proofState,
    suppressedUntil: null,
    suppressionReason: null,
  }
}

export function composePrivateMemorySafeBriefing(input: {
  tenantId: string
  audience: PrivateMemorySafeBriefing['audience']
  title: string
  views: PrivateMemoryDerivedView[]
  requireChefReview?: boolean
  purpose?: PrivateMemorySafeBriefingPurpose
  approvedByChefUserId?: string | null
}): PrivateMemorySafeBriefing {
  const scopedViews = input.views.filter((view) => view.tenantId === input.tenantId)
  const body = scopedViews
    .map((view) => view.value.trim())
    .filter(Boolean)
    .join('\n\n')
  const redactionNotes = scopedViews
    .filter((view) => view.redaction !== 'none')
    .map((view) => `${view.sourceRecordId}: ${view.redaction}`)
  const sourceFacts = scopedViews.map(toSafeBriefingSourceFact)
  const copyVariants = buildSafeBriefingCopyVariants({
    title: input.title,
    body,
    purpose: input.purpose,
  })

  return {
    tenantId: input.tenantId,
    audience: input.audience,
    purpose: input.purpose,
    title: input.title,
    body,
    sourceFacts,
    sourceRecordIds: scopedViews.map((view) => view.sourceRecordId),
    redactionNotes,
    copyVariants,
    approvalState: resolveSafeBriefingApprovalState({
      requireChefReview: input.requireChefReview,
      redactionNotes,
      approvedByChefUserId: input.approvedByChefUserId,
    }),
  }
}

export function composePrivateMemorySafeBriefingFromFacts(input: {
  tenantId: string
  audience: PrivateMemorySafeBriefing['audience']
  purpose: PrivateMemorySafeBriefingPurpose
  title: string
  facts: PrivateMemoryFact[]
  user?: PrivateMemoryAuthContext
  now?: Date
  requireChefReview?: boolean
  approvedByChefUserId?: string | null
}): PrivateMemorySafeBriefing {
  const allowedIntendedUses = SAFE_BRIEFING_PURPOSE_INTENDED_USES[input.purpose]
  const purposeFacts = input.facts.filter(
    (fact) =>
      fact.owner.tenantId === input.tenantId &&
      fact.intendedUse.some((intendedUse) => allowedIntendedUses.includes(intendedUse))
  )
  const projectedViews = projectPrivateMemoryFactsForAudience({
    facts: purposeFacts,
    audience: input.audience,
    user: input.user,
    now: input.now,
  }).filter((view) =>
    view.intendedUse.some((intendedUse) => allowedIntendedUses.includes(intendedUse))
  )
  const projectedIds = new Set(projectedViews.map((view) => view.sourceRecordId))
  const omittedRedactionNotes = purposeFacts
    .filter((fact) => !projectedIds.has(fact.id))
    .map(
      (fact) =>
        `${fact.id}: omitted_${deriveSafeBriefingOmissionReason({
          fact,
          audience: input.audience,
          user: input.user,
          now: input.now,
        })}`
    )

  const briefing = composePrivateMemorySafeBriefing({
    tenantId: input.tenantId,
    audience: input.audience,
    purpose: input.purpose,
    title: input.title,
    views: projectedViews,
    requireChefReview: input.requireChefReview,
    approvedByChefUserId: input.approvedByChefUserId,
  })

  return {
    ...briefing,
    redactionNotes: [...briefing.redactionNotes, ...omittedRedactionNotes],
    approvalState: resolveSafeBriefingApprovalState({
      requireChefReview: input.requireChefReview,
      redactionNotes: [...briefing.redactionNotes, ...omittedRedactionNotes],
      approvedByChefUserId: input.approvedByChefUserId,
    }),
  }
}

export function mapVisibilityToServerAccessRule(
  visibility: PrivateMemoryVisibility,
  audience: PrivateMemoryAudience
): PrivateMemoryAccessRule {
  const baseRule = PRIVATE_MEMORY_ACCESS_RULES[audience]
  const canReadSource = SOURCE_AUDIENCES.has(audience)
  const canReadDerived =
    !BLOCKED_DERIVED_VISIBILITIES.has(visibility) &&
    DERIVED_VISIBILITY_BY_AUDIENCE[audience].includes(visibility)

  return {
    ...baseRule,
    canReadSource,
    canReadDerived,
  }
}

function toSafeBriefingSourceFact(
  view: PrivateMemoryDerivedView
): PrivateMemorySafeBriefingSourceFact {
  return {
    sourceRecordId: view.sourceRecordId,
    tenantId: view.tenantId,
    value: view.value,
    confidence: view.confidence,
    sourceState: view.sourceState,
    sourceLabel: view.sourceLabel,
    intendedUse: [...view.intendedUse],
    freshness: { ...view.freshness },
    redaction: view.redaction,
    approvedDerived: true,
  }
}

function buildSafeBriefingCopyVariants(input: {
  title: string
  body: string
  purpose?: PrivateMemorySafeBriefingPurpose
}): PrivateMemorySafeBriefingCopyVariant[] {
  const variantIds = input.purpose
    ? SAFE_BRIEFING_PURPOSE_COPY_VARIANTS[input.purpose]
    : (['summary', 'sendable_message'] satisfies Array<PrivateMemorySafeBriefingCopyVariant['id']>)

  return variantIds.map((variantId) => ({
    id: variantId,
    label: getSafeBriefingVariantLabel(variantId),
    body: formatSafeBriefingVariantBody(variantId, input.title, input.body),
    format: getSafeBriefingVariantFormat(variantId),
  }))
}

function getSafeBriefingVariantLabel(
  variantId: PrivateMemorySafeBriefingCopyVariant['id']
): string {
  switch (variantId) {
    case 'checklist':
      return 'Checklist'
    case 'public_profile':
      return 'Public profile'
    case 'sendable_message':
      return 'Sendable message'
    case 'summary':
      return 'Summary'
  }
}

function getSafeBriefingVariantFormat(
  variantId: PrivateMemorySafeBriefingCopyVariant['id']
): PrivateMemorySafeBriefingCopyVariant['format'] {
  if (variantId === 'checklist') return 'bullets'
  if (variantId === 'public_profile') return 'profile'
  return 'paragraph'
}

function formatSafeBriefingVariantBody(
  variantId: PrivateMemorySafeBriefingCopyVariant['id'],
  title: string,
  body: string
): string {
  const lines = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (variantId === 'checklist') {
    return lines.map((line) => `- ${line}`).join('\n')
  }
  if (variantId === 'sendable_message') {
    return [title.trim(), body.trim()].filter(Boolean).join('\n\n')
  }
  return body
}

function resolveSafeBriefingApprovalState(input: {
  requireChefReview?: boolean
  redactionNotes: string[]
  approvedByChefUserId?: string | null
}): PrivateMemorySafeBriefing['approvalState'] {
  if (input.approvedByChefUserId) return 'approved_to_send'
  if (input.requireChefReview || input.redactionNotes.length > 0) return 'needs_chef_review'
  return 'draft'
}

function deriveSafeBriefingOmissionReason(input: {
  fact: PrivateMemoryFact
  audience: PrivateMemorySafeBriefing['audience']
  user?: PrivateMemoryAuthContext
  now?: Date
}): string {
  if (input.fact.visibility === 'private_only') return 'private_only'
  if (input.fact.visibility === 'never_publish') return 'never_publish'
  if (isPrivateMemoryStale(input.fact, input.now)) return 'stale'
  if ((input.fact.contradictionRefs?.length ?? 0) > 0) return 'contradicted'
  if (!input.fact.safeSummary?.trim()) return 'missing_safe_summary'
  if (input.fact.visibility === 'requires_permission') return 'missing_permission'
  if (input.fact.visibility === 'requires_evidence') return 'missing_evidence'
  if (input.user && !hasPrivateMemoryTenantAccess(input.fact, input.user)) {
    return 'tenant_scope'
  }
  if (!DERIVED_VISIBILITY_BY_AUDIENCE[input.audience].includes(input.fact.visibility)) {
    return 'audience_not_allowed'
  }
  return 'filtered'
}

function hasCurrentPermissionGrant(
  fact: PrivateMemoryFact,
  audience: PrivateMemoryAudience,
  now = new Date()
): boolean {
  return (
    fact.permissionGrants?.some(
      (grant) =>
        grant.audience === audience &&
        (!grant.expiresAt || Date.parse(grant.expiresAt) > now.getTime())
    ) ?? false
  )
}

function deriveRedactionMode(fact: PrivateMemoryFact): PrivateMemoryDerivedView['redaction'] {
  if (fact.visibility === 'requires_permission') return 'permissioned'
  if (fact.visibility === 'requires_evidence') return 'evidence_backed'
  return fact.safeSummary === fact.privateValue ? 'none' : 'source_private'
}

function formatPrivateMemorySourceLabel(fact: PrivateMemoryFact, now = new Date()): string {
  const state = classifyPrivateMemorySourceState(fact, now)
  const freshness = fact.freshness.lastVerifiedAt ?? fact.freshness.capturedAt
  const primarySource = fact.sourceRefs[0]
  const sourceKind = primarySource?.kind ? primarySource.kind.replace(/_/g, ' ') : 'source'

  return `${state.replace(/_/g, ' ')} from ${sourceKind} as of ${freshness}`
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'unknown'
  )
}
