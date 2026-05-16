export type ClientIntelligenceFactLifecycle =
  | 'new'
  | 'confirmed'
  | 'stale'
  | 'contradicted'
  | 'needs_review'
  | 'retired'
  | 'deleted_or_redacted'

export type ClientIntelligenceDisclosure =
  | 'client_visible'
  | 'chef_only'
  | 'staff_safe'
  | 'owner_only'

export type ClientIntelligenceSensitivity =
  | 'normal'
  | 'medical_sensitive'
  | 'child_sensitive'
  | 'security_sensitive'
  | 'relationship_sensitive'
  | 'financial_sensitive'

export type ClientIntelligenceConfidenceLabel = 'low' | 'medium' | 'high'

export type ClientIntelligencePredictionType =
  | 'next_meal'
  | 'next_purchase'
  | 'churn_risk'
  | 'upsell'
  | 'occasion_opportunity'
  | 'service_risk_warning'

export type ClientIntelligencePredictionStatus =
  | 'suggestion'
  | 'needs_review'
  | 'blocked_by_contradiction'
  | 'needs_more_data'

export type ClientIntelligenceSourceType =
  | 'client_record'
  | 'household'
  | 'household_member'
  | 'event'
  | 'client_preference'
  | 'allergy_record'
  | 'post_event_survey'
  | 'financial_summary'
  | 'client_profile_vector'
  | 'system_projection'

export type ClientIntelligenceEvidence = {
  sourceType: ClientIntelligenceSourceType
  sourceTable: string
  sourceRecordId: string | null
  label: string
  observedAt: string | null
  confidence: number
}

export type ClientIntelligenceFact = {
  id: string
  clientId: string
  category: string
  fieldKey: string
  label: string
  value: string
  rawValue: unknown
  lifecycle: ClientIntelligenceFactLifecycle
  confidence: number
  confidenceLabel: ClientIntelligenceConfidenceLabel
  disclosure: ClientIntelligenceDisclosure
  sensitivity: ClientIntelligenceSensitivity
  consentStatus: 'not_required' | 'client_provided' | 'chef_observed' | 'needs_consent'
  sourceLabel: string
  evidence: ClientIntelligenceEvidence[]
  freshnessDays: number | null
  actionability: 'warning' | 'recommendation' | 'reminder' | 'context' | 'private_note'
  importanceScore: number
}

export type ClientIntelligenceContradiction = {
  id: string
  title: string
  severity: 'critical' | 'warning' | 'info'
  status: 'needs_review' | 'resolved'
  reason: string
  factIds: string[]
  dueDate: string | null
}

export type ClientIntelligencePrediction = {
  id: string
  clientId: string
  type: ClientIntelligencePredictionType
  title: string
  status: ClientIntelligencePredictionStatus
  confidence: number
  confidenceLabel: ClientIntelligenceConfidenceLabel
  reasons: string[]
  suggestedAction: string
  riskLevel: 'none' | 'low' | 'medium' | 'high'
  expiresAt: string | null
  expectedValueCents: number | null
  evidence: ClientIntelligenceEvidence[]
  reviewRequired: boolean
  safeToAutomate: boolean
}

export type ClientIntelligenceAction = {
  id: string
  title: string
  ownerRole: 'chef'
  dueDate: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'suggested' | 'needs_review' | 'blocked' | 'completed'
  linkedClientId: string
  sourcePredictionId: string | null
  sourceFactIds: string[]
}

export type ClientIntelligenceProjection = {
  client: {
    id: string
    tenantId: string
    name: string
    status: string | null
    lastEventDate: string | null
  }
  facts: ClientIntelligenceFact[]
  topFacts: ClientIntelligenceFact[]
  contradictions: ClientIntelligenceContradiction[]
  predictions: ClientIntelligencePrediction[]
  actions: ClientIntelligenceAction[]
  emptyStates: string[]
  sourceSummary: Array<{ sourceType: ClientIntelligenceSourceType; count: number }>
  generatedAt: string
}

export type ClientIntelligenceRawClient = Record<string, any> & {
  id: string
  tenant_id: string
  full_name?: string | null
}

export type ClientIntelligenceProjectionBundle = {
  tenantId: string
  client: ClientIntelligenceRawClient
  events?: Array<Record<string, any>>
  preferences?: Array<Record<string, any>>
  allergyRecords?: Array<Record<string, any>>
  surveys?: Array<Record<string, any>>
  financialSummary?: Record<string, any> | null
  households?: Array<Record<string, any>>
  householdMembers?: Array<Record<string, any>>
  profileVectors?: Array<Record<string, any>>
}

const STALE_AFTER_DAYS = 365
const REVIEW_WITHIN_DAYS = 45
const DAY_MS = 24 * 60 * 60 * 1000

const CLIENT_VISIBLE_CATEGORIES = new Set([
  'Identity',
  'Household',
  'Contact & Communication',
  'Food Preferences',
  'Dietary Rules',
  'Events & Occasions',
])

const MEDICAL_KEYS = new Set([
  'allergy',
  'allergy_record',
  'dietary_restriction',
  'dietary_protocol',
  'medical_note',
])

const SECURITY_KEYS = new Set([
  'gate_code',
  'wifi_password',
  'security_notes',
  'access_instructions',
])
const FINANCIAL_KEYS = new Set([
  'budget_range',
  'lifetime_value',
  'payment_behavior',
  'tipping_pattern',
])
const RELATIONSHIP_KEYS = new Set([
  'vibe_notes',
  'what_they_care_about',
  'family_notes',
  'red_flags',
])

export const CLIENT_INTELLIGENCE_TAXONOMY = [
  'Identity',
  'Household',
  'Contact & Communication',
  'Food Preferences',
  'Dietary Rules',
  'Health & Body Context',
  'Taste Memory',
  'Meal Rhythm',
  'Events & Occasions',
  'Beverages',
  'Grocery & Pantry',
  'Kitchen & Home',
  'Service Preferences',
  'Money & Commercial',
  'Relationship & Psychology',
  'Personal Life Context',
  'Social Graph',
  'Children',
  'Pets',
  'Security & Privacy',
  'History With The Chef',
  'Operational Notes',
  'Preference Inference',
  'Restricted/Sensitive Fields',
  'Sensory Profile',
  'Ingredient-Level Likes',
  'Ingredient-Level Avoids',
  'Cooking Method Preferences',
  'Cuisine Granularity',
  'Menu Strategy',
  'Emotional Context',
  'Status & Presentation',
  'House Culture',
  'Boundaries',
  'Feedback Intelligence',
  'Risk Flags',
  'Travel & Multi-Home',
  'Calendar Intelligence',
  'Nutrition & Performance',
  'Vendor Preferences',
  'Technology & Workflow',
  'Data A Chef Learns Accidentally',
  'Observations',
  'Source Of Truth',
  'Confidence Level',
  'Actionability',
  'Disclosure Level',
  'Consent & Permission',
  'Time & Freshness',
  'Contradictions',
  'Menu Performance',
  'Client Value Metrics',
  'Churn & Retention Signals',
  'Upsell Signals',
  'Service Recovery',
  'Household Politics',
  'Operational Constraints',
  'Vendor Intelligence',
  'Staff Intelligence',
  'Reporting',
  'Optimization',
  'Recommended Actions',
  'Audit Trail',
  'Keep Disclosed Fields',
] as const

