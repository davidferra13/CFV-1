export const CRAFT_ENTITY_KINDS = [
  'craft_note',
  'dish_experiment',
  'signature_candidate',
  'technique_goal',
  'inspiration_source',
  'tasting_result',
  'client_reaction',
  'public_proof_candidate',
  'cuisine_identity_signal',
] as const

export type CraftEntityKind = (typeof CRAFT_ENTITY_KINDS)[number]

export const CRAFT_EVOLUTION_STATES = [
  'idea',
  'draft',
  'test',
  'tested',
  'served',
  'refined',
  'signature',
  'retired',
  'archived',
  'unknown',
] as const

export type CraftEvolutionState = (typeof CRAFT_EVOLUTION_STATES)[number]

export const CRAFT_EVOLUTION_STATE_RANK: Record<CraftEvolutionState, number> = {
  idea: 0,
  draft: 1,
  test: 2,
  tested: 3,
  served: 4,
  refined: 5,
  signature: 6,
  retired: 7,
  archived: 8,
  unknown: 9,
}

export const CRAFT_VISIBILITY_LEVELS = [
  'private_only',
  'chef_internal',
  'client_safe',
  'public_profile',
  'website_only',
  'requires_evidence',
  'never_publish',
] as const

export type CraftVisibilityLevel = (typeof CRAFT_VISIBILITY_LEVELS)[number]

export const PUBLIC_PROOF_STATES = [
  'candidate',
  'needs_evidence',
  'approved',
  'published',
  'rejected',
  'archived',
] as const

export type PublicProofState = (typeof PUBLIC_PROOF_STATES)[number]

export type CraftConfidence = 'low' | 'medium' | 'high'

export const CRAFT_EVOLUTION_LAB_PROGRAM_OUTCOMES = [
  'dish_experiments',
  'signature_candidates',
  'technique_goals',
  'inspiration_sources',
  'client_reactions',
  'public_proof_candidates',
  'profile_safe_outputs',
] as const

export type CraftEvolutionLabProgramOutcome = (typeof CRAFT_EVOLUTION_LAB_PROGRAM_OUTCOMES)[number]

export const CRAFT_EVOLUTION_LAB_CHILD_QUEUE_ITEMS = [
  'BQ-20260520T183100Z-chef-life-craft-evolution-lab-foundation',
  'BQ-20260520T183100Z-chef-life-craft-evolution-lab-surface',
  'BQ-20260520T183100Z-chef-life-craft-evolution-lab-decision-integration',
  'BQ-20260520T183100Z-chef-life-craft-evolution-lab-proof-security',
] as const

export type CraftEvolutionLabChildQueueItem = (typeof CRAFT_EVOLUTION_LAB_CHILD_QUEUE_ITEMS)[number]

export const CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS = [
  'source_spec',
  'product_domain',
  'data_ownership',
  'user_roles',
  'security_privacy',
  'integration_points',
  'proof_expectations',
] as const

export type CraftEvolutionLabProgramCarryKey =
  (typeof CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS)[number]

export type CraftEvolutionLabProgramArchitecture = {
  parentQueueItemId: 'BQ-20260520T183000Z-chef-life-craft-evolution-lab-program'
  sourceSpecPath: 'docs/specs/chef-life-expansion-swarm-spec-pack.md'
  sourceSpecHeading: 'Program 8 - Craft Evolution Lab'
  productDomain: 'Culinary Craft / R&D / Signature Dishes'
  home: 'Chef Workflow / Memory'
  outcomes: readonly CraftEvolutionLabProgramOutcome[]
  childQueueItemIds: readonly CraftEvolutionLabChildQueueItem[]
  dataOwnership: {
    owner: 'chef_tenant'
    tenantScopeSources: readonly ['user.entityId', 'user.tenantId']
    authoritativeSystems: readonly string[]
    duplicateSystemsForbidden: true
  }
  roleBoundaries: {
    chef: 'private_craft_memory_owner'
    client: 'client_safe_scoped_copy_only'
    public: 'approved_profile_safe_outputs_only'
    staffVendorPartner: 'no_default_access'
    admin: 'runtime_gated_diagnostics_only'
  }
  securityPrivacy: {
    chefServerActionGuards: readonly ['requireChef', 'requireAuth']
    tenantQueryScope: readonly ['user.entityId', 'user.tenantId']
    publicOutputsMustUse: 'ProfileSafeCraftOutput'
    rawPrivateMemoryMayPublish: false
  }
  integrationPoints: readonly string[]
  proofExpectations: {
    requiredSections: readonly [
      'Acceptance Evidence',
      'Wiring Proof',
      'Runtime Proof',
      'Verification Output',
    ]
    mobileWidthsPx: readonly [390, 430]
    requiresFinishCheck: true
  }
}

