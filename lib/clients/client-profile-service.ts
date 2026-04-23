import { createAdminClient } from '@/lib/db/admin'
import { z } from 'zod'
import {
  AffectiveContextSchema,
  type AmbiguousConstraint,
  type ArbitrationQuery,
  type ClientEmotionalState,
  ClientProfileRecommendationStatusSchema,
  type ClientServiceDepth,
  ConfidenceJustificationSchema,
  CulinaryProfileVectorSchema,
  type CulinaryProfileVector,
  type HistoricalConsumption,
  type HouseholdAlignment,
  type HouseholdMemberSummary,
  type NoveltyOpportunity,
  type ProfileConstraint,
  type ProfileEvidenceRef,
  type ProfilePreference,
  RecommendationRequestSchema,
  type RecommendationCandidate,
  RecommendationResultSchema,
  type RecommendationResult,
  ServiceDepthSummarySchema,
} from './client-profile-service-schema'

export const CLIENT_PROFILE_ENGINE_VERSION = 'cp-engine/v0.1.0'

type DbClient = {
  from: (table: string) => any
}

type BaseClientRecord = {
  id: string
  full_name: string
  preferred_name?: string | null
  dietary_restrictions?: string[] | null
  dietary_protocols?: string[] | null
  allergies?: string[] | null
  dislikes?: string[] | null
  spice_tolerance?: string | null
  favorite_cuisines?: string[] | null
  favorite_dishes?: string[] | null
  preferred_service_style?: string | null
  updated_at?: string | null
}

type AllergyRecord = {
  id?: string
  allergen: string
  severity?: string | null
  confirmed_by_chef?: boolean | null
  updated_at?: string | null
  created_at?: string | null
}

type TasteProfileRecord = {
  favorite_cuisines?: string[] | null
  disliked_ingredients?: string[] | null
  spice_tolerance?: number | null
  preferred_proteins?: string[] | null
  avoids?: string[] | null
  flavor_notes?: string | null
  updated_at?: string | null
}

type PreferenceRecord = {
  item_type?: string | null
  item_name?: string | null
  rating?: string | null
  observed_at?: string | null
  notes?: string | null
}

type ServedDishRecord = {
  id?: string
  dish_name?: string | null
  client_reaction?: string | null
  served_date?: string | null
  client_feedback_at?: string | null
}

type MealRequestRecord = {
  id?: string
  request_type?: string | null
  dish_name?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type EventRecord = {
  id?: string
  event_date?: string | null
  guest_count?: number | null
  service_style?: string | null
  status?: string | null
}

type InquiryRecord = {
  id?: string
  source_message?: string | null
  confirmed_occasion?: string | null
  confirmed_dietary_restrictions?: string[] | null
  service_style_pref?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type MessageRecord = {
  id?: string
  subject?: string | null
  body?: string | null
  direction?: string | null
  created_at?: string | null
  sent_at?: string | null
}

type CommunicationLogRecord = {
  id?: string
  subject?: string | null
  content?: string | null
  direction?: string | null
  created_at?: string | null
}

type FeedbackRequestRecord = {
  id: string
  entity_type?: string | null
  entity_id?: string | null
  created_at?: string | null
}

type FeedbackResponseRecord = {
  request_id: string
  rating?: number | null
  comment?: string | null
  tags?: string[] | null
  created_at?: string | null
}

type HouseholdRecord = {
  id: string
  name: string
  primary_client_id?: string | null
}

type HouseholdMemberRecord = {
  household_id: string
  client_id: string
  relationship: string
}

type ManagedSubjectRecord = {
  id: string
  subject_kind: 'primary_client' | 'linked_client' | 'managed_member'
  display_name: string
  relationship_label?: string | null
  profile_payload?: Record<string, unknown> | null
  household_id?: string | null
}

export interface ClientProfileSourceBundle {
  tenantId: string
  client: BaseClientRecord
  allergyRecords: AllergyRecord[]
  tasteProfile: TasteProfileRecord | null
  preferences: PreferenceRecord[]
  servedDishes: ServedDishRecord[]
  mealRequests: MealRequestRecord[]
  events: EventRecord[]
  inquiries: InquiryRecord[]
  messages: MessageRecord[]
  communicationLogs: CommunicationLogRecord[]
  feedbackRequests: FeedbackRequestRecord[]
  feedbackResponses: FeedbackResponseRecord[]
  households: HouseholdRecord[]
  householdMembers: HouseholdMemberRecord[]
  linkedClients: BaseClientRecord[]
  managedSubjects: ManagedSubjectRecord[]
}

type SignalAccumulator = {
  label: string
  category: ProfilePreference['category']
  score: number
  confidence: number
  evidenceRefs: ProfileEvidenceRef[]
}

type ConstraintAccumulator = {
  label: string
  category: ProfileConstraint['category']
  severity: ProfileConstraint['severity']
  rationale: string
  evidenceRefs: ProfileEvidenceRef[]
}

type ConsumptionAccumulator = {
  item: string
  category: HistoricalConsumption['category']
  consumedCount: number
  positiveCount: number
  negativeCount: number
  satisfactionTotal: number
  satisfactionSamples: number
  lastSeenAt: string | null
  evidenceRefs: ProfileEvidenceRef[]
}

type ServiceVote = {
  score: number
  refs: ProfileEvidenceRef[]
}

const EXPECTED_SOURCE_COUNT = 7
const HIGH_SPICE_ALIASES = ['spice', 'spicy', 'heat', 'chili', 'chilli', 'pepper', 'capsaicin']
const SPICE_ALLERGEN_ALIASES = ['chili', 'chilli', 'pepper', 'capsaicin']

const EMOTION_PATTERNS: Array<{
  state: ClientEmotionalState
  keywords: string[]
  adaptationNotes: string[]
}> = [
  {
    state: 'celebratory',
    keywords: ['celebrate', 'celebration', 'birthday', 'anniversary', 'party', 'excited', 'special'],
    adaptationNotes: ['Lean into bold flavors and a higher-theater presentation.'],
  },
  {
    state: 'stressed',
    keywords: ['stress', 'stressed', 'overwhelmed', 'busy', 'exhausted', 'tired', 'rough week'],
    adaptationNotes: ['Bias toward comfort-forward dishes and lower operational complexity.'],
  },
  {
    state: 'relaxed',
    keywords: ['relax', 'relaxed', 'calm', 'cozy', 'easygoing', 'gentle'],
    adaptationNotes: ['Favor elegant simplicity over highly technical plating.'],
  },
  {
    state: 'curious',
    keywords: ['curious', 'adventurous', 'explore', 'try something new', 'new idea', 'surprise me'],
    adaptationNotes: ['Reserve room for novelty and one exploratory flavor move.'],
  },
  {
    state: 'overwhelmed',
    keywords: ['too much', 'chaotic', 'last minute', 'short notice', 'scrambling'],
    adaptationNotes: ['Minimize menu entropy and prefer decisive, low-risk compositions.'],
  },
]

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.length > 0 ? cleaned : null
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of values) {
    const value = cleanText(raw)
    if (!value) continue
    const key = normalizeKey(value)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }

  return result
}