type FactInput = {
  clientId: string
  category: string
  fieldKey: string
  label: string
  value: unknown
  sourceType: ClientIntelligenceSourceType
  sourceTable: string
  sourceRecordId?: string | null
  sourceLabel: string
  observedAt?: string | null
  confidence: number
  confirmed?: boolean
  disclosure?: ClientIntelligenceDisclosure
  sensitivity?: ClientIntelligenceSensitivity
  consentStatus?: ClientIntelligenceFact['consentStatus']
  actionability?: ClientIntelligenceFact['actionability']
}

export function buildClientIntelligenceProjection(
  bundle: ClientIntelligenceProjectionBundle,
  options: { now?: Date } = {}
): ClientIntelligenceProjection {
  if (bundle.client.tenant_id !== bundle.tenantId) {
    throw new Error('Client intelligence projection refused a cross-tenant client record')
  }

  const now = options.now ?? new Date()
  const generatedAt = now.toISOString()
  const sourceFacts: ClientIntelligenceFact[] = []

  const addFact = (input: FactInput) => {
    const values = Array.isArray(input.value) ? input.value : [input.value]
    for (const value of values) {
      const cleaned = normalizeDisplayValue(value)
      if (!cleaned) continue
      const sensitivity = input.sensitivity ?? inferSensitivity(input.fieldKey)
      const disclosure =
        input.disclosure ??
        (CLIENT_VISIBLE_CATEGORIES.has(input.category) ? 'client_visible' : 'chef_only')
      const confidence = clamp01(input.confidence)
      const freshnessDays = daysSince(input.observedAt, now)
      sourceFacts.push({
        id: stableFactId(input.clientId, input.category, input.fieldKey, cleaned),
        clientId: input.clientId,
        category: input.category,
        fieldKey: input.fieldKey,
        label: input.label,
        value: cleaned,
        rawValue: value,
        lifecycle: inferLifecycle({
          confidence,
          confirmed: input.confirmed,
          freshnessDays,
          sensitivity,
        }),
        confidence,
        confidenceLabel: confidenceLabel(confidence),
        disclosure,
        sensitivity,
        consentStatus:
          input.consentStatus ??
          (disclosure === 'client_visible' ? 'client_provided' : 'chef_observed'),
        sourceLabel: input.sourceLabel,
        evidence: [
          {
            sourceType: input.sourceType,
            sourceTable: input.sourceTable,
            sourceRecordId: input.sourceRecordId ?? null,
            label: input.sourceLabel,
            observedAt: input.observedAt ?? null,
            confidence,
          },
        ],
        freshnessDays,
        actionability: input.actionability ?? 'context',
        importanceScore: 0,
      })
    }
  }

  projectClientFacts(bundle.client, addFact)
  projectEventFacts(bundle.client.id, bundle.events ?? [], addFact)
  projectPreferenceFacts(bundle.client.id, bundle.preferences ?? [], addFact)
  projectAllergyFacts(bundle.client.id, bundle.allergyRecords ?? [], addFact)
  projectSurveyFacts(bundle.client.id, bundle.surveys ?? [], addFact)
  projectFinancialFacts(bundle.client.id, bundle.financialSummary, addFact)
  projectHouseholdFacts(
    bundle.client.id,
    bundle.households ?? [],
    bundle.householdMembers ?? [],
    addFact
  )
  projectProfileVectorFacts(bundle.client.id, bundle.profileVectors ?? [], addFact)

  const facts = dedupeClientIntelligenceFacts(sourceFacts).map((fact) => ({
    ...fact,
    importanceScore: scoreFactImportance(fact, now),
  }))
  const contradictions = detectClientIntelligenceContradictions(facts, now)
  const factsWithContradictions = facts
    .map((fact) =>
      contradictions.some((item) => item.factIds.includes(fact.id))
        ? {
            ...fact,
            lifecycle: 'contradicted' as const,
            importanceScore: Math.min(100, fact.importanceScore + 16),
          }
        : fact
    )
    .sort((left, right) => right.importanceScore - left.importanceScore)

  const predictions = buildClientIntelligencePredictions({
    clientId: bundle.client.id,
    facts: factsWithContradictions,
    contradictions,
    events: bundle.events ?? [],
    financialSummary: bundle.financialSummary,
    now,
  })
  const actions = buildClientIntelligenceActions(bundle.client.id, predictions, contradictions)
  const sourceSummary = summarizeSources(factsWithContradictions)
  const emptyStates = buildEmptyStates(factsWithContradictions, predictions)

  return {
    client: {
      id: bundle.client.id,
      tenantId: bundle.client.tenant_id,
      name: bundle.client.full_name ?? 'Unnamed client',
      status: bundle.client.status ?? bundle.client.client_status ?? null,
      lastEventDate:
        bundle.financialSummary?.last_event_date ??
        bundle.client.last_event_date ??
        latestDate((bundle.events ?? []).map((event) => event.event_date)),
    },
    facts: factsWithContradictions,
    topFacts: factsWithContradictions.slice(0, 8),
    contradictions,
    predictions,
    actions,
    emptyStates,
    sourceSummary,
    generatedAt,
  }
}

export function dedupeClientIntelligenceFacts(
  facts: ClientIntelligenceFact[]
): ClientIntelligenceFact[] {
  const byKey = new Map<string, ClientIntelligenceFact>()

  for (const fact of facts) {
    const key = `${fact.clientId}:${fact.category}:${fact.fieldKey}:${normalizeKey(fact.value)}`
    const current = byKey.get(key)
    if (!current) {
      byKey.set(key, fact)
      continue
    }

    const evidence = mergeEvidence(current.evidence, fact.evidence)
    const confidence = Math.max(current.confidence, fact.confidence)
    byKey.set(key, {
      ...current,
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      lifecycle: chooseLifecycle(current.lifecycle, fact.lifecycle),
      sourceLabel: summarizeSourceLabels(evidence),
      evidence,
      freshnessDays: minNullable(current.freshnessDays, fact.freshnessDays),
      disclosure: stricterDisclosure(current.disclosure, fact.disclosure),
      sensitivity: stricterSensitivity(current.sensitivity, fact.sensitivity),
    })
  }

  return [...byKey.values()]
}