export type CraftEvolutionLabBuildWave = {
  wave: 1 | 2 | 3 | 4 | 5
  label:
    | 'Domain/Data/Security'
    | 'Capture/Memory'
    | 'Surfaces'
    | 'Public/Client Integration'
    | 'Verification'
  owns: readonly string[]
  after: readonly CraftEvolutionLabBuildWave['wave'][]
  mustCarry: readonly CraftEvolutionLabProgramCarryKey[]
  authAndTenantRules: readonly string[]
  proofRequirements: readonly string[]
}

export type CraftEvolutionLabSliceReadinessInput = {
  queueItemId: string
  carriedKeys: readonly CraftEvolutionLabProgramCarryKey[]
}

export type CraftEvolutionLabSliceReadiness = {
  queueItemId: string
  ready: boolean
  missingCarryKeys: CraftEvolutionLabProgramCarryKey[]
}

export const CRAFT_EVOLUTION_LAB_PROGRAM_ARCHITECTURE: CraftEvolutionLabProgramArchitecture = {
  parentQueueItemId: 'BQ-20260520T183000Z-chef-life-craft-evolution-lab-program',
  sourceSpecPath: 'docs/specs/chef-life-expansion-swarm-spec-pack.md',
  sourceSpecHeading: 'Program 8 - Craft Evolution Lab',
  productDomain: 'Culinary Craft / R&D / Signature Dishes',
  home: 'Chef Workflow / Memory',
  outcomes: CRAFT_EVOLUTION_LAB_PROGRAM_OUTCOMES,
  childQueueItemIds: CRAFT_EVOLUTION_LAB_CHILD_QUEUE_ITEMS,
  dataOwnership: {
    owner: 'chef_tenant',
    tenantScopeSources: ['user.entityId', 'user.tenantId'],
    authoritativeSystems: [
      'dish_index',
      'recipes',
      'menus',
      'workflow_notes',
      'dish_feedback',
      'guest_feedback',
      'chef_taste_preferences',
      'public_profile',
      'discovery',
      'media_assets',
      'remy_private_summary',
    ],
    duplicateSystemsForbidden: true,
  },
  roleBoundaries: {
    chef: 'private_craft_memory_owner',
    client: 'client_safe_scoped_copy_only',
    public: 'approved_profile_safe_outputs_only',
    staffVendorPartner: 'no_default_access',
    admin: 'runtime_gated_diagnostics_only',
  },
  securityPrivacy: {
    chefServerActionGuards: ['requireChef', 'requireAuth'],
    tenantQueryScope: ['user.entityId', 'user.tenantId'],
    publicOutputsMustUse: 'ProfileSafeCraftOutput',
    rawPrivateMemoryMayPublish: false,
  },
  integrationPoints: [
    'dish_index',
    'recipes',
    'menus',
    'workflow_notes',
    'post_event_feedback',
    'chef_taste_preferences',
    'public_profile',
    'discovery',
    'media',
    'Remy',
  ],
  proofExpectations: {
    requiredSections: [
      'Acceptance Evidence',
      'Wiring Proof',
      'Runtime Proof',
      'Verification Output',
    ],
    mobileWidthsPx: [390, 430],
    requiresFinishCheck: true,
  },
}