function tokenize(value: string): string[] {
  return normalizeKey(value)
    .split(/[^a-z0-9]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
}

function overlapsValue(left: string, right: string): boolean {
  const leftKey = normalizeKey(left)
  const rightKey = normalizeKey(right)
  if (leftKey === rightKey) return true
  if (leftKey.includes(rightKey) || rightKey.includes(leftKey)) return true

  const leftTokens = new Set(tokenize(left))
  const rightTokens = tokenize(right)
  return rightTokens.some((token) => leftTokens.has(token))
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function mergeEvidenceRefs(
  existing: ProfileEvidenceRef[],
  next: ProfileEvidenceRef[]
): ProfileEvidenceRef[] {
  const byKey = new Map<string, ProfileEvidenceRef>()

  for (const ref of [...existing, ...next]) {
    const key = [
      ref.sourceType,
      ref.sourceTable ?? '',
      ref.sourceRecordId ?? '',
      ref.signalKey,
      normalizeKey(ref.value),
      ref.observedAt,
    ].join('|')
    if (!byKey.has(key)) byKey.set(key, ref)
  }

  return [...byKey.values()]
}

function makeEvidenceRef(input: {
  sourceType: ProfileEvidenceRef['sourceType']
  sourceTable?: string | null
  sourceRecordId?: string | null
  signalKey: string
  value: string
  confidence?: number
  observedAt?: string | null
}): ProfileEvidenceRef {
  return {
    sourceType: input.sourceType,
    sourceTable: input.sourceTable ?? null,
    sourceRecordId: input.sourceRecordId ?? null,
    signalKey: input.signalKey,
    value: input.value,
    confidence: clamp01(input.confidence ?? 0.5),
    observedAt: input.observedAt ?? new Date().toISOString(),
  }
}

function addPreference(
  map: Map<string, SignalAccumulator>,
  input: {
    label: string
    category: ProfilePreference['category']
    score: number
    confidence: number
    evidenceRef: ProfileEvidenceRef
  }
) {
  const key = `${input.category}:${normalizeKey(input.label)}`
  const current = map.get(key)

  if (!current) {
    map.set(key, {
      label: input.label,
      category: input.category,
      score: clamp01(input.score),
      confidence: clamp01(input.confidence),
      evidenceRefs: [input.evidenceRef],
    })
    return
  }

  current.score = clamp01(current.score + input.score)
  current.confidence = clamp01(Math.max(current.confidence, input.confidence))
  current.evidenceRefs = mergeEvidenceRefs(current.evidenceRefs, [input.evidenceRef])
}

function severityRank(severity: ProfileConstraint['severity']): number {
  switch (severity) {
    case 'hard_veto':
      return 3
    case 'strong_avoid':
      return 2
    case 'soft_avoid':
      return 1
  }
}

function addConstraint(
  map: Map<string, ConstraintAccumulator>,
  input: {
    label: string
    category: ProfileConstraint['category']
    severity: ProfileConstraint['severity']
    rationale: string
    evidenceRef: ProfileEvidenceRef
  }
) {
  const key = `${input.category}:${normalizeKey(input.label)}`
  const current = map.get(key)

  if (!current) {
    map.set(key, {
      label: input.label,
      category: input.category,
      severity: input.severity,
      rationale: input.rationale,
      evidenceRefs: [input.evidenceRef],
    })
    return
  }

  if (severityRank(input.severity) > severityRank(current.severity)) {
    current.severity = input.severity
    current.rationale = input.rationale
  }
  current.evidenceRefs = mergeEvidenceRefs(current.evidenceRefs, [input.evidenceRef])
}

function addConsumption(
  map: Map<string, ConsumptionAccumulator>,
  input: {
    item: string
    category: HistoricalConsumption['category']
    sentiment: number | null
    observedAt: string | null
    evidenceRef: ProfileEvidenceRef
  }
) {
  const key = `${input.category}:${normalizeKey(input.item)}`
  const current = map.get(key)

  if (!current) {
    map.set(key, {
      item: input.item,
      category: input.category,
      consumedCount: 1,
      positiveCount: input.sentiment !== null && input.sentiment >= 0.7 ? 1 : 0,
      negativeCount: input.sentiment !== null && input.sentiment <= 0.35 ? 1 : 0,
      satisfactionTotal: input.sentiment ?? 0,
      satisfactionSamples: input.sentiment !== null ? 1 : 0,
      lastSeenAt: input.observedAt,
      evidenceRefs: [input.evidenceRef],
    })
    return
  }

  current.consumedCount += 1
  if (input.sentiment !== null) {
    current.satisfactionTotal += input.sentiment
    current.satisfactionSamples += 1
    if (input.sentiment >= 0.7) current.positiveCount += 1
    if (input.sentiment <= 0.35) current.negativeCount += 1
  }
  if (input.observedAt && (!current.lastSeenAt || input.observedAt > current.lastSeenAt)) {
    current.lastSeenAt = input.observedAt
  }
  current.evidenceRefs = mergeEvidenceRefs(current.evidenceRefs, [input.evidenceRef])
}

function buildPreferenceList(map: Map<string, SignalAccumulator>): ProfilePreference[] {
  return [...map.values()]
    .map((value) => ({
      label: value.label,
      category: value.category,
      score: clamp01(value.score),
      confidence: clamp01(value.confidence),
      evidenceRefs: value.evidenceRefs,
    }))
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
}

function buildConstraintList(map: Map<string, ConstraintAccumulator>): ProfileConstraint[] {
  return [...map.values()]
    .map((value) => ({
      label: value.label,
      category: value.category,
      severity: value.severity,
      rationale: value.rationale,
      evidenceRefs: value.evidenceRefs,
    }))
    .sort(
      (left, right) =>
        severityRank(right.severity) - severityRank(left.severity) ||
        left.label.localeCompare(right.label)
    )
}

function buildConsumptionList(map: Map<string, ConsumptionAccumulator>): HistoricalConsumption[] {
  return [...map.values()]
    .map((value) => ({
      item: value.item,
      category: value.category,
      consumedCount: value.consumedCount,
      positiveCount: value.positiveCount,
      negativeCount: value.negativeCount,
      satisfactionScore:
        value.satisfactionSamples > 0
          ? clamp01(value.satisfactionTotal / value.satisfactionSamples)
          : 0.5,
      lastSeenAt: value.lastSeenAt,
      evidenceRefs: value.evidenceRefs,
    }))
    .sort(
      (left, right) =>
        right.consumedCount - left.consumedCount ||
        right.satisfactionScore - left.satisfactionScore ||
        left.item.localeCompare(right.item)
    )
}

function inferPreferenceCategory(rawType: string | null | undefined): ProfilePreference['category'] {
  switch (normalizeKey(rawType ?? '')) {
    case 'dish':
      return 'dish'
    case 'ingredient':
      return 'ingredient'
    case 'cuisine':
      return 'cuisine'
    case 'technique':
      return 'other'
    default:
      return 'other'
  }
}

function sentimentFromReaction(raw: string | null | undefined): number | null {
  switch (normalizeKey(raw ?? '')) {
    case 'loved':
      return 1
    case 'liked':
      return 0.8
    case 'neutral':
      return 0.5
    case 'disliked':
      return 0.15
    default:
      return null
  }
}

function mapServiceDepth(raw: string | null | undefined): ClientServiceDepth | null {
  const value = normalizeKey(raw ?? '')
  if (!value) return null
  if (value.includes('tasting') || value.includes('multi course') || value.includes('multicourse')) {
    return 'formal_multi_course'
  }
  if (value.includes('plated') || value.includes('formal')) return 'formal_plated'
  if (value.includes('family')) return 'casual_family_style'
  if (value.includes('tapas') || value.includes('cocktail') || value.includes('small plate')) {
    return 'casual_tapas'
  }
  if (value.includes('drop') || value.includes('meal prep') || value.includes('delivery')) {
    return 'casual_dropoff'
  }
  if (value.includes('buffet') || value.includes('shared')) return 'semi_formal_shared'
  return 'semi_formal_shared'
}

function isHighSpicePreference(raw: string | null | undefined): boolean {
  const value = normalizeKey(raw ?? '')
  return value === 'hot' || value === 'very_hot'
}

function buildAffectiveContext(bundle: ClientProfileSourceBundle): z.infer<typeof AffectiveContextSchema> {
  const textSources: Array<{ text: string; ref: ProfileEvidenceRef }> = []

  for (const inquiry of bundle.inquiries) {
    const message = cleanText(inquiry.source_message)
    if (message) {
      textSources.push({
        text: message,
        ref: makeEvidenceRef({
          sourceType: 'booking_form',
          sourceTable: 'inquiries',
          sourceRecordId: inquiry.id ?? null,
          signalKey: 'affective_context',
          value: message,
          confidence: 0.55,
          observedAt: inquiry.updated_at ?? inquiry.created_at ?? null,
        }),
      })
    }

    const occasion = cleanText(inquiry.confirmed_occasion)
    if (occasion) {
      textSources.push({
        text: occasion,
        ref: makeEvidenceRef({
          sourceType: 'booking_form',
          sourceTable: 'inquiries',
          sourceRecordId: inquiry.id ?? null,
          signalKey: 'occasion',
          value: occasion,
          confidence: 0.5,
          observedAt: inquiry.updated_at ?? inquiry.created_at ?? null,
        }),
      })
    }
  }

  for (const message of bundle.messages) {
    const body = cleanText([message.subject, message.body].filter(Boolean).join(' '))
    if (!body) continue
    textSources.push({
      text: body,
      ref: makeEvidenceRef({
        sourceType: 'conversation_log',
        sourceTable: 'messages',
        sourceRecordId: message.id ?? null,
        signalKey: 'conversation_excerpt',
        value: body,
        confidence: 0.45,
        observedAt: message.sent_at ?? message.created_at ?? null,
      }),
    })
  }

  for (const log of bundle.communicationLogs) {
    const body = cleanText([log.subject, log.content].filter(Boolean).join(' '))
    if (!body) continue
    textSources.push({
      text: body,
      ref: makeEvidenceRef({
        sourceType: 'conversation_log',
        sourceTable: 'communication_log',
        sourceRecordId: log.id ?? null,
        signalKey: 'communication_log',
        value: body,
        confidence: 0.4,
        observedAt: log.created_at ?? null,
      }),
    })
  }

  const scoreByState = new Map<ClientEmotionalState, { count: number; refs: ProfileEvidenceRef[] }>()

  for (const source of textSources) {
    const text = normalizeKey(source.text)
    for (const pattern of EMOTION_PATTERNS) {
      if (!pattern.keywords.some((keyword) => text.includes(keyword))) continue
      const current = scoreByState.get(pattern.state) ?? { count: 0, refs: [] }
      current.count += 1
      current.refs = mergeEvidenceRefs(current.refs, [source.ref])
      scoreByState.set(pattern.state, current)
    }
  }

  const best = [...scoreByState.entries()].sort((left, right) => right[1].count - left[1].count)[0]
  if (!best) {
    return {
      state: 'neutral',
      confidence: 0.35,
      cues: [],
      adaptationNotes: ['Default to balanced, medium-risk menu structures.'],
      evidenceRefs: [],
    }
  }

  const pattern = EMOTION_PATTERNS.find((entry) => entry.state === best[0])!
  return {
    state: best[0],
    confidence: clamp01(0.45 + best[1].count * 0.12),
    cues: pattern.keywords.filter((keyword) =>
      textSources.some((source) => normalizeKey(source.text).includes(keyword))
    ),
    adaptationNotes: pattern.adaptationNotes,
    evidenceRefs: best[1].refs,
  }
}

function buildServiceDepth(
  bundle: ClientProfileSourceBundle
): z.infer<typeof ServiceDepthSummarySchema> {
  const votes = new Map<ClientServiceDepth, ServiceVote>()

  function addVote(depth: ClientServiceDepth | null, ref: ProfileEvidenceRef, weight: number) {
    if (!depth) return
    const current = votes.get(depth) ?? { score: 0, refs: [] }
    current.score += weight
    current.refs = mergeEvidenceRefs(current.refs, [ref])
    votes.set(depth, current)
  }

  if (bundle.client.preferred_service_style) {
    addVote(
      mapServiceDepth(bundle.client.preferred_service_style),
      makeEvidenceRef({
        sourceType: 'client_record',
        sourceTable: 'clients',
        sourceRecordId: bundle.client.id,
        signalKey: 'preferred_service_style',
        value: bundle.client.preferred_service_style,
        confidence: 0.8,
        observedAt: bundle.client.updated_at ?? null,
      }),
      1.25
    )
  }

  for (const inquiry of bundle.inquiries) {
    const depth = mapServiceDepth(inquiry.service_style_pref)
    if (!depth || !inquiry.service_style_pref) continue
    addVote(
      depth,
      makeEvidenceRef({
        sourceType: 'booking_form',
        sourceTable: 'inquiries',
        sourceRecordId: inquiry.id ?? null,
        signalKey: 'service_style_pref',
        value: inquiry.service_style_pref,
        confidence: 0.65,
        observedAt: inquiry.updated_at ?? inquiry.created_at ?? null,
      }),
      0.9
    )
  }

  for (const event of bundle.events) {
    const depth = mapServiceDepth(event.service_style)
    if (!depth || !event.service_style) continue
    addVote(
      depth,
      makeEvidenceRef({
        sourceType: 'stated_preference',
        sourceTable: 'events',
        sourceRecordId: event.id ?? null,
        signalKey: 'service_style',
        value: event.service_style,
        confidence: 0.6,
        observedAt: event.event_date ?? null,
      }),
      0.75
    )
  }

  const best =
    [...votes.entries()].sort((left, right) => right[1].score - left[1].score)[0] ??
    ([
      'semi_formal_shared',
      { score: 0.3, refs: [] },
    ] as const)

  return {
    preferredDepth: best[0],
    confidence: clamp01(best[1].score / 2),
    evidenceRefs: best[1].refs,
  }
}

function buildHouseholdAlignment(
  bundle: ClientProfileSourceBundle,
  likes: ProfilePreference[],
  hardVetoes: ProfileConstraint[]
): HouseholdAlignment | null {
  const members: HouseholdMemberSummary[] = []

  const primaryLikes = uniqueStrings(
    likes
      .filter((preference) => preference.category === 'dish' || preference.category === 'cuisine')
      .map((preference) => preference.label)
  )
  const primaryDislikes = uniqueStrings(
    bundle.client.dislikes ?? []
  )
  const primaryVetoes = uniqueStrings([
    ...(bundle.client.allergies ?? []),
    ...(bundle.client.dietary_restrictions ?? []),
    ...primaryDislikes,
  ])

  members.push({
    subjectKey: bundle.client.id,
    displayName: cleanText(bundle.client.preferred_name) ?? bundle.client.full_name,
    role: 'primary_client',
    relationshipLabel: 'decision_maker',
    likes: primaryLikes,
    dislikes: primaryDislikes,
    vetoes: primaryVetoes,
  })

  for (const linked of bundle.linkedClients) {
    members.push({
      subjectKey: linked.id,
      displayName: linked.full_name,
      role: 'linked_client',
      relationshipLabel:
        bundle.householdMembers.find((member) => member.client_id === linked.id)?.relationship ?? null,
      likes: uniqueStrings([...(linked.favorite_cuisines ?? []), ...(linked.favorite_dishes ?? [])]),
      dislikes: uniqueStrings(linked.dislikes ?? []),
      vetoes: uniqueStrings([
        ...(linked.allergies ?? []),
        ...(linked.dietary_restrictions ?? []),
        ...(linked.dislikes ?? []),
      ]),
    })
  }

  for (const managed of bundle.managedSubjects) {
    const payload = (managed.profile_payload ?? {}) as Record<string, unknown>
    const likesFromPayload = uniqueStrings([
      ...(((payload.likes as string[] | undefined) ?? []) as string[]),
      ...(((payload.favoriteDishes as string[] | undefined) ?? []) as string[]),
      ...(((payload.favoriteCuisines as string[] | undefined) ?? []) as string[]),
    ])
    const dislikesFromPayload = uniqueStrings(((payload.dislikes as string[] | undefined) ?? []) as string[])
    const vetoesFromPayload = uniqueStrings([
      ...(((payload.vetoes as string[] | undefined) ?? []) as string[]),
      ...(((payload.allergies as string[] | undefined) ?? []) as string[]),
      ...(((payload.dietaryRestrictions as string[] | undefined) ?? []) as string[]),
    ])

    members.push({
      subjectKey: managed.id,
      displayName: managed.display_name,
      role: managed.subject_kind,
      relationshipLabel: managed.relationship_label ?? null,
      likes: likesFromPayload,
      dislikes: dislikesFromPayload,
      vetoes: vetoesFromPayload,
    })
  }

  if (members.length <= 1) return null

  const consensusLikes = uniqueStrings(
    members
      .flatMap((member) =>
        member.likes.filter((like) =>
          members.filter((candidate) => candidate.likes.some((value) => overlapsValue(value, like))).length > 1
        )
      )
  )
  const consensusVetoes = uniqueStrings(members.flatMap((member) => member.vetoes))
  const tensions = uniqueStrings(
    members.flatMap((member) =>
      member.likes.filter((like) =>
        members.some(
          (other) => other.subjectKey !== member.subjectKey && other.vetoes.some((veto) => overlapsValue(veto, like))
        )
      )
    )
  )

  const strategy =
    consensusVetoes.length > 0 ? 'block_on_any_hard_veto' : members.length > 1 ? 'maximize_overlap' : 'single_profile'

  return {
    strategy,
    members,
    consensusLikes,
    consensusVetoes,
    tensions,
  }
}

function buildAmbiguousConstraints(
  likes: ProfilePreference[],
  hardVetoes: ProfileConstraint[],
  affectiveContext: z.infer<typeof AffectiveContextSchema>,
  householdAlignment: HouseholdAlignment | null
): AmbiguousConstraint[] {
  const conflicts = new Map<string, AmbiguousConstraint>()

  function upsertConflict(conflict: AmbiguousConstraint) {
    const current = conflicts.get(conflict.conflictKey)
    if (!current) {
      conflicts.set(conflict.conflictKey, conflict)
      return
    }
    current.conflictingSignals = uniqueStrings([
      ...current.conflictingSignals,
      ...conflict.conflictingSignals,
    ])
    current.evidenceRefs = mergeEvidenceRefs(current.evidenceRefs, conflict.evidenceRefs)
    current.queries = [...current.queries, ...conflict.queries]
  }

  for (const like of likes) {
    for (const veto of hardVetoes) {
      if (!overlapsValue(like.label, veto.label)) continue
      upsertConflict({
        conflictKey: `value-conflict:${normalizeKey(like.label)}:${normalizeKey(veto.label)}`,
        title: `Preference conflicts with veto: ${like.label}`,
        severity: veto.severity === 'hard_veto' ? 'critical' : 'warning',
        status: 'pending_user',
        requiresUserArbitration: true,
        conflictingSignals: [like.label, veto.label],
        queries: [
          {
            priority: 1,
            status: 'pending',
            question: `Should "${veto.label}" be treated as an absolute veto for future menus?`,
            reasoning: `The profile currently contains both a positive preference and a veto-adjacent signal for ${like.label}.`,
            options: [
              `Yes, treat ${veto.label} as an absolute veto`,
              `Allow safe alternatives without ${veto.label}`,
              'Need manual review before menu proposal',
            ],
          },
        ],
        evidenceRefs: mergeEvidenceRefs(like.evidenceRefs, veto.evidenceRefs),
      })
    }
  }

  const spiceLike = likes.find((like) =>
    HIGH_SPICE_ALIASES.some((alias) => overlapsValue(like.label, alias))
  )
  const chiliVeto = hardVetoes.find((constraint) =>
    SPICE_ALLERGEN_ALIASES.some((alias) => overlapsValue(constraint.label, alias))
  )

  if (spiceLike && chiliVeto) {
    upsertConflict({
      conflictKey: 'spice-vs-chili-veto',
      title: 'Ambiguous constraint: spice preference vs chili veto',
      severity: 'critical',
      status: 'pending_user',
      requiresUserArbitration: true,
      conflictingSignals: [spiceLike.label, chiliVeto.label],
      queries: [
        {
          priority: 1,
          status: 'pending',
          question: 'Can the menu use non-chili heat, or should all spicy preparations be excluded?',
          reasoning: 'The client profile asks for spice, but a chili-family veto is also present.',
          options: [
            'Use zero chili and zero pepper heat',
            'Allow non-chili heat only',
            'Pause menu generation for manual clarification',
          ],
        },
      ],
      evidenceRefs: mergeEvidenceRefs(spiceLike.evidenceRefs, chiliVeto.evidenceRefs),
    })
  }

  if (householdAlignment && householdAlignment.tensions.length > 0) {
    for (const tension of householdAlignment.tensions) {
      upsertConflict({
        conflictKey: `household-tension:${normalizeKey(tension)}`,
        title: `Household profile tension around ${tension}`,
        severity: 'warning',
        status: 'pending_user',
        requiresUserArbitration: true,
        conflictingSignals: [tension],
        queries: [
          {
            priority: 2,
            status: 'pending',
            question: `For household planning, should "${tension}" be optimized for one member, split into variants, or excluded?`,
            reasoning: 'Different members of the same household currently point in opposite directions.',
            options: [
              'Optimize for the primary client',
              'Split menu variants across members',
              `Exclude ${tension} from shared menus`,
            ],
          },
        ],
        evidenceRefs: [],
      })
    }
  }

  if (
    affectiveContext.state === 'stressed' &&
    likes.some((like) => like.category === 'service' && like.score >= 0.7)
  ) {
    upsertConflict({
      conflictKey: 'service-depth-vs-stress',
      title: 'Stress context may conflict with high-complexity service expectations',
      severity: 'info',
      status: 'open',
      requiresUserArbitration: false,
      conflictingSignals: ['stressed context', 'high-service expectations'],
      queries: [],
      evidenceRefs: affectiveContext.evidenceRefs,
    })
  }

  return [...conflicts.values()].sort((left, right) => {
    const severityRank: Record<AmbiguousConstraint['severity'], number> = {
      critical: 3,
      warning: 2,
      info: 1,
    }
    return severityRank[right.severity] - severityRank[left.severity]
  })
}

function buildCoverageSummary(vector: Omit<CulinaryProfileVector, 'coverage'>) {
  const refs = collectVectorEvidenceRefs(vector)
  const sourceCounts = refs.reduce<Record<string, number>>((acc, ref) => {
    acc[ref.sourceType] = (acc[ref.sourceType] ?? 0) + 1
    return acc
  }, {})

  const mostRecent = refs
    .map((ref) => Date.parse(ref.observedAt))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => right - left)[0]

  let recencyScore = 0.35
  if (mostRecent) {
    const ageDays = (Date.now() - mostRecent) / (1000 * 60 * 60 * 24)
    if (ageDays <= 14) recencyScore = 1
    else if (ageDays <= 45) recencyScore = 0.8
    else if (ageDays <= 90) recencyScore = 0.55
  }

  const completenessScore = clamp01(Object.keys(sourceCounts).length / EXPECTED_SOURCE_COUNT)
  const consistencyScore = clamp01(1 - vector.ambiguousConstraints.length * 0.18)
  const signalDensity = clamp01(
    (vector.statedLikes.length + vector.hardVetoes.length + vector.historicalConsumption.length) / 18
  )
  const overallConfidence = clamp01(
    completenessScore * 0.35 +
      recencyScore * 0.25 +
      consistencyScore * 0.2 +
      signalDensity * 0.2
  )

  return {
    sourceCounts,
    completenessScore,
    recencyScore,
    consistencyScore,
    overallConfidence,
  }
}

function collectVectorEvidenceRefs(vector: Omit<CulinaryProfileVector, 'coverage'> | CulinaryProfileVector) {
  let refs: ProfileEvidenceRef[] = []

  for (const item of vector.statedLikes) refs = mergeEvidenceRefs(refs, item.evidenceRefs)
  for (const item of vector.statedDislikes) refs = mergeEvidenceRefs(refs, item.evidenceRefs)
  for (const item of vector.hardVetoes) refs = mergeEvidenceRefs(refs, item.evidenceRefs)
  for (const item of vector.historicalConsumption) refs = mergeEvidenceRefs(refs, item.evidenceRefs)
  for (const item of vector.noveltyPotential) refs = mergeEvidenceRefs(refs, item.evidenceRefs)
  refs = mergeEvidenceRefs(refs, vector.affectiveContext.evidenceRefs)
  refs = mergeEvidenceRefs(refs, vector.serviceDepth.evidenceRefs)
  for (const item of vector.ambiguousConstraints) refs = mergeEvidenceRefs(refs, item.evidenceRefs)

  return refs
}

export function buildCulinaryProfileVector(bundle: ClientProfileSourceBundle): CulinaryProfileVector {
  const likeSignals = new Map<string, SignalAccumulator>()
  const dislikeSignals = new Map<string, SignalAccumulator>()
  const hardVetoSignals = new Map<string, ConstraintAccumulator>()
  const historicalConsumption = new Map<string, ConsumptionAccumulator>()

  if (!bundle.client?.id) {
    throw new Error('Client record is required to build a profile vector')
  }

  for (const allergy of uniqueStrings(bundle.client.allergies ?? [])) {
    addConstraint(hardVetoSignals, {
      label: allergy,
      category: 'allergy',
      severity: 'hard_veto',
      rationale: 'Explicit allergy recorded on the client profile.',
      evidenceRef: makeEvidenceRef({
        sourceType: 'client_record',
        sourceTable: 'clients',
        sourceRecordId: bundle.client.id,
        signalKey: 'allergy',
        value: allergy,
        confidence: 0.9,
        observedAt: bundle.client.updated_at ?? null,
      }),
    })
  }

  for (const restriction of uniqueStrings([
    ...(bundle.client.dietary_restrictions ?? []),
    ...(bundle.client.dietary_protocols ?? []),
  ])) {
    addConstraint(hardVetoSignals, {
      label: restriction,
      category: 'dietary',
      severity: 'hard_veto',
      rationale: 'Dietary or medical restriction recorded on the client profile.',
      evidenceRef: makeEvidenceRef({
        sourceType: 'client_record',
        sourceTable: 'clients',
        sourceRecordId: bundle.client.id,
        signalKey: 'dietary_restriction',
        value: restriction,
        confidence: 0.88,
        observedAt: bundle.client.updated_at ?? null,
      }),
    })
  }

  for (const dislike of uniqueStrings(bundle.client.dislikes ?? [])) {
    const ref = makeEvidenceRef({
      sourceType: 'client_record',
      sourceTable: 'clients',
      sourceRecordId: bundle.client.id,
      signalKey: 'explicit_dislike',
      value: dislike,
      confidence: 0.85,
      observedAt: bundle.client.updated_at ?? null,
    })
    addConstraint(hardVetoSignals, {
      label: dislike,
      category: 'dislike',
      severity: 'hard_veto',
      rationale: 'Explicit dislike treated as a no-go input for menu generation.',
      evidenceRef: ref,
    })
    addPreference(dislikeSignals, {
      label: dislike,
      category: 'other',
      score: 0.85,
      confidence: 0.85,
      evidenceRef: ref,
    })
  }

  for (const cuisine of uniqueStrings(bundle.client.favorite_cuisines ?? [])) {
    addPreference(likeSignals, {
      label: cuisine,
      category: 'cuisine',
      score: 0.8,
      confidence: 0.82,
      evidenceRef: makeEvidenceRef({
        sourceType: 'client_record',
        sourceTable: 'clients',
        sourceRecordId: bundle.client.id,
        signalKey: 'favorite_cuisine',
        value: cuisine,
        confidence: 0.82,
        observedAt: bundle.client.updated_at ?? null,
      }),
    })
  }

  for (const dish of uniqueStrings(bundle.client.favorite_dishes ?? [])) {
    addPreference(likeSignals, {
      label: dish,
      category: 'dish',
      score: 0.88,
      confidence: 0.84,
      evidenceRef: makeEvidenceRef({
        sourceType: 'client_record',
        sourceTable: 'clients',
        sourceRecordId: bundle.client.id,
        signalKey: 'favorite_dish',
        value: dish,
        confidence: 0.84,
        observedAt: bundle.client.updated_at ?? null,
      }),
    })
  }

  if (isHighSpicePreference(bundle.client.spice_tolerance)) {
    addPreference(likeSignals, {
      label: 'spice',
      category: 'flavor',
      score: 0.65,
      confidence: 0.72,
      evidenceRef: makeEvidenceRef({
        sourceType: 'client_record',
        sourceTable: 'clients',
        sourceRecordId: bundle.client.id,
        signalKey: 'spice_preference',
        value: bundle.client.spice_tolerance ?? 'spice',
        confidence: 0.72,
        observedAt: bundle.client.updated_at ?? null,
      }),
    })
  }

  for (const record of bundle.allergyRecords) {
    const label = cleanText(record.allergen)
    if (!label) continue
    const severity = normalizeKey(record.severity ?? '')
    addConstraint(hardVetoSignals, {
      label,
      category: severity === 'preference' ? 'avoid' : 'allergy',
      severity: severity === 'preference' ? 'strong_avoid' : 'hard_veto',
      rationale:
        record.confirmed_by_chef === false
          ? 'Unconfirmed structured allergy record.'
          : 'Structured allergy record.',
      evidenceRef: makeEvidenceRef({
        sourceType: 'allergy_record',
        sourceTable: 'client_allergy_records',
        sourceRecordId: record.id ?? null,
        signalKey: 'allergy_record',
        value: label,
        confidence: record.confirmed_by_chef === false ? 0.72 : 0.92,
        observedAt: record.updated_at ?? record.created_at ?? null,
      }),
    })
  }

  if (bundle.tasteProfile) {
    for (const cuisine of uniqueStrings(bundle.tasteProfile.favorite_cuisines ?? [])) {
      addPreference(likeSignals, {
        label: cuisine,
        category: 'cuisine',
        score: 0.7,
        confidence: 0.76,
        evidenceRef: makeEvidenceRef({
          sourceType: 'taste_profile',
          sourceTable: 'client_taste_profiles',
          sourceRecordId: bundle.client.id,
          signalKey: 'taste_profile_cuisine',
          value: cuisine,
          confidence: 0.76,
          observedAt: bundle.tasteProfile.updated_at ?? null,
        }),
      })
    }

    for (const protein of uniqueStrings(bundle.tasteProfile.preferred_proteins ?? [])) {
      addPreference(likeSignals, {
        label: protein,
        category: 'ingredient',
        score: 0.58,
        confidence: 0.66,
        evidenceRef: makeEvidenceRef({
          sourceType: 'taste_profile',
          sourceTable: 'client_taste_profiles',
          sourceRecordId: bundle.client.id,
          signalKey: 'preferred_protein',
          value: protein,
          confidence: 0.66,
          observedAt: bundle.tasteProfile.updated_at ?? null,
        }),
      })
    }

    for (const disliked of uniqueStrings(bundle.tasteProfile.disliked_ingredients ?? [])) {
      const ref = makeEvidenceRef({
        sourceType: 'taste_profile',
        sourceTable: 'client_taste_profiles',
        sourceRecordId: bundle.client.id,
        signalKey: 'taste_profile_dislike',
        value: disliked,
        confidence: 0.75,
        observedAt: bundle.tasteProfile.updated_at ?? null,
      })
      addConstraint(hardVetoSignals, {
        label: disliked,
        category: 'dislike',
        severity: 'strong_avoid',
        rationale: 'Taste profile marks this ingredient as disliked.',
        evidenceRef: ref,
      })
      addPreference(dislikeSignals, {
        label: disliked,
        category: 'ingredient',
        score: 0.7,
        confidence: 0.75,
        evidenceRef: ref,
      })
    }

    for (const avoided of uniqueStrings(bundle.tasteProfile.avoids ?? [])) {
      const ref = makeEvidenceRef({
        sourceType: 'taste_profile',
        sourceTable: 'client_taste_profiles',
        sourceRecordId: bundle.client.id,
        signalKey: 'taste_profile_avoid',
        value: avoided,
        confidence: 0.78,
        observedAt: bundle.tasteProfile.updated_at ?? null,
      })
      addConstraint(hardVetoSignals, {
        label: avoided,
        category: 'avoid',
        severity: 'hard_veto',
        rationale: 'Taste profile marks this as an explicit avoid.',
        evidenceRef: ref,
      })
      addPreference(dislikeSignals, {
        label: avoided,
        category: 'ingredient',
        score: 0.8,
        confidence: 0.78,
        evidenceRef: ref,
      })
    }

    if ((bundle.tasteProfile.spice_tolerance ?? 0) >= 4) {
      addPreference(likeSignals, {
        label: 'spice',
        category: 'flavor',
        score: 0.6,
        confidence: 0.7,
        evidenceRef: makeEvidenceRef({
          sourceType: 'taste_profile',
          sourceTable: 'client_taste_profiles',
          sourceRecordId: bundle.client.id,
          signalKey: 'taste_profile_spice',
          value: String(bundle.tasteProfile.spice_tolerance),
          confidence: 0.7,
          observedAt: bundle.tasteProfile.updated_at ?? null,
        }),
      })
    }
  }

  for (const preference of bundle.preferences) {
    const label = cleanText(preference.item_name)
    if (!label) continue
    const rating = normalizeKey(preference.rating ?? '')
    const category = inferPreferenceCategory(preference.item_type)
    const ref = makeEvidenceRef({
      sourceType: 'stated_preference',
      sourceTable: 'client_preferences',
      sourceRecordId: bundle.client.id,
      signalKey: `preference_${rating || 'neutral'}`,
      value: label,
      confidence: rating === 'loved' ? 0.82 : rating === 'liked' ? 0.72 : 0.65,
      observedAt: preference.observed_at ?? null,
    })

    if (rating === 'loved' || rating === 'liked') {
      addPreference(likeSignals, {
        label,
        category,
        score: rating === 'loved' ? 0.78 : 0.58,
        confidence: ref.confidence,
        evidenceRef: ref,
      })
    } else if (rating === 'disliked') {
      addPreference(dislikeSignals, {
        label,
        category,
        score: 0.68,
        confidence: ref.confidence,
        evidenceRef: ref,
      })
    }
  }

  for (const dish of bundle.servedDishes) {
    const label = cleanText(dish.dish_name)
    if (!label) continue
    const sentiment = sentimentFromReaction(dish.client_reaction)
    const ref = makeEvidenceRef({
      sourceType: 'recipe_feedback',
      sourceTable: 'served_dish_history',
      sourceRecordId: dish.id ?? null,
      signalKey: 'served_dish',
      value: label,
      confidence: sentiment !== null ? 0.78 : 0.6,
      observedAt: dish.client_feedback_at ?? dish.served_date ?? null,
    })

    addConsumption(historicalConsumption, {
      item: label,
      category: 'dish',
      sentiment,
      observedAt: dish.client_feedback_at ?? dish.served_date ?? null,
      evidenceRef: ref,
    })

    if (sentiment !== null && sentiment >= 0.8) {
      addPreference(likeSignals, {
        label,
        category: 'dish',
        score: 0.3,
        confidence: 0.78,
        evidenceRef: ref,
      })
    } else if (sentiment !== null && sentiment <= 0.2) {
      addPreference(dislikeSignals, {
        label,
        category: 'dish',
        score: 0.56,
        confidence: 0.78,
        evidenceRef: ref,
      })
    }
  }

  for (const request of bundle.mealRequests) {
    const label = cleanText(request.dish_name)
    if (!label) continue
    const status = normalizeKey(request.status ?? '')
    if (status === 'withdrawn' || status === 'declined') continue

    const type = normalizeKey(request.request_type ?? '')
    const ref = makeEvidenceRef({
      sourceType: 'meal_request',
      sourceTable: 'client_meal_requests',
      sourceRecordId: request.id ?? null,
      signalKey: type || 'meal_request',
      value: label,
      confidence: 0.8,
      observedAt: request.updated_at ?? request.created_at ?? null,
    })

    if (type === 'avoid_dish') {
      addConstraint(hardVetoSignals, {
        label,
        category: 'avoid',
        severity: 'hard_veto',
        rationale: 'Client explicitly requested that this be avoided.',
        evidenceRef: ref,
      })
      addPreference(dislikeSignals, {
        label,
        category: 'dish',
        score: 0.85,
        confidence: 0.8,
        evidenceRef: ref,
      })
      continue
    }

    addPreference(likeSignals, {
      label,
      category: 'dish',
      score: type === 'repeat_dish' ? 0.82 : 0.68,
      confidence: 0.8,
      evidenceRef: ref,
    })
  }

  for (const inquiry of bundle.inquiries) {
    for (const restriction of uniqueStrings(inquiry.confirmed_dietary_restrictions ?? [])) {
      addConstraint(hardVetoSignals, {
        label: restriction,
        category: 'dietary',
        severity: 'hard_veto',
        rationale: 'Restriction captured during inquiry intake.',
        evidenceRef: makeEvidenceRef({
          sourceType: 'booking_form',
          sourceTable: 'inquiries',
          sourceRecordId: inquiry.id ?? null,
          signalKey: 'confirmed_dietary_restriction',
          value: restriction,
          confidence: 0.82,
          observedAt: inquiry.updated_at ?? inquiry.created_at ?? null,
        }),
      })
    }
  }

  for (const response of bundle.feedbackResponses) {
    const normalizedRating =
      typeof response.rating === 'number' ? clamp01(response.rating / 5) : null
    const ref = makeEvidenceRef({
      sourceType: 'feedback_request',
      sourceTable: 'feedback_responses',
      sourceRecordId: response.request_id,
      signalKey: 'feedback_response',
      value: cleanText(response.comment) ?? 'overall service experience',
      confidence: normalizedRating ?? 0.55,
      observedAt: response.created_at ?? null,
    })

    addConsumption(historicalConsumption, {
      item: 'overall service experience',
      category: 'other',
      sentiment: normalizedRating,
      observedAt: response.created_at ?? null,
      evidenceRef: ref,
    })

    const tags = uniqueStrings(response.tags ?? [])
    if (normalizedRating !== null && normalizedRating >= 0.8) {
      for (const tag of tags.slice(0, 4)) {
        addPreference(likeSignals, {
          label: tag,
          category: 'other',
          score: 0.26,
          confidence: 0.68,
          evidenceRef: makeEvidenceRef({
            sourceType: 'feedback_request',
            sourceTable: 'feedback_responses',
            sourceRecordId: response.request_id,
            signalKey: 'feedback_tag_positive',
            value: tag,
            confidence: 0.68,
            observedAt: response.created_at ?? null,
          }),
        })
      }
    } else if (normalizedRating !== null && normalizedRating <= 0.4) {
      for (const tag of tags.slice(0, 4)) {
        addPreference(dislikeSignals, {
          label: tag,
          category: 'other',
          score: 0.32,
          confidence: 0.68,
          evidenceRef: makeEvidenceRef({
            sourceType: 'feedback_request',
            sourceTable: 'feedback_responses',
            sourceRecordId: response.request_id,
            signalKey: 'feedback_tag_negative',
            value: tag,
            confidence: 0.68,
            observedAt: response.created_at ?? null,
          }),
        })
      }
    }
  }

  const consumptionList = buildConsumptionList(historicalConsumption)
  const statedLikes = buildPreferenceList(likeSignals)
  const statedDislikes = buildPreferenceList(dislikeSignals)
  const hardVetoes = buildConstraintList(hardVetoSignals)
  const affectiveContext = buildAffectiveContext(bundle)
  const serviceDepth = buildServiceDepth(bundle)
  const householdAlignment = buildHouseholdAlignment(bundle, statedLikes, hardVetoes)

  const consumedKeys = new Set(consumptionList.map((item) => normalizeKey(item.item)))
  const hardVetoKeys = new Set(hardVetoes.map((item) => normalizeKey(item.label)))
  const noveltyCandidates = new Map<string, NoveltyOpportunity>()

  for (const preference of statedLikes) {
    const key = normalizeKey(preference.label)
    if (consumedKeys.has(key) || hardVetoKeys.has(key)) continue
    noveltyCandidates.set(`${preference.category}:${key}`, {
      item: preference.label,
      category: preference.category,
      noveltyScore: clamp01(0.45 + preference.score * 0.4),
      reason: 'Positive signal with no matching consumption history.',
      evidenceRefs: preference.evidenceRefs,
    })
  }

  const ambiguousConstraints = buildAmbiguousConstraints(
    statedLikes,
    hardVetoes,
    affectiveContext,
    householdAlignment
  )

  const baseVector = {
    schemaVersion: 'cp-engine/vector-v1' as const,
    vectorId: null,
    tenantId: bundle.tenantId,
    clientId: bundle.client.id,
    householdId: bundle.households[0]?.id ?? null,
    engineVersion: CLIENT_PROFILE_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    statedLikes,
    statedDislikes,
    hardVetoes,
    historicalConsumption: consumptionList.slice(0, 24),
    noveltyPotential: [...noveltyCandidates.values()]
      .sort((left, right) => right.noveltyScore - left.noveltyScore)
      .slice(0, 12),
    affectiveContext,
    serviceDepth,
    householdAlignment,
    ambiguousConstraints,
  }

  const vector = {
    ...baseVector,
    coverage: buildCoverageSummary(baseVector),
  }

  return CulinaryProfileVectorSchema.parse(vector)
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function isMissingRelationError(error: unknown): boolean {
  const message =
    typeof error === 'object' && error && 'message' in error ? String((error as any).message) : ''
  return message.includes('does not exist') || message.includes('relation') && message.includes('exist')
}

async function trySelect<T>(promise: Promise<{ data: T | null; error: unknown }>, fallback: T): Promise<T> {
  const result = await promise
  if ((result as any)?.error && !isMissingRelationError((result as any).error)) {
    console.error('[client-profile-service] Query error:', (result as any).error)
  }
  return ((result as any)?.data as T | null) ?? fallback
}

export async function loadClientProfileSourceBundle(
  clientId: string,
  tenantId: string,
  dbClient?: DbClient
): Promise<ClientProfileSourceBundle | null> {
  const db = dbClient ?? createAdminClient()

  const [
    client,
    allergyRecords,
    tasteProfile,
    preferences,
    servedDishes,
    mealRequests,
    events,
    inquiries,
    messages,
    communicationLogs,
    feedbackRequests,
    households,
    managedSubjects,
  ] = await Promise.all([
    trySelect<BaseClientRecord | null>(
      db
        .from('clients')
        .select(
          'id, full_name, preferred_name, dietary_restrictions, dietary_protocols, allergies, dislikes, spice_tolerance, favorite_cuisines, favorite_dishes, preferred_service_style, updated_at'
        )
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      null
    ),
    trySelect<AllergyRecord[]>(
      db
        .from('client_allergy_records')
        .select('id, allergen, severity, confirmed_by_chef, updated_at, created_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId),
      []
    ),
    trySelect<TasteProfileRecord | null>(
      db
        .from('client_taste_profiles')
        .select(
          'favorite_cuisines, disliked_ingredients, spice_tolerance, preferred_proteins, avoids, flavor_notes, updated_at'
        )
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .maybeSingle(),
      null
    ),
    trySelect<PreferenceRecord[]>(
      db
        .from('client_preferences')
        .select('item_type, item_name, rating, observed_at, notes')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('observed_at', { ascending: false })
        .limit(80),
      []
    ),
    trySelect<ServedDishRecord[]>(
      db
        .from('served_dish_history')
        .select('id, dish_name, client_reaction, served_date, client_feedback_at')
        .eq('chef_id', tenantId)
        .eq('client_id', clientId)
        .order('served_date', { ascending: false })
        .limit(120),
      []
    ),
    trySelect<MealRequestRecord[]>(
      db
        .from('client_meal_requests')
        .select('id, request_type, dish_name, status, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(80),
      []
    ),
    trySelect<EventRecord[]>(
      db
        .from('events')
        .select('id, event_date, guest_count, service_style, status')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('event_date', { ascending: false })
        .limit(80),
      []
    ),
    trySelect<InquiryRecord[]>(
      db
        .from('inquiries')
        .select(
          'id, source_message, confirmed_occasion, confirmed_dietary_restrictions, service_style_pref, created_at, updated_at'
        )
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(80),
      []
    ),
    trySelect<MessageRecord[]>(
      db
        .from('messages')
        .select('id, subject, body, direction, created_at, sent_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(80),
      []
    ),
    trySelect<CommunicationLogRecord[]>(
      db
        .from('communication_log')
        .select('id, subject, content, direction, created_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(80),
      []
    ),
    trySelect<FeedbackRequestRecord[]>(
      db
        .from('feedback_requests')
        .select('id, entity_type, entity_id, created_at')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(40),
      []
    ),
    trySelect<HouseholdRecord[]>(
      db
        .from('households')
        .select('id, name, primary_client_id')
        .eq('tenant_id', tenantId)
        .eq('primary_client_id', clientId),
      []
    ),
    trySelect<ManagedSubjectRecord[]>(
      db
        .from('client_profile_subjects')
        .select('id, subject_kind, display_name, relationship_label, profile_payload, household_id')
        .eq('tenant_id', tenantId)
        .eq('primary_client_id', clientId)
        .eq('is_active', true),
      []
    ),
  ])

  if (!client) return null

  const feedbackRequestIds = feedbackRequests.map((request) => request.id)
  const householdIds = households.map((household) => household.id)

  const [feedbackResponses, householdMembers] = await Promise.all([
    feedbackRequestIds.length > 0
      ? trySelect<FeedbackResponseRecord[]>(
          db
            .from('feedback_responses')
            .select('request_id, rating, comment, tags, created_at')
            .in('request_id', feedbackRequestIds),
          []
        )
      : Promise.resolve([]),
    householdIds.length > 0
      ? trySelect<HouseholdMemberRecord[]>(
          db
            .from('household_members')
            .select('household_id, client_id, relationship')
            .in('household_id', householdIds),
          []
        )
      : Promise.resolve([]),
  ])

  const linkedClientIds = householdMembers
    .map((member) => member.client_id)
    .filter((id) => id && id !== clientId)

  const linkedClients =
    linkedClientIds.length > 0
      ? await trySelect<BaseClientRecord[]>(
          db
            .from('clients')
            .select(
              'id, full_name, preferred_name, dietary_restrictions, dietary_protocols, allergies, dislikes, spice_tolerance, favorite_cuisines, favorite_dishes, preferred_service_style, updated_at'
            )
            .eq('tenant_id', tenantId)
            .in('id', linkedClientIds),
          []
        )
      : []

  return {
    tenantId,
    client,
    allergyRecords: safeArray(allergyRecords),
    tasteProfile,
    preferences: safeArray(preferences),
    servedDishes: safeArray(servedDishes),
    mealRequests: safeArray(mealRequests),
    events: safeArray(events),
    inquiries: safeArray(inquiries),
    messages: safeArray(messages),
    communicationLogs: safeArray(communicationLogs),
    feedbackRequests: safeArray(feedbackRequests),
    feedbackResponses: safeArray(feedbackResponses),
    households: safeArray(households),
    householdMembers: safeArray(householdMembers),
    linkedClients: safeArray(linkedClients),
    managedSubjects: safeArray(managedSubjects),
  }
}

async function loadStoredVector(
  clientId: string,
  tenantId: string,
  dbClient?: DbClient
): Promise<CulinaryProfileVector | null> {
  const db = dbClient ?? createAdminClient()
  const result = await db
    .from('client_profile_vectors')
    .select('id, vector_json')
    .eq('tenant_id', tenantId)
    .eq('primary_client_id', clientId)
    .eq('is_current', true)
    .maybeSingle()

  if (result?.error) {
    if (!isMissingRelationError(result.error)) {
      console.error('[client-profile-service] Failed to load stored vector:', result.error)
    }
    return null
  }

  const parsed = CulinaryProfileVectorSchema.safeParse((result?.data as any)?.vector_json)
  return parsed.success ? parsed.data : null
}

function buildEvidenceLedgerRows(
  vector: CulinaryProfileVector,
  tenantId: string,
  clientId: string
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = []
  const pushRows = (
    refs: ProfileEvidenceRef[],
    direction: 'positive' | 'negative' | 'constraint' | 'context' | 'novelty' | 'neutral'
  ) => {
    for (const ref of refs) {
      rows.push({
        tenant_id: tenantId,
        primary_client_id: clientId,
        source_type: ref.sourceType,
        source_table: ref.sourceTable,
        source_record_id: ref.sourceRecordId,
        signal_key: ref.signalKey,
        signal_direction: direction,
        signal_payload: {
          value: ref.value,
          confidence: ref.confidence,
        },
        normalized_value: normalizeKey(ref.value),
        confidence: ref.confidence,
        predictive_weight: 0,
        observed_at: ref.observedAt,
        attributed_to: 'cp-engine',
        evidence_fingerprint: [
          tenantId,
          clientId,
          ref.sourceType,
          ref.sourceTable ?? '',
          ref.sourceRecordId ?? '',
          ref.signalKey,
          normalizeKey(ref.value),
          ref.observedAt,
        ].join('|'),
      })
    }
  }

  for (const item of vector.statedLikes) pushRows(item.evidenceRefs, 'positive')
  for (const item of vector.statedDislikes) pushRows(item.evidenceRefs, 'negative')
  for (const item of vector.hardVetoes) pushRows(item.evidenceRefs, 'constraint')
  for (const item of vector.historicalConsumption) pushRows(item.evidenceRefs, 'neutral')
  for (const item of vector.noveltyPotential) pushRows(item.evidenceRefs, 'novelty')
  pushRows(vector.affectiveContext.evidenceRefs, 'context')
  pushRows(vector.serviceDepth.evidenceRefs, 'context')

  return rows
}

async function persistConflicts(
  db: DbClient,
  tenantId: string,
  clientId: string,
  vectorId: string | null,
  conflicts: AmbiguousConstraint[]
) {
  if (conflicts.length === 0) return

  const upsertPayload = conflicts.map((conflict) => ({
    tenant_id: tenantId,
    primary_client_id: clientId,
    vector_id: vectorId,
    conflict_key: conflict.conflictKey,
    status: conflict.status,
    severity: conflict.severity,
    title: conflict.title,
    conflict_json: conflict,
    requires_user_arbitration: conflict.requiresUserArbitration,
    resolved_at: conflict.status === 'resolved' || conflict.status === 'dismissed' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }))

  const result = await db
    .from('client_profile_conflicts')
    .upsert(upsertPayload, {
      onConflict: 'tenant_id,primary_client_id,conflict_key',
    })
    .select('id, conflict_key')

  if (result?.error) {
    if (!isMissingRelationError(result.error)) {
      console.error('[client-profile-service] Failed to persist conflicts:', result.error)
    }
    return
  }

  const rows = safeArray(result.data as Array<{ id: string; conflict_key: string }> | null)
  const conflictIdByKey = new Map(rows.map((row) => [row.conflict_key, row.id]))

  const queryPayload = conflicts.flatMap((conflict) => {
    const conflictId = conflictIdByKey.get(conflict.conflictKey)
    if (!conflictId) return []
    return conflict.queries.map((query) => ({
      tenant_id: tenantId,
      primary_client_id: clientId,
      conflict_id: conflictId,
      priority: query.priority,
      status: query.status,
      question_json: query,
      answer_json: null,
      answered_at: null,
      updated_at: new Date().toISOString(),
    }))
  })

  if (queryPayload.length === 0) return

  const queryResult = await db.from('client_profile_arbitration_queries').upsert(queryPayload, {
    onConflict: 'conflict_id,priority',
  })

  if (queryResult?.error && !isMissingRelationError(queryResult.error)) {
    console.error('[client-profile-service] Failed to persist arbitration queries:', queryResult.error)
  }
}

async function persistVector(
  db: DbClient,
  tenantId: string,
  clientId: string,
  vector: CulinaryProfileVector
): Promise<CulinaryProfileVector> {
  const previousUpdate = await db
    .from('client_profile_vectors')
    .update({ is_current: false })
    .eq('tenant_id', tenantId)
    .eq('primary_client_id', clientId)
    .eq('is_current', true)

  if (previousUpdate?.error && !isMissingRelationError(previousUpdate.error)) {
    console.error('[client-profile-service] Failed to clear previous vectors:', previousUpdate.error)
  }

  const insertResult = await db
    .from('client_profile_vectors')
    .insert({
      tenant_id: tenantId,
      primary_client_id: clientId,
      household_id: vector.householdId,
      engine_version: vector.engineVersion,
      vector_json: vector,
      coverage_json: vector.coverage,
      confidence_score: vector.coverage.overallConfidence,
      conflict_count: vector.ambiguousConstraints.length,
      is_current: true,
      generated_at: vector.generatedAt,
    })
    .select('id')
    .single()

  if (insertResult?.error) {
    if (!isMissingRelationError(insertResult.error)) {
      console.error('[client-profile-service] Failed to persist vector:', insertResult.error)
    }
    return vector
  }

  const vectorId = (insertResult.data as { id: string } | null)?.id ?? null
  const nextVector = CulinaryProfileVectorSchema.parse({
    ...vector,
    vectorId,
  })

  const evidenceRows = buildEvidenceLedgerRows(nextVector, tenantId, clientId)
  if (evidenceRows.length > 0) {
    const evidenceResult = await db.from('client_profile_evidence').upsert(evidenceRows, {
      onConflict: 'evidence_fingerprint',
    })
    if (evidenceResult?.error && !isMissingRelationError(evidenceResult.error)) {
      console.error('[client-profile-service] Failed to persist evidence ledger:', evidenceResult.error)
    }
  }

  await persistConflicts(db, tenantId, clientId, vectorId, vector.ambiguousConstraints)
  return nextVector
}

export async function rebuildClientProfileVectorForTenant(
  clientId: string,
  tenantId: string,
  dbClient?: DbClient
): Promise<CulinaryProfileVector | null> {
  const db = dbClient ?? createAdminClient()
  const sourceBundle = await loadClientProfileSourceBundle(clientId, tenantId, db)
  if (!sourceBundle) return null

  const vector = buildCulinaryProfileVector(sourceBundle)

  try {
    return await persistVector(db, tenantId, clientId, vector)
  } catch (error) {
    console.error('[client-profile-service] Persist failed, returning in-memory vector:', error)
    return vector
  }
}

export async function getClientProfileVectorForTenant(
  clientId: string,
  tenantId: string,
  options?: { refresh?: boolean; dbClient?: DbClient }
): Promise<CulinaryProfileVector | null> {
  const db = options?.dbClient ?? createAdminClient()
  if (!options?.refresh) {
    const stored = await loadStoredVector(clientId, tenantId, db)
    if (stored) return stored
  }
  return rebuildClientProfileVectorForTenant(clientId, tenantId, db)
}

function candidateTexts(candidate: RecommendationCandidate): string[] {
  return uniqueStrings([
    candidate.title,
    ...candidate.cuisineTags,
    ...candidate.ingredientTags,
    ...candidate.dishTags,
    ...candidate.flavorTags,
  ])
}

function sameDepthBand(left: ClientServiceDepth | undefined, right: ClientServiceDepth): boolean {
  if (!left) return false
  if (left === right) return true
  const casual = new Set<ClientServiceDepth>([
    'casual_dropoff',
    'casual_family_style',
    'casual_tapas',
  ])
  const formal = new Set<ClientServiceDepth>(['formal_plated', 'formal_multi_course'])
  if (casual.has(left) && casual.has(right)) return true
  if (formal.has(left) && formal.has(right)) return true
  return left === 'semi_formal_shared' && right === 'casual_family_style'
}

export function recommendCandidateMealsAgainstVector(
  vector: CulinaryProfileVector,
  request: z.infer<typeof RecommendationRequestSchema>
): RecommendationResult {
  const parsedRequest = RecommendationRequestSchema.parse(request)
  const blockingConflicts = vector.ambiguousConstraints.filter(
    (conflict) =>
      conflict.requiresUserArbitration &&
      (conflict.status === 'open' || conflict.status === 'pending_user')
  )

  if (blockingConflicts.length > 0) {
    return RecommendationResultSchema.parse({
      status: 'blocked_conflict',
      recommendationId: null,
      vectorId: vector.vectorId,
      recommendedMeal: null,
      confidenceScore: null,
      confidenceJustification: [],
      vetoedCandidates: [],
      blockingConflicts,
    })
  }

  const currentEmotion = parsedRequest.activeEmotionOverride ?? vector.affectiveContext.state
  const currentDepth = parsedRequest.serviceDepthOverride ?? vector.serviceDepth.preferredDepth

  const vetoedCandidates: RecommendationResult['vetoedCandidates'] = []
  const scored: Array<{
    candidate: RecommendationCandidate
    score: number
    justifications: Array<z.infer<typeof ConfidenceJustificationSchema>>
  }> = []

  for (const candidate of parsedRequest.candidates) {
    const texts = candidateTexts(candidate)
    const vetoReasons: string[] = []

    for (const constraint of vector.hardVetoes) {
      if (texts.some((text) => overlapsValue(text, constraint.label))) {
        vetoReasons.push(`${candidate.title} overlaps hard veto "${constraint.label}"`)
      }
    }

    if (vetoReasons.length > 0) {
      vetoedCandidates.push({
        candidateId: candidate.id,
        title: candidate.title,
        reasons: uniqueStrings(vetoReasons),
      })
      continue
    }

    let score = 0.18
    const justifications: Array<z.infer<typeof ConfidenceJustificationSchema>> = []

    for (const like of vector.statedLikes) {
      if (!texts.some((text) => overlapsValue(text, like.label))) continue
      const delta = (like.category === 'cuisine' ? 0.16 : like.category === 'dish' ? 0.14 : 0.08) * like.score
      score += delta
      justifications.push(
        ConfidenceJustificationSchema.parse({
          label: `Matched preference: ${like.label}`,
          scoreDelta: delta,
          explanation: `${candidate.title} aligns with a recorded ${like.category} preference.`,
          evidenceRefs: like.evidenceRefs,
        })
      )
    }

    for (const item of vector.historicalConsumption) {
      if (!texts.some((text) => overlapsValue(text, item.item))) continue
      const delta = 0.1 * item.satisfactionScore
      score += delta
      justifications.push(
        ConfidenceJustificationSchema.parse({
          label: `Historical satisfaction: ${item.item}`,
          scoreDelta: delta,
          explanation: `${item.item} has prior consumption history with a satisfaction score of ${Math.round(
            item.satisfactionScore * 100
          )}%.`,
          evidenceRefs: item.evidenceRefs,
        })
      )
    }

    for (const novelty of vector.noveltyPotential) {
      if (!texts.some((text) => overlapsValue(text, novelty.item))) continue
      const delta = 0.08 * novelty.noveltyScore
      score += delta
      justifications.push(
        ConfidenceJustificationSchema.parse({
          label: `Novelty opportunity: ${novelty.item}`,
          scoreDelta: delta,
          explanation: `${candidate.title} fits an unserved but high-potential profile signal.`,
          evidenceRefs: novelty.evidenceRefs,
        })
      )
    }

    if (sameDepthBand(candidate.serviceDepth, currentDepth)) {
      score += 0.1
      justifications.push(
        ConfidenceJustificationSchema.parse({
          label: `Service depth alignment`,
          scoreDelta: 0.1,
          explanation: `${candidate.title} matches the preferred service depth of ${currentDepth}.`,
          evidenceRefs: vector.serviceDepth.evidenceRefs,
        })
      )
    }

    switch (currentEmotion) {
      case 'stressed':
      case 'overwhelmed': {
        const delta = 0.14 * candidate.comfortScore + 0.08 * (1 - candidate.complexityScore)
        score += delta
        justifications.push(
          ConfidenceJustificationSchema.parse({
            label: `Emotion fit: ${currentEmotion}`,
            scoreDelta: delta,
            explanation: 'The current affective context favors comfort and lower complexity.',
            evidenceRefs: vector.affectiveContext.evidenceRefs,
          })
        )
        break
      }
      case 'celebratory': {
        const delta = 0.1 * candidate.boldScore + 0.08 * candidate.complexityScore
        score += delta
        justifications.push(
          ConfidenceJustificationSchema.parse({
            label: 'Emotion fit: celebratory',
            scoreDelta: delta,
            explanation: 'Celebratory contexts support bolder flavors and more theatrical service.',
            evidenceRefs: vector.affectiveContext.evidenceRefs,
          })
        )
        break
      }
      case 'curious': {
        const delta = 0.1 * candidate.boldScore + 0.06 * (1 - candidate.comfortScore)
        score += delta
        justifications.push(
          ConfidenceJustificationSchema.parse({
            label: 'Emotion fit: curious',
            scoreDelta: delta,
            explanation: 'Curious contexts tolerate more novelty and surprise.',
            evidenceRefs: vector.affectiveContext.evidenceRefs,
          })
        )
        break
      }
      case 'relaxed': {
        const delta = 0.07 * candidate.comfortScore + 0.05 * (1 - Math.abs(candidate.complexityScore - 0.5))
        score += delta
        justifications.push(
          ConfidenceJustificationSchema.parse({
            label: 'Emotion fit: relaxed',
            scoreDelta: delta,
            explanation: 'Relaxed contexts reward balance over maximal intensity.',
            evidenceRefs: vector.affectiveContext.evidenceRefs,
          })
        )
        break
      }
      default:
        break
    }

    if (vector.householdAlignment?.tensions.some((tension) => texts.some((text) => overlapsValue(text, tension)))) {
      score -= 0.16
      justifications.push(
        ConfidenceJustificationSchema.parse({
          label: 'Household tension penalty',
          scoreDelta: -0.16,
          explanation: `${candidate.title} overlaps an unresolved household preference collision.`,
          evidenceRefs: [],
        })
      )
    }

    const confidenceScore = clamp01(score * (0.55 + 0.45 * vector.coverage.overallConfidence))
    scored.push({
      candidate,
      score: confidenceScore,
      justifications,
    })
  }

  if (scored.length === 0) {
    return RecommendationResultSchema.parse({
      status: 'no_safe_candidate',
      recommendationId: null,
      vectorId: vector.vectorId,
      recommendedMeal: null,
      confidenceScore: null,
      confidenceJustification: [],
      vetoedCandidates,
      blockingConflicts: [],
    })
  }

  scored.sort((left, right) => right.score - left.score || left.candidate.title.localeCompare(right.candidate.title))
  const winner = scored[0]

  return RecommendationResultSchema.parse({
    status: 'ready',
    recommendationId: null,
    vectorId: vector.vectorId,
    recommendedMeal: winner.candidate,
    confidenceScore: winner.score,
    confidenceJustification: winner.justifications
      .sort((left, right) => right.scoreDelta - left.scoreDelta)
      .slice(0, 8),
    vetoedCandidates,
    blockingConflicts: [],
  })
}

async function persistRecommendation(
  db: DbClient,
  tenantId: string,
  clientId: string,
  vector: CulinaryProfileVector,
  request: z.infer<typeof RecommendationRequestSchema>,
  result: RecommendationResult
) {
  const insertResult = await db
    .from('client_profile_recommendations')
    .insert({
      tenant_id: tenantId,
      primary_client_id: clientId,
      vector_id: vector.vectorId,
      household_id: vector.householdId,
      status: ClientProfileRecommendationStatusSchema.parse(result.status),
      request_json: request,
      response_json: result,
      justification_json: result.confidenceJustification,
      confidence_score: result.confidenceScore,
    })
    .select('id')
    .single()

  if (insertResult?.error) {
    if (!isMissingRelationError(insertResult.error)) {
      console.error('[client-profile-service] Failed to persist recommendation:', insertResult.error)
    }
    return result
  }

  return RecommendationResultSchema.parse({
    ...result,
    recommendationId: (insertResult.data as { id: string } | null)?.id ?? null,
  })
}

export async function recommendMealForClientForTenant(
  clientId: string,
  tenantId: string,
  input: z.infer<typeof RecommendationRequestSchema>,
  dbClient?: DbClient
): Promise<RecommendationResult | null> {
  const db = dbClient ?? createAdminClient()
  const vector = await getClientProfileVectorForTenant(clientId, tenantId, { dbClient: db })
  if (!vector) return null

  const result = recommendCandidateMealsAgainstVector(vector, input)

  try {
    return await persistRecommendation(db, tenantId, clientId, vector, input, result)
  } catch (error) {
    console.error('[client-profile-service] Recommendation persistence failed:', error)
    return result
  }
}
