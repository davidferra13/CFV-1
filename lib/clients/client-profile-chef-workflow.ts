import type {
  AmbiguousConstraint,
  CulinaryProfileVector,
  ProfileConstraint,
  ProfilePreference,
} from './client-profile-service-schema'

export interface MenuClientTasteSummary {
  clientId: string
  clientName: string
  loved: string[]
  disliked: string[]
  cuisinePreferences: string[]
  favoriteDishes: string[]
  spicePreference: string | null
  pastEventCount: number
}

export interface DietaryConflict {
  ingredientName: string
  dishName: string
  clientPreference: string
  sourceLabel: string
}

export interface ProposalProfileGuidance {
  confidenceScore: number | null
  confidenceSummary: string | null
  serviceDepth: string | null
  emotionalState: string | null
  hardVetoes: string[]
  strongLikes: string[]
  noveltyOpportunities: string[]
  ambiguities: Array<{ title: string; severity: string; question: string }>
}

export interface MenuConflictDish {
  dishName: string
  ingredientNames: string[]
  labelNames: string[]
}

const SEVERE_DISLIKE_SCORE = 0.7

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned : null
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
    .filter((part) => part.length > 1)
    .flatMap((part) => {
      if (part.length > 3 && part.endsWith('s')) {
        return [part, part.slice(0, -1)]
      }
      return [part]
    })
}

function overlapsValue(left: string, right: string): boolean {
  const leftKey = normalizeKey(left)
  const rightKey = normalizeKey(right)

  if (leftKey === rightKey) return true
  if (leftKey.includes(rightKey) || rightKey.includes(leftKey)) return true

  const leftTokens = new Set(tokenize(left))
  return tokenize(right).some((token) => leftTokens.has(token))
}