export const CRAFT_EVOLUTION_LAB_SWARM_BUILD_PATH: readonly CraftEvolutionLabBuildWave[] = [
  {
    wave: 1,
    label: 'Domain/Data/Security',
    owns: [
      'domain contract',
      'data ownership map',
      'visibility model',
      'auth and tenant-scope rules',
    ],
    after: [],
    mustCarry: CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS,
    authAndTenantRules: [
      'Server actions start with requireChef() or justified requireAuth().',
      'Tenant reads and writes scope through user.entityId or user.tenantId.',
      'Linked source rows are tenant-verified before promotion or publication.',
    ],
    proofRequirements: ['contract tests', 'source preservation proof'],
  },
  {
    wave: 2,
    label: 'Capture/Memory',
    owns: ['quick capture contracts', 'experiment lifecycle', 'source refs', 'media proof refs'],
    after: [1],
    mustCarry: CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS,
    authAndTenantRules: [
      'Capture writes use chef-owned tenant scope.',
      'Route params and form ids are selectors only after tenant ownership checks.',
    ],
    proofRequirements: ['tenant isolation tests', 'empty/error-state proof'],
  },
  {
    wave: 3,
    label: 'Surfaces',
    owns: ['Craft Lab route', 'dish evolution timeline', 'signature board', 'technique panels'],
    after: [1, 2],
    mustCarry: CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS,
    authAndTenantRules: [
      'Chef route is registered as chef-protected.',
      'Surface read models exclude client/public/staff raw private craft facts.',
    ],
    proofRequirements: [
      'canonical runtime proof at http://localhost:3100',
      'mobile proof at 390px and 430px',
    ],
  },
  {
    wave: 4,
    label: 'Public/Client Integration',
    owns: ['profile-safe output', 'client-safe menu stories', 'discovery proof', 'Remy summaries'],
    after: [1, 2, 3],
    mustCarry: CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS,
    authAndTenantRules: [
      'Public outputs consume ProfileSafeCraftOutput only.',
      'Client outputs require scoped client-safe copy and consented evidence.',
    ],
    proofRequirements: ['public leakage tests', 'client-safe redaction tests'],
  },
  {
    wave: 5,
    label: 'Verification',
    owns: ['proof pack', 'wiring audit', 'mobile pass', 'finish-check'],
    after: [1, 2, 3, 4],
    mustCarry: CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS,
    authAndTenantRules: [
      'Audit server actions for requireChef() or requireAuth().',
      'Audit DB queries for user.entityId or user.tenantId tenant scope.',
    ],
    proofRequirements: ['finish-check', 'wiring audit', 'runtime proof', 'mobile pass'],
  },
]

export type CraftSourceRef = {
  source:
    | 'manual_chef_input'
    | 'recipe'
    | 'menu'
    | 'dish_index'
    | 'workflow_note'
    | 'post_event_note'
    | 'client_feedback'
    | 'guest_feedback'
    | 'public_profile'
    | 'discovery'
    | 'media_asset'
    | 'remy_private_summary'
    | 'derived'
  table:
    | 'dish_index'
    | 'dish_appearances'
    | 'dish_feedback'
    | 'guest_feedback'
    | 'workflow_notes'
    | 'dish_index_note_links'
    | 'recipes'
    | 'menus'
    | 'dishes'
    | 'components'
    | 'media_assets'
    | 'chefs'
    | 'chef_taste_preferences'
    | 'events'
    | 'clients'
    | 'public_profile'
    | 'discovery_profile'
    | 'remy_memory_proposals'
    | 'derived'
  rowId: string | null
}

export type CraftNoteContract = {
  id: string | null
  tenantId: string
  chefId: string
  title: string | null
  body: string
  state: CraftEvolutionState
  visibility: CraftVisibilityLevel
  linkedDishId: string | null
  linkedEventId: string | null
  linkedClientId: string | null
  linkedMenuId: string | null
  sourceRefs: CraftSourceRef[]
}

export type DishExperimentContract = {
  id: string | null
  tenantId: string
  chefId: string
  dishId: string | null
  workingName: string
  hypothesis: string | null
  state: CraftEvolutionState
  techniqueGoalIds: string[]
  inspirationSourceIds: string[]
  tastingResultIds: string[]
  clientReactionIds: string[]
  privateNotes: string | null
  visibility: CraftVisibilityLevel
  sourceRefs: CraftSourceRef[]
}

