import { z } from 'zod'

export const ClientProfileSourceTypeSchema = z.enum([
  'client_record',
  'booking_form',
  'conversation_log',
  'recipe_feedback',
  'stated_preference',
  'meal_request',
  'allergy_record',
  'taste_profile',
  'feedback_request',
  'household_profile',
  'system_inference',
])

export const ClientProfileSubjectKindSchema = z.enum([
  'primary_client',
  'linked_client',
  'managed_member',
])

export const ClientServiceDepthSchema = z.enum([
  'casual_dropoff',
  'casual_family_style',
  'casual_tapas',
  'semi_formal_shared',
  'formal_plated',
  'formal_multi_course',
])

export const ClientEmotionalStateSchema = z.enum([
  'neutral',
  'celebratory',
  'relaxed',
  'stressed',
  'curious',
  'overwhelmed',
])

export const ClientProfileConflictStatusSchema = z.enum([
  'open',
  'pending_user',
  'resolved',
  'dismissed',
])

export const ClientProfileQueryStatusSchema = z.enum([
  'pending',
  'answered',
  'expired',
  'cancelled',
])

export const ClientProfileRecommendationStatusSchema = z.enum([
  'ready',
  'blocked_conflict',
  'no_safe_candidate',
  'superseded',
])

export const ProfileEvidenceRefSchema = z.object({
  sourceType: ClientProfileSourceTypeSchema,
  sourceTable: z.string().nullable(),
  sourceRecordId: z.string().nullable(),
  signalKey: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  observedAt: z.string(),
})

export const ProfilePreferenceSchema = z.object({
  label: z.string(),
  category: z.enum(['dish', 'ingredient', 'cuisine', 'service', 'flavor', 'other']),
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  evidenceRefs: z.array(ProfileEvidenceRefSchema),
})

export const ProfileConstraintSchema = z.object({
  label: z.string(),
  category: z.enum(['allergy', 'dietary', 'dislike', 'medical', 'avoid']),
  severity: z.enum(['hard_veto', 'strong_avoid', 'soft_avoid']),
  rationale: z.string(),
  evidenceRefs: z.array(ProfileEvidenceRefSchema),
})

export const HistoricalConsumptionSchema = z.object({
  item: z.string(),
  category: z.enum(['dish', 'ingredient', 'cuisine', 'service', 'other']),
  consumedCount: z.number().int().nonnegative(),
  positiveCount: z.number().int().nonnegative(),
  negativeCount: z.number().int().nonnegative(),
  satisfactionScore: z.number().min(0).max(1),
  lastSeenAt: z.string().nullable(),
  evidenceRefs: z.array(ProfileEvidenceRefSchema),
})

export const NoveltyOpportunitySchema = z.object({
  item: z.string(),
  category: z.enum(['dish', 'ingredient', 'cuisine', 'service', 'flavor', 'other']),
  noveltyScore: z.number().min(0).max(1),
  reason: z.string(),
  evidenceRefs: z.array(ProfileEvidenceRefSchema),
})

export const HouseholdMemberSummarySchema = z.object({
  subjectKey: z.string(),
  displayName: z.string(),
  role: ClientProfileSubjectKindSchema,
  relationshipLabel: z.string().nullable(),
  likes: z.array(z.string()),
  dislikes: z.array(z.string()),
  vetoes: z.array(z.string()),
})

export const HouseholdAlignmentSchema = z.object({
  strategy: z.enum(['single_profile', 'block_on_any_hard_veto', 'maximize_overlap']),
  members: z.array(HouseholdMemberSummarySchema),
  consensusLikes: z.array(z.string()),
  consensusVetoes: z.array(z.string()),
  tensions: z.array(z.string()),
})

export const AffectiveContextSchema = z.object({
  state: ClientEmotionalStateSchema,
  confidence: z.number().min(0).max(1),
  cues: z.array(z.string()),
  adaptationNotes: z.array(z.string()),
  evidenceRefs: z.array(ProfileEvidenceRefSchema),
})

export const ServiceDepthSummarySchema = z.object({
  preferredDepth: ClientServiceDepthSchema,
  confidence: z.number().min(0).max(1),
  evidenceRefs: z.array(ProfileEvidenceRefSchema),
})

export const ArbitrationQuerySchema = z.object({
  priority: z.number().int().positive(),
  status: ClientProfileQueryStatusSchema.default('pending'),
  question: z.string(),
  reasoning: z.string(),
  options: z.array(z.string()).min(1),
})

export const AmbiguousConstraintSchema = z.object({
  conflictKey: z.string(),
  title: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
  status: ClientProfileConflictStatusSchema,
  requiresUserArbitration: z.boolean(),
  conflictingSignals: z.array(z.string()),
  queries: z.array(ArbitrationQuerySchema),
  evidenceRefs: z.array(ProfileEvidenceRefSchema),
})