export function detectClientIntelligenceContradictions(
  facts: ClientIntelligenceFact[],
  now: Date = new Date()
): ClientIntelligenceContradiction[] {
  const contradictions: ClientIntelligenceContradiction[] = []
  const activeFacts = facts.filter(
    (fact) => fact.lifecycle !== 'retired' && fact.lifecycle !== 'deleted_or_redacted'
  )

  const glutenRules = activeFacts.filter((fact) =>
    ['allergy', 'allergy_record', 'dietary_restriction', 'dietary_protocol'].includes(fact.fieldKey)
      ? normalizeKey(fact.value).includes('gluten') || normalizeKey(fact.value).includes('celiac')
      : false
  )
  const glutenLikes = activeFacts.filter(
    (fact) =>
      ['loved_item', 'favorite_dish', 'event_special_request'].includes(fact.fieldKey) &&
      ['pasta', 'bread', 'pizza', 'wheat', 'gluten'].some((term) =>
        normalizeKey(fact.value).includes(term)
      )
  )

  if (glutenRules.length > 0 && glutenLikes.length > 0) {
    contradictions.push({
      id: 'contradiction:gluten-positive-signal',
      title: 'Gluten restriction conflicts with positive food signal',
      severity: 'critical',
      status: 'needs_review',
      reason:
        'A gluten-sensitive or gluten-free fact exists alongside a loved or requested gluten-adjacent item.',
      factIds: [...glutenRules, ...glutenLikes].map((fact) => fact.id),
      dueDate: addDays(now, 3).toISOString(),
    })
  }

  const chiliRules = activeFacts.filter(
    (fact) =>
      ['allergy', 'allergy_record', 'dietary_restriction', 'dislike'].includes(fact.fieldKey) &&
      ['chili', 'chilli', 'pepper', 'capsaicin', 'spicy'].some((term) =>
        normalizeKey(fact.value).includes(term)
      )
  )
  const spicyLikes = activeFacts.filter(
    (fact) =>
      ['spice_tolerance', 'loved_item', 'favorite_dish'].includes(fact.fieldKey) &&
      ['hot', 'spicy', 'thai', 'chili', 'chilli'].some((term) =>
        normalizeKey(fact.value).includes(term)
      )
  )

  if (chiliRules.length > 0 && spicyLikes.length > 0) {
    contradictions.push({
      id: 'contradiction:spice-vs-chili-veto',
      title: 'Spice preference conflicts with chili or pepper caution',
      severity: 'warning',
      status: 'needs_review',
      reason:
        'The profile contains both a positive heat signal and a chili/pepper-adjacent restriction.',
      factIds: [...chiliRules, ...spicyLikes].map((fact) => fact.id),
      dueDate: addDays(now, 3).toISOString(),
    })
  }

  return contradictions
}