export type SignatureCandidateContract = {
  id: string | null
  tenantId: string
  chefId: string
  dishId: string | null
  experimentId: string | null
  name: string
  state: Extract<
    CraftEvolutionState,
    'idea' | 'tested' | 'served' | 'refined' | 'signature' | 'retired'
  >
  confidence: CraftConfidence
  reasons: string[]
  proofCandidateIds: string[]
  publicReadiness:
    | 'private'
    | 'needs_evidence'
    | 'ready_for_review'
    | 'approved_public'
    | 'published_public'
  visibility: CraftVisibilityLevel
}

export type TechniqueGoalContract = {
  id: string | null
  tenantId: string
  chefId: string
  label: string
  family:
    | 'knife_work'
    | 'sauce'
    | 'fermentation'
    | 'pastry'
    | 'butchery'
    | 'seafood'
    | 'grill_fire'
    | 'plating'
    | 'bread'
    | 'vegetable'
    | 'regional_cuisine'
    | 'service'
    | 'other'
  state: 'planned' | 'practicing' | 'tested' | 'service_ready' | 'mastered' | 'paused'
  target: string | null
  currentEvidence: string[]
  visibility: CraftVisibilityLevel
  sourceRefs: CraftSourceRef[]
}

export type InspirationSourceContract = {
  id: string | null
  tenantId: string
  chefId: string
  kind:
    | 'restaurant'
    | 'travel'
    | 'book'
    | 'market'
    | 'client_request'
    | 'season'
    | 'ingredient'
    | 'mentor'
    | 'class'
    | 'media'
    | 'memory'
    | 'other'
  label: string
  attribution: string | null
  url: string | null
  privateNotes: string | null
  visibility: CraftVisibilityLevel
  sourceRefs: CraftSourceRef[]
}

export type TastingResultContract = {
  id: string | null
  tenantId: string
  chefId: string
  experimentId: string | null
  dishId: string | null
  context: 'bench_test' | 'staff_meal' | 'client_event' | 'class' | 'pop_up' | 'private_tasting'
  tastedAt: string | null
  rating: number | null
  notes: string | null
  defects: string[]
  nextIteration: string | null
  visibility: CraftVisibilityLevel
  sourceRefs: CraftSourceRef[]
}

export type ClientReactionContract = {
  id: string | null
  tenantId: string
  chefId: string
  clientId: string | null
  eventId: string | null
  dishId: string | null
  experimentId: string | null
  reactionType:
    | 'explicit_feedback'
    | 'repeat_request'
    | 'testimonial'
    | 'referral_signal'
    | 'observed'
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' | 'unknown'
  quote: string | null
  summary: string
  canUseInPublicCopy: boolean
  visibility: CraftVisibilityLevel
  sourceRefs: CraftSourceRef[]
}

export type PublicProofCandidateContract = {
  id: string | null
  tenantId: string
  chefId: string
  subjectKind: 'dish' | 'experiment' | 'technique_goal' | 'cuisine_identity' | 'client_reaction'
  subjectId: string | null
  kind:
    | 'photo'
    | 'testimonial'
    | 'menu_story'
    | 'class_topic'
    | 'press'
    | 'review'
    | 'video'
    | 'portfolio_entry'
    | 'discovery_badge'
  state: PublicProofState
  publicCopy: string | null
  evidenceRefs: CraftSourceRef[]
  assetIds: string[]
  approvedByUserId: string | null
  approvedAt: string | null
  visibility: CraftVisibilityLevel
}

export type CuisineIdentitySignal = {
  tenantId: string
  chefId: string
  label: string
  category: 'cuisine' | 'technique' | 'ingredient' | 'season' | 'service_style' | 'point_of_view'
  confidence: CraftConfidence
  visibility: CraftVisibilityLevel
  sourceRefs: CraftSourceRef[]
}

export type ProfileSafeCraftOutput = {
  tenantId: string
  chefId: string
  approvedProofs: PublicProofCandidateContract[]
  signatureDishNames: string[]
  cuisineIdentitySignals: CuisineIdentitySignal[]
  redactedCandidateCount: number
  visibility: 'public_profile' | 'website_only'
}