function formatEnumLabel(value: string | null | undefined): string | null {
  const cleaned = cleanText(value)
  if (!cleaned) return null

  return cleaned
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

function formatSpicePreference(raw: string | null | undefined): string | null {
  const value = normalizeKey(raw ?? '')
  if (!value) return null

  const map: Record<string, string> = {
    '1': 'No Spice',
    '2': 'Mild',
    '3': 'Medium',
    '4': 'Hot',
    '5': 'Very Hot',
    none: 'No Spice',
    mild: 'Mild',
    medium: 'Medium',
    hot: 'Hot',
    very_hot: 'Very Hot',
    spice: 'Likes Spice',
  }

  return map[value] ?? formatEnumLabel(raw)
}

function formatServiceDepth(
  value: CulinaryProfileVector['serviceDepth']['preferredDepth']
): string {
  return (
    formatEnumLabel(value)
      ?.replace('Multi Course', 'Multi-Course')
      .replace('Dropoff', 'Drop-Off') ?? 'Unknown'
  )
}

function formatEmotionalState(value: CulinaryProfileVector['affectiveContext']['state']): string {
  return formatEnumLabel(value) ?? 'Unknown'
}

function formatConfidenceSummary(vector: CulinaryProfileVector): string {
  const sourceTypeCount = Object.keys(vector.coverage.sourceCounts).length
  const confidence =
    vector.coverage.overallConfidence >= 0.75
      ? 'High confidence'
      : vector.coverage.overallConfidence >= 0.5
        ? 'Moderate confidence'
        : 'Low confidence'
  const recency =
    vector.coverage.recencyScore >= 0.8
      ? 'recent signals'
      : vector.coverage.recencyScore >= 0.55
        ? 'mixed recency'
        : 'aging signals'
  const openAmbiguityCount = vector.ambiguousConstraints.filter(
    (conflict) =>
      conflict.requiresUserArbitration &&
      (conflict.status === 'open' || conflict.status === 'pending_user')
  ).length

  if (openAmbiguityCount > 0) {
    return `${confidence} from ${sourceTypeCount} source ${sourceTypeCount === 1 ? 'type' : 'types'}; ${recency}; ${openAmbiguityCount} clarification${openAmbiguityCount === 1 ? '' : 's'} still open.`
  }

  return `${confidence} from ${sourceTypeCount} source ${sourceTypeCount === 1 ? 'type' : 'types'}; ${recency}.`
}

function topPreferenceLabels(
  preferences: ProfilePreference[],
  predicate: (preference: ProfilePreference) => boolean,
  limit: number
): string[] {
  return uniqueStrings(preferences.filter(predicate).map((preference) => preference.label)).slice(
    0,
    limit
  )
}

function deriveSpicePreference(vector: CulinaryProfileVector): string | null {
  const spiceSignal = vector.statedLikes.find(
    (preference) =>
      preference.category === 'flavor' &&
      (normalizeKey(preference.label) === 'spice' ||
        preference.evidenceRefs.some((ref) => ref.signalKey.includes('spice')))
  )

  if (!spiceSignal) return null

  for (const ref of spiceSignal.evidenceRefs) {
    const formatted = formatSpicePreference(ref.value)
    if (formatted) return formatted
  }

  return 'Likes Spice'
}

export function mapClientProfileVectorToMenuClientTasteSummary(input: {
  vector: CulinaryProfileVector
  clientName: string | null
  pastEventCount: number
}): MenuClientTasteSummary {
  const { vector, clientName, pastEventCount } = input
  const favoriteDishes = topPreferenceLabels(
    vector.statedLikes,
    (preference) => preference.category === 'dish',
    6
  )
  const favoriteDishKeys = new Set(favoriteDishes.map(normalizeKey))

  const loved = topPreferenceLabels(
    vector.statedLikes,
    (preference) =>
      preference.category !== 'cuisine' &&
      preference.category !== 'dish' &&
      normalizeKey(preference.label) !== 'spice' &&
      !favoriteDishKeys.has(normalizeKey(preference.label)),
    8
  )

  const disliked = uniqueStrings([
    ...vector.hardVetoes
      .filter((constraint) => constraint.category === 'dislike' || constraint.category === 'avoid')
      .map((constraint) => constraint.label),
    ...vector.statedDislikes.map((preference) => preference.label),
  ]).slice(0, 8)

  return {
    clientId: vector.clientId,
    clientName: clientName ?? 'Client',
    loved,
    disliked,
    cuisinePreferences: topPreferenceLabels(
      vector.statedLikes,
      (preference) => preference.category === 'cuisine',
      5
    ),
    favoriteDishes,
    spicePreference: deriveSpicePreference(vector),
    pastEventCount,
  }
}

function buildConstraintConflict(
  constraint: ProfileConstraint,
  sourceLabel: string
): {
  labels: string[]
  clientPreference: string
  sourceLabel: string
} {
  return {
    labels: [constraint.label],
    clientPreference: constraint.label,
    sourceLabel,
  }
}

function buildAmbiguityConflict(conflict: AmbiguousConstraint): {
  labels: string[]
  clientPreference: string
  sourceLabel: string
} {
  return {
    labels: conflict.conflictingSignals.length > 0 ? conflict.conflictingSignals : [conflict.title],
    clientPreference: conflict.queries[0]?.question ?? conflict.title,
    sourceLabel: 'Ambiguous constraint',
  }
}

export function buildDietaryConflictsFromVector(input: {
  vector: CulinaryProfileVector
  menuDishes: MenuConflictDish[]
}): DietaryConflict[] {
  const { vector, menuDishes } = input
  const seen = new Set<string>()
  const conflicts: Array<DietaryConflict & { rank: number }> = []

  const matchables = [
    ...vector.hardVetoes.map((constraint) => ({
      rank: constraint.severity === 'hard_veto' ? 3 : 2,
      ...buildConstraintConflict(constraint, 'Hard veto'),
    })),
    ...vector.statedDislikes
      .filter((preference) => preference.score >= SEVERE_DISLIKE_SCORE)
      .map((preference) => ({
        rank: 1,
        labels: [preference.label],
        clientPreference: preference.label,
        sourceLabel: 'Severe dislike',
      })),
    ...vector.ambiguousConstraints
      .filter(
        (conflict) =>
          conflict.requiresUserArbitration &&
          (conflict.status === 'open' || conflict.status === 'pending_user')
      )
      .map((conflict) => ({
        rank: 0,
        ...buildAmbiguityConflict(conflict),
      })),
  ]

  for (const dish of menuDishes) {
    const ingredientNames = uniqueStrings(dish.ingredientNames)
    const labelNames = uniqueStrings(dish.labelNames)

    for (const candidate of matchables) {
      const ingredientMatch = ingredientNames.find((ingredientName) =>
        candidate.labels.some((label) => overlapsValue(label, ingredientName))
      )

      if (ingredientMatch) {
        const key = [
          dish.dishName,
          ingredientMatch,
          normalizeKey(candidate.clientPreference),
          candidate.sourceLabel,
        ].join('|')
        if (!seen.has(key)) {
          seen.add(key)
          conflicts.push({
            ingredientName: ingredientMatch,
            dishName: dish.dishName,
            clientPreference: candidate.clientPreference,
            sourceLabel: candidate.sourceLabel,
            rank: candidate.rank,
          })
        }
        continue
      }

      const labelMatch = labelNames.find((labelName) =>
        candidate.labels.some((label) => overlapsValue(label, labelName))
      )

      if (!labelMatch) continue

      const key = [
        dish.dishName,
        labelMatch,
        normalizeKey(candidate.clientPreference),
        candidate.sourceLabel,
      ].join('|')

      if (seen.has(key)) continue
      seen.add(key)
      conflicts.push({
        ingredientName: labelMatch,
        dishName: dish.dishName,
        clientPreference: candidate.clientPreference,
        sourceLabel: candidate.sourceLabel,
        rank: candidate.rank,
      })
    }
  }

  return conflicts
    .sort(
      (left, right) =>
        right.rank - left.rank ||
        left.dishName.localeCompare(right.dishName) ||
        left.ingredientName.localeCompare(right.ingredientName)
    )
    .map(({ rank: _rank, ...conflict }) => conflict)
}

export function buildProposalProfileGuidance(
  vector: CulinaryProfileVector
): ProposalProfileGuidance {
  const ambiguities = vector.ambiguousConstraints
    .filter(
      (conflict) =>
        conflict.requiresUserArbitration &&
        (conflict.status === 'open' || conflict.status === 'pending_user')
    )
    .map((conflict) => ({
      title: conflict.title,
      severity: conflict.severity,
      question: conflict.queries[0]?.question ?? conflict.title,
    }))

  return {
    confidenceScore: vector.coverage.overallConfidence,
    confidenceSummary: formatConfidenceSummary(vector),
    serviceDepth: formatServiceDepth(vector.serviceDepth.preferredDepth),
    emotionalState: formatEmotionalState(vector.affectiveContext.state),
    hardVetoes: uniqueStrings(vector.hardVetoes.map((constraint) => constraint.label)).slice(0, 8),
    strongLikes: uniqueStrings(
      vector.statedLikes
        .filter((preference) => preference.score >= 0.7 && preference.category !== 'service')
        .map((preference) => preference.label)
    ).slice(0, 8),
    noveltyOpportunities: uniqueStrings(vector.noveltyPotential.map((item) => item.item)).slice(
      0,
      6
    ),
    ambiguities,
  }
}