export function buildClientIntelligencePredictions(input: {
  clientId: string
  facts: ClientIntelligenceFact[]
  contradictions: ClientIntelligenceContradiction[]
  events: Array<Record<string, any>>
  financialSummary?: Record<string, any> | null
  now?: Date
}): ClientIntelligencePrediction[] {
  const now = input.now ?? new Date()
  const predictions: ClientIntelligencePrediction[] = []
  const activeFacts = input.facts.filter(
    (fact) => fact.lifecycle === 'confirmed' || fact.lifecycle === 'new'
  )
  const hasBlockingContradiction = input.contradictions.some(
    (item) => item.severity === 'critical' && item.status === 'needs_review'
  )
  const highRiskFacts = input.facts.filter(
    (fact) =>
      fact.actionability === 'warning' &&
      fact.lifecycle !== 'retired' &&
      fact.lifecycle !== 'deleted_or_redacted'
  )
  const preferredFoods = activeFacts.filter((fact) =>
    ['favorite_dish', 'favorite_cuisine', 'loved_item'].includes(fact.fieldKey)
  )
  const occasionFacts = activeFacts.filter((fact) =>
    ['birthday', 'anniversary', 'important_date', 'personal_milestone'].includes(fact.fieldKey)
  )
  const nextOccasion = occasionFacts
    .map((fact) => ({ fact, daysAway: annualDaysAway(fact.value, now) }))
    .filter((entry) => entry.daysAway !== null && entry.daysAway <= REVIEW_WITHIN_DAYS)
    .sort((left, right) => (left.daysAway ?? 999) - (right.daysAway ?? 999))[0]
  const events = input.events ?? []
  const completedEvents = events.filter((event) => event.status === 'completed')
  const lastEventDate =
    input.financialSummary?.last_event_date ?? latestDate(events.map((event) => event.event_date))
  const daysSinceLastEvent = daysSince(lastEventDate, now)
  const lifetimeValueCents = Number(input.financialSummary?.lifetime_value_cents ?? 0)
  const averageSpendCents = Number(input.financialSummary?.average_spend_per_event ?? 0)

  if (preferredFoods.length > 0 && !hasBlockingContradiction) {
    const facts = preferredFoods.slice(0, 3)
    predictions.push(
      makePrediction({
        clientId: input.clientId,
        type: 'next_meal',
        title: `Menu direction: ${facts.map((fact) => fact.value).join(', ')}`,
        confidence: average(facts.map((fact) => fact.confidence)) * freshnessMultiplier(facts),
        reasons: facts.map((fact) => `${fact.value} from ${fact.sourceLabel}`),
        suggestedAction: 'Draft a menu option using these confirmed preference signals.',
        riskLevel: highRiskFacts.length > 0 ? 'medium' : 'low',
        expiresAt: addDays(now, 30).toISOString(),
        expectedValueCents: averageSpendCents > 0 ? averageSpendCents : null,
        evidence: facts.flatMap((fact) => fact.evidence),
        hasBlockingContradiction: false,
        hasSensitiveEvidence: facts.some(isSensitiveFact),
      })
    )
  }

  if (nextOccasion) {
    const confidence = clamp01(0.62 + Math.min(completedEvents.length, 3) * 0.08)
    predictions.push(
      makePrediction({
        clientId: input.clientId,
        type: 'occasion_opportunity',
        title: `${nextOccasion.fact.label} in ${nextOccasion.daysAway} days`,
        confidence,
        reasons: [
          `${nextOccasion.fact.value} is within ${REVIEW_WITHIN_DAYS} days`,
          completedEvents.length > 0
            ? `${completedEvents.length} completed service(s) are available as context`
            : 'No completed service history is available yet',
        ],
        suggestedAction: 'Review before sending a birthday or anniversary touch.',
        riskLevel: 'low',
        expiresAt: addDays(now, Math.max(nextOccasion.daysAway ?? 1, 1)).toISOString(),
        expectedValueCents: averageSpendCents > 0 ? averageSpendCents : null,
        evidence: nextOccasion.fact.evidence,
        hasBlockingContradiction,
        hasSensitiveEvidence: isSensitiveFact(nextOccasion.fact),
      })
    )
  }

  if ((daysSinceLastEvent ?? 0) >= 120 || input.financialSummary?.is_dormant) {
    predictions.push(
      makePrediction({
        clientId: input.clientId,
        type: 'churn_risk',
        title: 'Retention touch needed',
        confidence: clamp01(0.55 + Math.min((daysSinceLastEvent ?? 120) / 365, 0.35)),
        reasons: [
          lastEventDate
            ? `Last event was ${daysSinceLastEvent} days ago`
            : 'No completed event date is available',
          lifetimeValueCents > 0 ? 'Client has prior revenue history' : 'No revenue history yet',
        ],
        suggestedAction: 'Review relationship context, then send a relevant follow-up.',
        riskLevel: (daysSinceLastEvent ?? 0) >= 180 ? 'high' : 'medium',
        expiresAt: addDays(now, 14).toISOString(),
        expectedValueCents: lifetimeValueCents > 0 ? Math.round(lifetimeValueCents * 0.25) : null,
        evidence: evidenceFromFacts(input.facts, ['lifetime_value', 'last_event_date']),
        hasBlockingContradiction: false,
        hasSensitiveEvidence: false,
      })
    )
  }

  if (lifetimeValueCents > 0 && completedEvents.length >= 2) {
    predictions.push(
      makePrediction({
        clientId: input.clientId,
        type: 'next_purchase',
        title: 'Likely repeat service candidate',
        confidence: clamp01(0.5 + Math.min(completedEvents.length, 5) * 0.07),
        reasons: [
          `${completedEvents.length} completed service(s)`,
          averageSpendCents > 0
            ? `Average service value is $${Math.round(averageSpendCents / 100)}`
            : 'Spend history exists',
        ],
        suggestedAction: 'Prepare a next-service option based on the latest confirmed preferences.',
        riskLevel: 'low',
        expiresAt: addDays(now, 45).toISOString(),
        expectedValueCents: averageSpendCents > 0 ? averageSpendCents : null,
        evidence: evidenceFromFacts(input.facts, ['lifetime_value', 'completed_event']),
        hasBlockingContradiction,
        hasSensitiveEvidence: false,
      })
    )
  }

  if (
    averageSpendCents >= 150000 ||
    activeFacts.some((fact) => fact.fieldKey === 'referral_potential')
  ) {
    predictions.push(
      makePrediction({
        clientId: input.clientId,
        type: 'upsell',
        title: 'Premium offer or referral ask candidate',
        confidence: clamp01(0.52 + (averageSpendCents >= 150000 ? 0.2 : 0.08)),
        reasons: [
          averageSpendCents >= 150000
            ? 'Average spend supports a premium option'
            : 'Referral potential exists in the profile',
        ],
        suggestedAction: 'Review margin and relationship context before sending an offer.',
        riskLevel: 'low',
        expiresAt: addDays(now, 30).toISOString(),
        expectedValueCents: averageSpendCents > 0 ? Math.round(averageSpendCents * 0.35) : null,
        evidence: evidenceFromFacts(input.facts, ['average_spend', 'referral_potential']),
        hasBlockingContradiction,
        hasSensitiveEvidence: false,
      })
    )
  }

  if (highRiskFacts.length > 0 || input.contradictions.length > 0) {
    const facts = highRiskFacts.slice(0, 4)
    predictions.push(
      makePrediction({
        clientId: input.clientId,
        type: 'service_risk_warning',
        title:
          input.contradictions.length > 0
            ? 'Resolve profile conflict before service'
            : 'Review hard warnings before service',
        confidence:
          input.contradictions.length > 0 ? 0.92 : average(facts.map((fact) => fact.confidence)),
        reasons:
          input.contradictions.length > 0
            ? input.contradictions.map((item) => item.title)
            : facts.map((fact) => `${fact.label}: ${fact.value}`),
        suggestedAction:
          input.contradictions.length > 0
            ? 'Resolve the contradiction before using this profile for a menu or automation.'
            : 'Confirm restrictions before proposing menus.',
        riskLevel: input.contradictions.some((item) => item.severity === 'critical')
          ? 'high'
          : 'medium',
        expiresAt: addDays(now, 7).toISOString(),
        expectedValueCents: null,
        evidence: facts.flatMap((fact) => fact.evidence),
        hasBlockingContradiction,
        hasSensitiveEvidence: facts.some(isSensitiveFact),
      })
    )
  }

  return predictions.sort((left, right) => right.confidence - left.confidence)
}