export const CoverageSummarySchema = z.object({
  sourceCounts: z.record(z.string(), z.number().int().nonnegative()),
  completenessScore: z.number().min(0).max(1),
  recencyScore: z.number().min(0).max(1),
  consistencyScore: z.number().min(0).max(1),
  overallConfidence: z.number().min(0).max(1),
})

export const CulinaryProfileVectorSchema = z.object({
  schemaVersion: z.literal('cp-engine/vector-v1'),
  vectorId: z.string().uuid().nullable(),
  tenantId: z.string(),
  clientId: z.string(),
  householdId: z.string().nullable(),
  engineVersion: z.string(),
  generatedAt: z.string(),
  statedLikes: z.array(ProfilePreferenceSchema),
  statedDislikes: z.array(ProfilePreferenceSchema),
  hardVetoes: z.array(ProfileConstraintSchema),
  historicalConsumption: z.array(HistoricalConsumptionSchema),
  noveltyPotential: z.array(NoveltyOpportunitySchema),
  affectiveContext: AffectiveContextSchema,
  serviceDepth: ServiceDepthSummarySchema,
  householdAlignment: HouseholdAlignmentSchema.nullable(),
  ambiguousConstraints: z.array(AmbiguousConstraintSchema),
  coverage: CoverageSummarySchema,
})

export const RecommendationCandidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  cuisineTags: z.array(z.string()).default([]),
  ingredientTags: z.array(z.string()).default([]),
  dishTags: z.array(z.string()).default([]),
  flavorTags: z.array(z.string()).default([]),
  serviceDepth: ClientServiceDepthSchema.optional(),
  courseCount: z.number().int().min(1).max(12).optional(),
  comfortScore: z.number().min(0).max(1).default(0.5),
  boldScore: z.number().min(0).max(1).default(0.5),
  complexityScore: z.number().min(0).max(1).default(0.5),
  notes: z.string().optional(),
})

export const ConfidenceJustificationSchema = z.object({
  label: z.string(),
  scoreDelta: z.number(),
  explanation: z.string(),
  evidenceRefs: z.array(ProfileEvidenceRefSchema),
})

export const RecommendationResultSchema = z.object({
  status: ClientProfileRecommendationStatusSchema,
  recommendationId: z.string().uuid().nullable(),
  vectorId: z.string().uuid().nullable(),
  recommendedMeal: RecommendationCandidateSchema.nullable(),
  confidenceScore: z.number().min(0).max(1).nullable(),
  confidenceJustification: z.array(ConfidenceJustificationSchema),
  vetoedCandidates: z.array(
    z.object({
      candidateId: z.string(),
      title: z.string(),
      reasons: z.array(z.string()),
    })
  ),
  blockingConflicts: z.array(AmbiguousConstraintSchema),
})

export const RecommendationRequestSchema = z.object({
  activeEmotionOverride: ClientEmotionalStateSchema.optional(),
  serviceDepthOverride: ClientServiceDepthSchema.optional(),
  candidates: z.array(RecommendationCandidateSchema).min(1),
})

export type ClientProfileSourceType = z.infer<typeof ClientProfileSourceTypeSchema>
export type ClientProfileSubjectKind = z.infer<typeof ClientProfileSubjectKindSchema>
export type ClientServiceDepth = z.infer<typeof ClientServiceDepthSchema>
export type ClientEmotionalState = z.infer<typeof ClientEmotionalStateSchema>
export type ProfileEvidenceRef = z.infer<typeof ProfileEvidenceRefSchema>
export type ProfilePreference = z.infer<typeof ProfilePreferenceSchema>
export type ProfileConstraint = z.infer<typeof ProfileConstraintSchema>
export type HistoricalConsumption = z.infer<typeof HistoricalConsumptionSchema>
export type NoveltyOpportunity = z.infer<typeof NoveltyOpportunitySchema>
export type HouseholdMemberSummary = z.infer<typeof HouseholdMemberSummarySchema>
export type HouseholdAlignment = z.infer<typeof HouseholdAlignmentSchema>
export type AffectiveContext = z.infer<typeof AffectiveContextSchema>
export type ServiceDepthSummary = z.infer<typeof ServiceDepthSummarySchema>
export type ArbitrationQuery = z.infer<typeof ArbitrationQuerySchema>
export type AmbiguousConstraint = z.infer<typeof AmbiguousConstraintSchema>
export type CoverageSummary = z.infer<typeof CoverageSummarySchema>
export type CulinaryProfileVector = z.infer<typeof CulinaryProfileVectorSchema>
export type RecommendationCandidate = z.infer<typeof RecommendationCandidateSchema>
export type ConfidenceJustification = z.infer<typeof ConfidenceJustificationSchema>
export type RecommendationResult = z.infer<typeof RecommendationResultSchema>
export type RecommendationRequest = z.infer<typeof RecommendationRequestSchema>