export type CraftEvolutionLabContract = {
  tenantId: string
  chefId: string
  notes: CraftNoteContract[]
  experiments: DishExperimentContract[]
  signatureCandidates: SignatureCandidateContract[]
  techniqueGoals: TechniqueGoalContract[]
  inspirationSources: InspirationSourceContract[]
  tastingResults: TastingResultContract[]
  clientReactions: ClientReactionContract[]
  publicProofCandidates: PublicProofCandidateContract[]
  cuisineIdentitySignals: CuisineIdentitySignal[]
  visibility: 'private_only'
}

export function deriveMostAdvancedCraftState(
  states: readonly CraftEvolutionState[]
): CraftEvolutionState {
  if (states.length === 0) return 'unknown'
  return states.reduce((current, candidate) =>
    CRAFT_EVOLUTION_STATE_RANK[candidate] > CRAFT_EVOLUTION_STATE_RANK[current]
      ? candidate
      : current
  )
}

export function isPrivateCraftVisibility(
  visibility: CraftVisibilityLevel
): visibility is 'private_only' | 'chef_internal' | 'never_publish' {
  return (
    visibility === 'private_only' ||
    visibility === 'chef_internal' ||
    visibility === 'never_publish'
  )
}

export function isPublicCraftVisibility(
  visibility: CraftVisibilityLevel
): visibility is 'public_profile' | 'website_only' {
  return visibility === 'public_profile' || visibility === 'website_only'
}

export function canPublishCraftProofCandidate(
  candidate: PublicProofCandidateContract
): candidate is PublicProofCandidateContract & { visibility: 'public_profile' | 'website_only' } {
  return (
    isPublicCraftVisibility(candidate.visibility) &&
    (candidate.state === 'approved' || candidate.state === 'published') &&
    candidate.evidenceRefs.length > 0 &&
    Boolean(candidate.publicCopy?.trim())
  )
}

export function buildProfileSafeCraftOutput(input: {
  tenantId: string
  chefId: string
  proofCandidates: PublicProofCandidateContract[]
  signatureCandidates: SignatureCandidateContract[]
  cuisineIdentitySignals: CuisineIdentitySignal[]
  visibility: 'public_profile' | 'website_only'
}): ProfileSafeCraftOutput {
  const approvedProofs = input.proofCandidates.filter(canPublishCraftProofCandidate)
  const signatureDishNames = input.signatureCandidates
    .filter(
      (candidate) =>
        candidate.state === 'signature' &&
        isPublicCraftVisibility(candidate.visibility) &&
        (candidate.publicReadiness === 'approved_public' ||
          candidate.publicReadiness === 'published_public')
    )
    .map((candidate) => candidate.name)

  const cuisineIdentitySignals = input.cuisineIdentitySignals.filter((signal) =>
    isPublicCraftVisibility(signal.visibility)
  )

  return {
    tenantId: input.tenantId,
    chefId: input.chefId,
    approvedProofs,
    signatureDishNames,
    cuisineIdentitySignals,
    redactedCandidateCount:
      input.proofCandidates.length -
      approvedProofs.length +
      input.signatureCandidates.length -
      signatureDishNames.length +
      input.cuisineIdentitySignals.length -
      cuisineIdentitySignals.length,
    visibility: input.visibility,
  }
}

export function getCraftEvolutionLabProgramArchitecture(): CraftEvolutionLabProgramArchitecture {
  return CRAFT_EVOLUTION_LAB_PROGRAM_ARCHITECTURE
}

export function getCraftEvolutionLabSwarmBuildPath(): readonly CraftEvolutionLabBuildWave[] {
  return CRAFT_EVOLUTION_LAB_SWARM_BUILD_PATH
}

export function evaluateCraftEvolutionLabSliceReadiness(
  input: CraftEvolutionLabSliceReadinessInput
): CraftEvolutionLabSliceReadiness {
  const carried = new Set(input.carriedKeys)
  const missingCarryKeys = CRAFT_EVOLUTION_LAB_PROGRAM_CARRY_KEYS.filter((key) => !carried.has(key))

  return {
    queueItemId: input.queueItemId,
    ready: missingCarryKeys.length === 0,
    missingCarryKeys,
  }
}