function projectClientFacts(
  client: ClientIntelligenceRawClient,
  addFact: (input: FactInput) => void
) {
  const source = {
    clientId: client.id,
    sourceType: 'client_record' as const,
    sourceTable: 'clients',
    sourceRecordId: client.id,
    observedAt: client.updated_at ?? client.created_at ?? null,
  }

  addFact({
    ...source,
    category: 'Identity',
    fieldKey: 'full_name',
    label: 'Full name',
    value: client.full_name,
    sourceLabel: 'Client record',
    confidence: 0.9,
  })
  addFact({
    ...source,
    category: 'Identity',
    fieldKey: 'preferred_name',
    label: 'Preferred name',
    value: client.preferred_name,
    sourceLabel: 'Client record',
    confidence: 0.82,
  })
  addFact({
    ...source,
    category: 'Identity',
    fieldKey: 'birthday',
    label: 'Birthday',
    value: client.birthday,
    sourceLabel: 'Client record',
    confidence: 0.8,
    actionability: 'reminder',
  })
  addFact({
    ...source,
    category: 'Events & Occasions',
    fieldKey: 'anniversary',
    label: 'Anniversary',
    value: client.anniversary,
    sourceLabel: 'Client record',
    confidence: 0.8,
    actionability: 'reminder',
  })
  addFact({
    ...source,
    category: 'Contact & Communication',
    fieldKey: 'preferred_contact_method',
    label: 'Preferred channel',
    value: client.preferred_contact_method,
    sourceLabel: 'Client record',
    confidence: 0.72,
  })
  addFact({
    ...source,
    category: 'Contact & Communication',
    fieldKey: 'communication_style',
    label: 'Communication style',
    value: client.communication_style_notes,
    sourceLabel: 'Chef/client record',
    confidence: 0.68,
  })
  addFact({
    ...source,
    category: 'Food Preferences',
    fieldKey: 'favorite_cuisine',
    label: 'Favorite cuisine',
    value: client.favorite_cuisines,
    sourceLabel: 'Client record',
    confidence: 0.74,
    actionability: 'recommendation',
  })
  addFact({
    ...source,
    category: 'Food Preferences',
    fieldKey: 'favorite_dish',
    label: 'Favorite dish',
    value: client.favorite_dishes,
    sourceLabel: 'Client record',
    confidence: 0.74,
    actionability: 'recommendation',
  })
  addFact({
    ...source,
    category: 'Food Preferences',
    fieldKey: 'dislike',
    label: 'Dislike',
    value: client.dislikes,
    sourceLabel: 'Client record',
    confidence: 0.72,
    actionability: 'warning',
  })
  addFact({
    ...source,
    category: 'Food Preferences',
    fieldKey: 'spice_tolerance',
    label: 'Spice tolerance',
    value: client.spice_tolerance,
    sourceLabel: 'Client record',
    confidence: 0.72,
    actionability: 'recommendation',
  })
  addFact({
    ...source,
    category: 'Dietary Rules',
    fieldKey: 'dietary_restriction',
    label: 'Dietary restriction',
    value: client.dietary_restrictions,
    sourceLabel: 'Client record',
    confidence: 0.78,
    actionability: 'warning',
  })
  addFact({
    ...source,
    category: 'Dietary Rules',
    fieldKey: 'dietary_protocol',
    label: 'Dietary protocol',
    value: client.dietary_protocols,
    sourceLabel: 'Client record',
    confidence: 0.72,
    actionability: 'warning',
  })
  addFact({
    ...source,
    category: 'Dietary Rules',
    fieldKey: 'allergy',
    label: 'Allergy',
    value: client.allergies,
    sourceLabel: 'Client record',
    confidence: 0.82,
    actionability: 'warning',
  })
  addFact({
    ...source,
    category: 'Household',
    fieldKey: 'partner_name',
    label: 'Partner',
    value: client.partner_name,
    sourceLabel: 'Client record',
    confidence: 0.66,
  })
  addFact({
    ...source,
    category: 'Children',
    fieldKey: 'children',
    label: 'Children',
    value: client.children,
    sourceLabel: 'Client record',
    confidence: 0.66,
    sensitivity: 'child_sensitive',
    disclosure: 'client_visible',
  })
  addFact({
    ...source,
    category: 'Pets',
    fieldKey: 'pets',
    label: 'Pets',
    value: jsonList(client.pets),
    sourceLabel: 'Client record',
    confidence: 0.64,
  })
  addFact({
    ...source,
    category: 'Service Preferences',
    fieldKey: 'preferred_service_style',
    label: 'Service style',
    value: client.preferred_service_style,
    sourceLabel: 'Client record',
    confidence: 0.72,
    actionability: 'recommendation',
  })
  addFact({
    ...source,
    category: 'Kitchen & Home',
    fieldKey: 'access_instructions',
    label: 'Access instructions',
    value: client.access_instructions,
    sourceLabel: 'Client record',
    confidence: 0.72,
    sensitivity: 'security_sensitive',
    disclosure: 'chef_only',
    actionability: 'warning',
  })
  addFact({
    ...source,
    category: 'Kitchen & Home',
    fieldKey: 'gate_code',
    label: 'Gate code',
    value: client.gate_code,
    sourceLabel: 'Client record',
    confidence: 0.72,
    sensitivity: 'security_sensitive',
    disclosure: 'owner_only',
    actionability: 'warning',
  })
  addFact({
    ...source,
    category: 'Kitchen & Home',
    fieldKey: 'security_notes',
    label: 'Security notes',
    value: client.security_notes,
    sourceLabel: 'Client record',
    confidence: 0.72,
    sensitivity: 'security_sensitive',
    disclosure: 'owner_only',
    actionability: 'warning',
  })
  addFact({
    ...source,
    category: 'Money & Commercial',
    fieldKey: 'budget_range',
    label: 'Budget range',
    value: formatBudget(client.budget_range_min_cents, client.budget_range_max_cents),
    sourceLabel: 'Client record',
    confidence: 0.68,
    disclosure: 'chef_only',
    sensitivity: 'financial_sensitive',
    actionability: 'recommendation',
  })
  addFact({
    ...source,
    category: 'Money & Commercial',
    fieldKey: 'payment_behavior',
    label: 'Payment behavior',
    value: client.payment_behavior,
    sourceLabel: 'Chef notes',
    confidence: 0.62,
    disclosure: 'chef_only',
    sensitivity: 'financial_sensitive',
  })
  addFact({
    ...source,
    category: 'Relationship & Psychology',
    fieldKey: 'vibe_notes',
    label: 'Vibe notes',
    value: client.vibe_notes,
    sourceLabel: 'Chef notes',
    confidence: 0.58,
    disclosure: 'chef_only',
    sensitivity: 'relationship_sensitive',
    actionability: 'private_note',
  })
  addFact({
    ...source,
    category: 'Relationship & Psychology',
    fieldKey: 'what_they_care_about',
    label: 'What they care about',
    value: client.what_they_care_about,
    sourceLabel: 'Chef notes',
    confidence: 0.62,
    disclosure: 'chef_only',
    sensitivity: 'relationship_sensitive',
  })
  addFact({
    ...source,
    category: 'Risk Flags',
    fieldKey: 'red_flags',
    label: 'Risk flag',
    value: client.red_flags,
    sourceLabel: 'Chef notes',
    confidence: 0.62,
    disclosure: 'owner_only',
    sensitivity: 'relationship_sensitive',
    actionability: 'warning',
  })
  addFact({
    ...source,
    category: 'Upsell Signals',
    fieldKey: 'referral_potential',
    label: 'Referral potential',
    value: client.referral_potential,
    sourceLabel: 'Client record',
    confidence: 0.56,
    disclosure: 'chef_only',
    actionability: 'recommendation',
  })
  addFact({
    ...source,
    category: 'Events & Occasions',
    fieldKey: 'important_date',
    label: 'Important date',
    value: dateObjects(client.important_dates),
    sourceLabel: 'Client record',
    confidence: 0.76,
    actionability: 'reminder',
  })
  addFact({
    ...source,
    category: 'Events & Occasions',
    fieldKey: 'personal_milestone',
    label: 'Personal milestone',
    value: dateObjects(client.personal_milestones),
    sourceLabel: 'Client record',
    confidence: 0.7,
    actionability: 'reminder',
  })
}

function projectEventFacts(
  clientId: string,
  events: Array<Record<string, any>>,
  addFact: (input: FactInput) => void
) {
  for (const event of events) {
    const source = {
      clientId,
      sourceType: 'event' as const,
      sourceTable: 'events',
      sourceRecordId: event.id ?? null,
      observedAt: event.event_date ?? event.updated_at ?? event.created_at ?? null,
    }
    addFact({
      ...source,
      category: 'History With The Chef',
      fieldKey: 'completed_event',
      label: 'Completed event',
      value: event.status === 'completed' ? event.occasion || event.event_date : null,
      sourceLabel: 'Event history',
      confidence: 0.78,
      actionability: 'context',
    })
    addFact({
      ...source,
      category: 'Events & Occasions',
      fieldKey: 'event_occasion',
      label: 'Occasion',
      value: event.occasion,
      sourceLabel: 'Event history',
      confidence: 0.7,
      actionability: 'reminder',
    })
    addFact({
      ...source,
      category: 'Dietary Rules',
      fieldKey: 'event_dietary_restriction',
      label: 'Event dietary restriction',
      value: event.dietary_restrictions,
      sourceLabel: 'Event record',
      confidence: 0.66,
      actionability: 'warning',
    })
    addFact({
      ...source,
      category: 'Dietary Rules',
      fieldKey: 'event_allergy',
      label: 'Event allergy',
      value: event.allergies,
      sourceLabel: 'Event record',
      confidence: 0.72,
      actionability: 'warning',
    })
    addFact({
      ...source,
      category: 'Taste Memory',
      fieldKey: 'event_special_request',
      label: 'Special request',
      value: event.special_requests,
      sourceLabel: 'Event record',
      confidence: 0.64,
      actionability: 'recommendation',
    })
    addFact({
      ...source,
      category: 'Kitchen & Home',
      fieldKey: 'kitchen_notes',
      label: 'Kitchen note',
      value: event.kitchen_notes,
      sourceLabel: 'Event record',
      confidence: 0.62,
      disclosure: 'chef_only',
    })
    addFact({
      ...source,
      category: 'Operational Notes',
      fieldKey: 'chef_outcome_note',
      label: 'Chef outcome note',
      value: event.chef_outcome_notes,
      sourceLabel: 'Event debrief',
      confidence: 0.7,
      disclosure: 'chef_only',
    })
  }
}

function projectPreferenceFacts(
  clientId: string,
  preferences: Array<Record<string, any>>,
  addFact: (input: FactInput) => void
) {
  for (const preference of preferences) {
    const rating = String(preference.rating ?? '').toLowerCase()
    const fieldKey =
      rating.includes('dislike') || rating.includes('hate')
        ? 'disliked_item'
        : rating.includes('love') || rating.includes('like')
          ? 'loved_item'
          : 'preference_item'
    addFact({
      clientId,
      category: fieldKey === 'disliked_item' ? 'Ingredient-Level Avoids' : 'Taste Memory',
      fieldKey,
      label: fieldKey === 'disliked_item' ? 'Avoided item' : 'Positive food signal',
      value: preference.item_name,
      sourceType: 'client_preference',
      sourceTable: 'client_preferences',
      sourceRecordId: preference.id ?? null,
      sourceLabel: `Preference ledger${preference.rating ? `: ${preference.rating}` : ''}`,
      observedAt: preference.observed_at ?? preference.updated_at ?? preference.created_at ?? null,
      confidence: fieldKey === 'preference_item' ? 0.56 : 0.78,
      actionability: fieldKey === 'disliked_item' ? 'warning' : 'recommendation',
    })
  }
}

function projectAllergyFacts(
  clientId: string,
  allergyRecords: Array<Record<string, any>>,
  addFact: (input: FactInput) => void
) {
  for (const record of allergyRecords) {
    const confirmed = Boolean(record.confirmed_by_chef)
    addFact({
      clientId,
      category: 'Dietary Rules',
      fieldKey: 'allergy_record',
      label: `${record.severity === 'anaphylaxis' ? 'Critical allergy' : 'Allergy record'}`,
      value: record.allergen,
      sourceType: 'allergy_record',
      sourceTable: 'client_allergy_records',
      sourceRecordId: record.id ?? null,
      sourceLabel: confirmed ? 'Chef-confirmed allergy record' : 'Unconfirmed allergy record',
      observedAt: record.confirmed_at ?? record.updated_at ?? record.created_at ?? null,
      confidence: confirmed ? 0.96 : 0.68,
      confirmed,
      sensitivity: 'medical_sensitive',
      actionability: 'warning',
    })
  }
}

function projectSurveyFacts(
  clientId: string,
  surveys: Array<Record<string, any>>,
  addFact: (input: FactInput) => void
) {
  for (const survey of surveys) {
    const observedAt = survey.completed_at ?? survey.created_at ?? null
    addFact({
      clientId,
      category: 'Feedback Intelligence',
      fieldKey: 'what_they_loved',
      label: 'Loved after service',
      value: survey.what_they_loved,
      sourceType: 'post_event_survey',
      sourceTable: 'post_event_surveys',
      sourceRecordId: survey.id ?? null,
      sourceLabel: 'Client survey',
      observedAt,
      confidence: 0.84,
      actionability: 'recommendation',
    })
    addFact({
      clientId,
      category: 'Feedback Intelligence',
      fieldKey: 'what_could_improve',
      label: 'Could improve',
      value: survey.what_could_improve,
      sourceType: 'post_event_survey',
      sourceTable: 'post_event_surveys',
      sourceRecordId: survey.id ?? null,
      sourceLabel: 'Client survey',
      observedAt,
      confidence: 0.84,
      actionability: 'warning',
    })
    addFact({
      clientId,
      category: 'Churn & Retention Signals',
      fieldKey: 'would_book_again',
      label: 'Would book again',
      value:
        survey.would_book_again === false ? 'No' : survey.would_book_again === true ? 'Yes' : null,
      sourceType: 'post_event_survey',
      sourceTable: 'post_event_surveys',
      sourceRecordId: survey.id ?? null,
      sourceLabel: 'Client survey',
      observedAt,
      confidence: 0.82,
      disclosure: 'chef_only',
      actionability: survey.would_book_again === false ? 'warning' : 'context',
    })
  }
}

function projectFinancialFacts(
  clientId: string,
  financialSummary: Record<string, any> | null | undefined,
  addFact: (input: FactInput) => void
) {
  if (!financialSummary) return
  const source = {
    clientId,
    sourceType: 'financial_summary' as const,
    sourceTable: 'client_financial_summary',
    sourceRecordId: clientId,
    observedAt: financialSummary.last_event_date ?? null,
    sourceLabel: 'Tenant-scoped financial summary',
    disclosure: 'chef_only' as const,
    sensitivity: 'financial_sensitive' as const,
  }
  addFact({
    ...source,
    category: 'Client Value Metrics',
    fieldKey: 'lifetime_value',
    label: 'Lifetime value',
    value: money(financialSummary.lifetime_value_cents),
    confidence: 0.86,
    actionability: 'recommendation',
  })
  addFact({
    ...source,
    category: 'Client Value Metrics',
    fieldKey: 'average_spend',
    label: 'Average spend',
    value: money(financialSummary.average_spend_per_event),
    confidence: 0.82,
    actionability: 'recommendation',
  })
  addFact({
    ...source,
    category: 'Churn & Retention Signals',
    fieldKey: 'last_event_date',
    label: 'Last event date',
    value: financialSummary.last_event_date,
    confidence: 0.84,
    actionability: 'reminder',
  })
  addFact({
    ...source,
    category: 'Churn & Retention Signals',
    fieldKey: 'dormancy_status',
    label: 'Dormancy status',
    value: financialSummary.is_dormant ? 'Dormant' : null,
    confidence: 0.8,
    actionability: 'warning',
  })
}

function projectHouseholdFacts(
  clientId: string,
  households: Array<Record<string, any>>,
  householdMembers: Array<Record<string, any>>,
  addFact: (input: FactInput) => void
) {
  for (const household of households) {
    addFact({
      clientId,
      category: 'Household',
      fieldKey: 'household',
      label: 'Household',
      value: household.name,
      sourceType: 'household',
      sourceTable: 'households',
      sourceRecordId: household.id ?? null,
      sourceLabel: 'Tenant-scoped household',
      observedAt: household.updated_at ?? household.created_at ?? null,
      confidence: 0.72,
    })
  }
  for (const member of householdMembers) {
    addFact({
      clientId,
      category: 'Household',
      fieldKey: 'relationship_edge',
      label: 'Relationship edge',
      value: member.relationship ? `${member.client_id}: ${member.relationship}` : member.client_id,
      sourceType: 'household_member',
      sourceTable: 'household_members',
      sourceRecordId: member.client_id ?? null,
      sourceLabel: 'Household member link',
      observedAt: null,
      confidence: 0.68,
    })
  }
}

function projectProfileVectorFacts(
  clientId: string,
  vectors: Array<Record<string, any>>,
  addFact: (input: FactInput) => void
) {
  for (const vector of vectors) {
    addFact({
      clientId,
      category: 'Preference Inference',
      fieldKey: 'profile_vector',
      label: 'Current culinary vector',
      value: vector.engine_version
        ? `Current vector ${vector.engine_version}`
        : 'Current profile vector',
      sourceType: 'client_profile_vector',
      sourceTable: 'client_profile_vectors',
      sourceRecordId: vector.id ?? null,
      sourceLabel: 'Profile engine vector',
      observedAt: vector.generated_at ?? vector.created_at ?? null,
      confidence: Number(vector.confidence_score ?? 0.5),
      disclosure: 'chef_only',
      actionability: 'recommendation',
    })
  }
}

function buildClientIntelligenceActions(
  clientId: string,
  predictions: ClientIntelligencePrediction[],
  contradictions: ClientIntelligenceContradiction[]
): ClientIntelligenceAction[] {
  const contradictionActions = contradictions.map((contradiction) => ({
    id: `action:${contradiction.id}`,
    title: contradiction.title,
    ownerRole: 'chef' as const,
    dueDate: contradiction.dueDate,
    priority: contradiction.severity === 'critical' ? ('critical' as const) : ('high' as const),
    status: 'needs_review' as const,
    linkedClientId: clientId,
    sourcePredictionId: null,
    sourceFactIds: contradiction.factIds,
  }))
  const predictionActions = predictions
    .filter((prediction) => prediction.status !== 'needs_more_data')
    .map((prediction) => ({
      id: `action:${prediction.id}`,
      title: prediction.suggestedAction,
      ownerRole: 'chef' as const,
      dueDate: prediction.expiresAt,
      priority:
        prediction.riskLevel === 'high'
          ? ('high' as const)
          : prediction.reviewRequired
            ? ('medium' as const)
            : ('low' as const),
      status:
        prediction.status === 'blocked_by_contradiction'
          ? ('blocked' as const)
          : prediction.reviewRequired
            ? ('needs_review' as const)
            : ('suggested' as const),
      linkedClientId: clientId,
      sourcePredictionId: prediction.id,
      sourceFactIds: [],
    }))
  return [...contradictionActions, ...predictionActions]
}

function makePrediction(input: {
  clientId: string
  type: ClientIntelligencePredictionType
  title: string
  confidence: number
  reasons: string[]
  suggestedAction: string
  riskLevel: ClientIntelligencePrediction['riskLevel']
  expiresAt: string | null
  expectedValueCents: number | null
  evidence: ClientIntelligenceEvidence[]
  hasBlockingContradiction: boolean
  hasSensitiveEvidence: boolean
}): ClientIntelligencePrediction {
  const confidence = clamp01(input.confidence)
  const status: ClientIntelligencePredictionStatus = input.hasBlockingContradiction
    ? 'blocked_by_contradiction'
    : confidence < 0.35
      ? 'needs_more_data'
      : confidence < 0.68 || input.hasSensitiveEvidence
        ? 'needs_review'
        : 'suggestion'
  const reviewRequired = status !== 'suggestion'
  return {
    id: `prediction:${input.clientId}:${input.type}`,
    clientId: input.clientId,
    type: input.type,
    title: input.title,
    status,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    reasons: input.reasons.filter(Boolean),
    suggestedAction: input.suggestedAction,
    riskLevel: input.riskLevel,
    expiresAt: input.expiresAt,
    expectedValueCents: input.expectedValueCents,
    evidence: mergeEvidence(input.evidence),
    reviewRequired,
    safeToAutomate: !reviewRequired && input.riskLevel !== 'high' && !input.hasSensitiveEvidence,
  }
}

function buildEmptyStates(
  facts: ClientIntelligenceFact[],
  predictions: ClientIntelligencePrediction[]
): string[] {
  const states: string[] = []
  if (facts.length === 0) states.push('No usable profile facts are available yet.')
  if (!facts.some((fact) => fact.category === 'Dietary Rules')) {
    states.push('No dietary or allergy facts have been captured.')
  }
  if (!facts.some((fact) => fact.category === 'Events & Occasions')) {
    states.push('No birthdays, anniversaries, or occasion dates are available.')
  }
  if (!facts.some((fact) => fact.sourceType === 'event')) {
    states.push('No event history is available for projection.')
  }
  if (predictions.length === 0) {
    states.push('No predictions were generated because the ledger does not have enough evidence.')
  }
  return states
}

function scoreFactImportance(fact: ClientIntelligenceFact, now: Date): number {
  let score = 20
  if (fact.actionability === 'warning') score += 28
  if (fact.actionability === 'recommendation') score += 14
  if (fact.actionability === 'reminder') score += 18
  if (fact.sensitivity !== 'normal') score += 12
  if (fact.confidenceLabel === 'high') score += 12
  if (fact.confidenceLabel === 'medium') score += 6
  if (fact.lifecycle === 'needs_review' || fact.lifecycle === 'contradicted') score += 18
  if (fact.lifecycle === 'stale') score -= 10
  if (
    fact.fieldKey === 'birthday' ||
    fact.fieldKey === 'anniversary' ||
    fact.fieldKey === 'important_date'
  ) {
    const days = annualDaysAway(fact.value, now)
    if (days !== null && days <= REVIEW_WITHIN_DAYS) score += 24
  }
  if (fact.freshnessDays !== null && fact.freshnessDays <= 60) score += 8
  return Math.max(0, Math.min(100, Math.round(score)))
}

function inferLifecycle(input: {
  confidence: number
  confirmed?: boolean
  freshnessDays: number | null
  sensitivity: ClientIntelligenceSensitivity
}): ClientIntelligenceFactLifecycle {
  if (input.confirmed) return 'confirmed'
  if (input.confidence < 0.7 || input.sensitivity !== 'normal') return 'needs_review'
  if (input.freshnessDays !== null && input.freshnessDays > STALE_AFTER_DAYS) return 'stale'
  return input.confidence >= 0.78 ? 'confirmed' : 'new'
}

function inferSensitivity(fieldKey: string): ClientIntelligenceSensitivity {
  if (MEDICAL_KEYS.has(fieldKey)) return 'medical_sensitive'
  if (SECURITY_KEYS.has(fieldKey)) return 'security_sensitive'
  if (FINANCIAL_KEYS.has(fieldKey)) return 'financial_sensitive'
  if (RELATIONSHIP_KEYS.has(fieldKey)) return 'relationship_sensitive'
  if (fieldKey === 'children') return 'child_sensitive'
  return 'normal'
}

function isSensitiveFact(fact: ClientIntelligenceFact): boolean {
  return (
    fact.sensitivity !== 'normal' ||
    fact.disclosure === 'owner_only' ||
    fact.consentStatus === 'needs_consent'
  )
}

function summarizeSources(facts: ClientIntelligenceFact[]) {
  const counts = new Map<ClientIntelligenceSourceType, number>()
  for (const fact of facts) {
    for (const evidence of fact.evidence) {
      counts.set(evidence.sourceType, (counts.get(evidence.sourceType) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([sourceType, count]) => ({ sourceType, count }))
    .sort((left, right) => right.count - left.count)
}

function evidenceFromFacts(facts: ClientIntelligenceFact[], fieldKeys: string[]) {
  return mergeEvidence(
    facts.filter((fact) => fieldKeys.includes(fact.fieldKey)).flatMap((fact) => fact.evidence)
  )
}

function mergeEvidence(...groups: ClientIntelligenceEvidence[][]): ClientIntelligenceEvidence[] {
  const byKey = new Map<string, ClientIntelligenceEvidence>()
  for (const evidence of groups.flat()) {
    const key = `${evidence.sourceType}:${evidence.sourceTable}:${evidence.sourceRecordId}:${evidence.label}`
    const current = byKey.get(key)
    if (!current || evidence.confidence > current.confidence) byKey.set(key, evidence)
  }
  return [...byKey.values()].sort((left, right) => right.confidence - left.confidence)
}

function chooseLifecycle(
  left: ClientIntelligenceFactLifecycle,
  right: ClientIntelligenceFactLifecycle
): ClientIntelligenceFactLifecycle {
  const rank: Record<ClientIntelligenceFactLifecycle, number> = {
    deleted_or_redacted: 6,
    contradicted: 5,
    confirmed: 4,
    needs_review: 3,
    new: 2,
    stale: 1,
    retired: 0,
  }
  return rank[right] > rank[left] ? right : left
}

function stricterDisclosure(
  left: ClientIntelligenceDisclosure,
  right: ClientIntelligenceDisclosure
): ClientIntelligenceDisclosure {
  const rank: Record<ClientIntelligenceDisclosure, number> = {
    client_visible: 0,
    staff_safe: 1,
    chef_only: 2,
    owner_only: 3,
  }
  return rank[right] > rank[left] ? right : left
}

function stricterSensitivity(
  left: ClientIntelligenceSensitivity,
  right: ClientIntelligenceSensitivity
): ClientIntelligenceSensitivity {
  if (left === 'normal') return right
  return left
}

function confidenceLabel(confidence: number): ClientIntelligenceConfidenceLabel {
  if (confidence >= 0.78) return 'high'
  if (confidence >= 0.55) return 'medium'
  return 'low'
}

function freshnessMultiplier(facts: ClientIntelligenceFact[]): number {
  const staleCount = facts.filter((fact) => fact.lifecycle === 'stale').length
  return Math.max(0.55, 1 - staleCount * 0.15)
}

function summarizeSourceLabels(evidence: ClientIntelligenceEvidence[]): string {
  return [...new Set(evidence.map((item) => item.label))].slice(0, 3).join(', ')
}

function stableFactId(clientId: string, category: string, fieldKey: string, value: string): string {
  return `fact:${clientId}:${normalizeKey(category)}:${normalizeKey(fieldKey)}:${normalizeKey(value).slice(0, 80)}`
}

function normalizeDisplayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || trimmed === '[]') return null
    return trimmed
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return null
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function daysSince(value: string | null | undefined, now: Date): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS))
}

function annualDaysAway(value: string, now: Date): number | null {
  const dateText = value.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? value
  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) return null
  const next = new Date(now)
  next.setMonth(date.getMonth(), date.getDate())
  next.setHours(12, 0, 0, 0)
  if (next.getTime() < now.getTime()) next.setFullYear(next.getFullYear() + 1)
  return Math.ceil((next.getTime() - now.getTime()) / DAY_MS)
}

function latestDate(values: Array<string | null | undefined>): string | null {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value as string))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())
  return dates[0]?.toISOString().slice(0, 10) ?? null
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

function minNullable(left: number | null, right: number | null): number | null {
  if (left === null) return right
  if (right === null) return left
  return Math.min(left, right)
}

function jsonList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object' && 'name' in entry) {
        return String((entry as { name?: unknown }).name ?? '')
      }
      return ''
    })
    .filter(Boolean)
}

function dateObjects(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (!entry || typeof entry !== 'object') return ''
      const item = entry as Record<string, unknown>
      const label = String(item.label ?? item.type ?? item.description ?? 'Important date')
      const date = String(item.date ?? '')
      return date ? `${label}: ${date}` : ''
    })
    .filter(Boolean)
}

function formatBudget(minCents: unknown, maxCents: unknown): string | null {
  const min = typeof minCents === 'number' ? minCents : null
  const max = typeof maxCents === 'number' ? maxCents : null
  if (min === null && max === null) return null
  if (min !== null && max !== null) return `${money(min)}-${money(max)}`
  return money(min ?? max ?? 0)
}

function money(value: unknown): string | null {
  if (typeof value !== 'number' || value <= 0) return null
  return `$${Math.round(value / 100).toLocaleString('en-US')}`
}
