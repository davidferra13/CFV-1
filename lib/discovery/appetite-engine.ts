export const APPETITE_DOMAINS = [
  'food',
  'taste',
  'feel',
  'preparation',
  'needs',
  'body',
  'emotion',
  'moment',
  'people',
  'logistics',
  'economics',
  'memory',
] as const

export type AppetiteDomain = (typeof APPETITE_DOMAINS)[number]
export type AppetitePolarity = 'want' | 'avoid'
export type AppetiteHardness = 'soft' | 'hard'
export type AppetiteScope = 'session' | 'person' | 'learned'
export type AppetiteSignalSource = 'explicit' | 'behavior' | 'context' | 'system'
export type AppetiteSpinMode = 'for_me' | 'fresh' | 'chaos'

export type AppetiteTag = {
  id: string
  label: string
  domain: AppetiteDomain
  aliases?: readonly string[]
  discovery?: {
    craving?: string
    dietary?: string
    budget?: string
    intent?: string
    eventStyle?: string
    useCase?: string
  }
}

export type AppetiteSignal = {
  tagId: string
  polarity: AppetitePolarity
  strength: number
  confidence: number
  hardness: AppetiteHardness
  scope: AppetiteScope
  source: AppetiteSignalSource
  locked?: boolean
}

export type AppetiteState = {
  signals: AppetiteSignal[]
}

export type AppetiteEvidenceAction =
  | 'spin_seen'
  | 'lock'
  | 'unlock'
  | 'reject'
  | 'result_open'
  | 'shortlist'
  | 'conversion'
  | 'repeat'

export type AppetiteEvidence = {
  tagId: string
  action: AppetiteEvidenceAction
  occurredAt: string
  decisionId?: string
}

export type AppetiteBundleDemandEntry = {
  tagIds: string[]
  score: number
  evidenceCount: number
}

export type AppetiteBundleMarketGap = AppetiteBundleDemandEntry & {
  supplyScore: number
  gapScore: number
}

export type AppetiteDemandEntry = {
  tagId: string
  score: number
  evidenceCount: number
}

export type AppetiteSupplyObservation = {
  tagIds: readonly string[]
  availabilityWeight?: number
}

export type AppetiteSupplyCandidate = AppetiteSupplyObservation & {
  id: string
}

export type RankedAppetiteSupply = AppetiteSupplyCandidate & {
  eligible: boolean
  score: number
  matchedTagIds: string[]
  missingHardTagIds: string[]
  conflictingHardTagIds: string[]
}

export type GroupAppetiteParticipant = {
  participantId: string
  state: AppetiteState
}

export type GroupAppetitePreference = {
  tagId: string
  score: number
  participantCount: number
}

export type GroupAppetiteResolution = {
  state: AppetiteState
  sharedWants: GroupAppetitePreference[]
  sharedAvoids: GroupAppetitePreference[]
}

export type AppetiteMarketGap = {
  tagId: string
  demandScore: number
  supplyScore: number
  gapScore: number
}

export type AppetiteDiscoveryProjection = {
  craving?: string
  dietary?: string
  budget?: string
  intent?: string
  eventStyle?: string
  useCase?: string
}

export const APPETITE_TAGS: readonly AppetiteTag[] = [
  { id: 'food-thai', label: 'Thai', domain: 'food', discovery: { craving: 'Thai' } },
  { id: 'food-sushi', label: 'Sushi', domain: 'food', discovery: { craving: 'Sushi' } },
  { id: 'food-pizza', label: 'Pizza', domain: 'food', discovery: { craving: 'Pizza' } },
  { id: 'food-mexican', label: 'Mexican', domain: 'food', discovery: { craving: 'Mexican' } },
  { id: 'food-korean', label: 'Korean', domain: 'food', discovery: { craving: 'Korean' } },
  { id: 'food-pasta', label: 'Pasta', domain: 'food', discovery: { craving: 'Pasta' } },
  { id: 'food-seafood', label: 'Seafood', domain: 'food', discovery: { craving: 'Seafood' } },
  { id: 'food-burgers', label: 'Burgers', domain: 'food', discovery: { craving: 'Burgers' } },

  { id: 'taste-spicy', label: 'Spicy', domain: 'taste' },
  { id: 'taste-savory', label: 'Savory', domain: 'taste' },
  { id: 'taste-tangy', label: 'Tangy', domain: 'taste' },
  { id: 'taste-smoky', label: 'Smoky', domain: 'taste' },
  { id: 'taste-sweet-savory', label: 'Sweet + savory', domain: 'taste' },

  { id: 'feel-crispy', label: 'Crispy', domain: 'feel' },
  { id: 'feel-cozy', label: 'Cozy', domain: 'feel' },
  { id: 'feel-fresh', label: 'Fresh', domain: 'feel' },
  { id: 'feel-light', label: 'Light', domain: 'feel' },
  { id: 'feel-indulgent', label: 'Indulgent', domain: 'feel' },

  { id: 'prep-grilled', label: 'Grilled', domain: 'preparation' },
  { id: 'prep-fried', label: 'Fried', domain: 'preparation' },
  { id: 'prep-raw', label: 'Raw', domain: 'preparation' },
  { id: 'prep-braised', label: 'Braised', domain: 'preparation' },

  {
    id: 'need-vegan',
    label: 'Vegan',
    domain: 'needs',
    discovery: { dietary: 'Vegan' },
  },
  {
    id: 'need-vegetarian',
    label: 'Vegetarian',
    domain: 'needs',
    discovery: { dietary: 'Vegetarian' },
  },
  {
    id: 'need-gluten-free',
    label: 'Gluten-Free',
    domain: 'needs',
    discovery: { dietary: 'Gluten-Free' },
  },
  {
    id: 'need-dairy-free',
    label: 'Dairy-Free',
    domain: 'needs',
    discovery: { dietary: 'Dairy-Free' },
  },

  { id: 'body-hungry', label: 'Really hungry', domain: 'body' },
  { id: 'body-snacky', label: 'Snacky', domain: 'body' },
  { id: 'body-recovery', label: 'Recovery food', domain: 'body' },

  { id: 'emotion-comfort', label: 'Comfort', domain: 'emotion' },
  { id: 'emotion-celebratory', label: 'Celebratory', domain: 'emotion' },
  { id: 'emotion-adventurous', label: 'Adventurous', domain: 'emotion', discovery: { useCase: 'adventurous' } },

  { id: 'moment-tonight', label: 'Tonight', domain: 'moment', discovery: { intent: 'tonight' } },
  { id: 'moment-late-night', label: 'Late night', domain: 'moment', discovery: { intent: 'late_night' } },
  { id: 'moment-weekend', label: 'This weekend', domain: 'moment', discovery: { intent: 'weekend' } },

  { id: 'people-solo', label: 'Just me', domain: 'people' },
  { id: 'people-date', label: 'Date night', domain: 'people' },
  { id: 'people-group', label: 'Group', domain: 'people', discovery: { useCase: 'group' } },

  { id: 'logistics-quick', label: 'Quick', domain: 'logistics', discovery: { intent: 'quick_eats' } },
  { id: 'logistics-going-out', label: 'Going out', domain: 'logistics', discovery: { intent: 'going_out' } },
  { id: 'logistics-private-chef', label: 'Private chef', domain: 'logistics', discovery: { intent: 'private_chef' } },

  {
    id: 'economics-budget',
    label: 'Budget-friendly',
    domain: 'economics',
    discovery: { budget: 'Under $30/person' },
  },
  {
    id: 'economics-mid',
    label: 'Mid-range',
    domain: 'economics',
    discovery: { budget: '$30-60/person' },
  },
  {
    id: 'economics-splurge',
    label: 'Splurge',
    domain: 'economics',
    discovery: { budget: '$100+/person' },
  },

  { id: 'memory-favorite', label: 'A favorite', domain: 'memory' },
  { id: 'memory-new', label: 'Something new', domain: 'memory' },
  { id: 'memory-not-recent', label: 'Haven\'t had lately', domain: 'memory' },
]

const TAG_BY_ID = new Map(APPETITE_TAGS.map((tag) => [tag.id, tag]))

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function normalizeSignal(signal: AppetiteSignal): AppetiteSignal | null {
  if (!TAG_BY_ID.has(signal.tagId)) return null
  return {
    ...signal,
    strength: clamp01(signal.strength),
    confidence: clamp01(signal.confidence),
    locked: Boolean(signal.locked),
  }
}

export function getAppetiteTag(tagId: string): AppetiteTag | undefined {
  return TAG_BY_ID.get(tagId)
}


function normalizeAppetiteText(value: string) {
  return value
    .toLowerCase()
    .replace(/[+&/]/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function inferAppetiteTagIds(values: readonly (string | null | undefined)[]): string[] {
  const haystack = ' ' + normalizeAppetiteText(values.filter(Boolean).join(' ')) + ' '
  const matches: string[] = []

  for (const tag of APPETITE_TAGS) {
    const candidates = [
      tag.label,
      ...(tag.aliases ?? []),
      tag.discovery?.craving,
      tag.discovery?.dietary,
      tag.discovery?.budget,
    ].filter((value): value is string => Boolean(value))

    if (
      candidates.some((candidate) => {
        const normalized = normalizeAppetiteText(candidate)
        return normalized.length > 1 && haystack.includes(' ' + normalized + ' ')
      })
    ) {
      matches.push(tag.id)
    }
  }

  return matches
}

export function buildAppetiteState(signals: readonly AppetiteSignal[] = []): AppetiteState {
  const merged = new Map<string, AppetiteSignal>()

  for (const candidate of signals) {
    const signal = normalizeSignal(candidate)
    if (!signal) continue

    const existing = merged.get(signal.tagId)
    if (!existing) {
      merged.set(signal.tagId, signal)
      continue
    }

    const precedence = (value: AppetiteSignal) =>
      value.strength * value.confidence +
      (value.hardness === 'hard' ? 4 : 0) +
      (value.locked ? 2 : 0) +
      (value.source === 'explicit' ? 1.5 : 0) +
      (value.scope === 'session' ? 1 : value.scope === 'person' ? 0.5 : 0)

    if (precedence(signal) >= precedence(existing)) merged.set(signal.tagId, signal)
  }

  return { signals: [...merged.values()] }
}

function weightedPick(
  candidates: readonly AppetiteTag[],
  weights: readonly number[],
  rng: () => number
): AppetiteTag | undefined {
  if (candidates.length === 0) return undefined
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0)
  if (total <= 0) return candidates[Math.floor(rng() * candidates.length) % candidates.length]

  let cursor = clamp01(rng()) * total
  for (let index = 0; index < candidates.length; index += 1) {
    cursor -= Math.max(0, weights[index] ?? 0)
    if (cursor <= 0) return candidates[index]
  }

  return candidates[candidates.length - 1]
}

function preferenceWeight(tagId: string, signals: readonly AppetiteSignal[], mode: AppetiteSpinMode) {
  if (mode !== 'for_me') return 1

  return signals.reduce((weight, signal) => {
    if (signal.tagId !== tagId || signal.polarity !== 'want' || signal.hardness === 'hard') {
      return weight
    }

    const scopeBoost = signal.scope === 'learned' ? 3 : signal.scope === 'person' ? 2.25 : 1.6
    return weight + scopeBoost * signal.strength * signal.confidence
  }, 1)
}

export function spinAppetite(
  state: AppetiteState,
  options: {
    mode: AppetiteSpinMode
    rng?: () => number
    domains?: readonly AppetiteDomain[]
  }
): AppetiteState {
  const rng = options.rng ?? Math.random
  const domains = options.domains ?? ['food', 'taste', 'feel']
  const hardAvoids = new Set(
    state.signals
      .filter((signal) => signal.hardness === 'hard' && signal.polarity === 'avoid')
      .map((signal) => signal.tagId)
  )

  const retained = state.signals.filter((signal) => signal.hardness === 'hard' || signal.locked)
  const retainedIds = new Set(retained.map((signal) => signal.tagId))
  const generated: AppetiteSignal[] = []

  for (const domain of domains) {
    if (
      retained.some(
        (signal) => signal.polarity === 'want' && getAppetiteTag(signal.tagId)?.domain === domain
      )
    ) {
      continue
    }

    const candidates = APPETITE_TAGS.filter(
      (tag) => tag.domain === domain && !hardAvoids.has(tag.id) && !retainedIds.has(tag.id)
    )
    const weights = candidates.map((tag) => preferenceWeight(tag.id, state.signals, options.mode))
    const selected = weightedPick(candidates, weights, rng)
    if (!selected) continue

    generated.push({
      tagId: selected.id,
      polarity: 'want',
      strength: options.mode === 'chaos' ? 0.55 : 0.7,
      confidence: options.mode === 'for_me' ? 0.8 : 0.65,
      hardness: 'soft',
      scope: 'session',
      source: 'system',
      locked: false,
    })
  }

  return buildAppetiteState([...retained, ...generated])
}

function scoreSignal(signal: AppetiteSignal) {
  return signal.strength * signal.confidence * (signal.hardness === 'hard' ? 2 : 1)
}

export function projectAppetiteStateToDiscovery(
  state: AppetiteState
): AppetiteDiscoveryProjection {
  const wanted = state.signals
    .filter((signal) => signal.polarity === 'want')
    .map((signal) => ({ signal, tag: getAppetiteTag(signal.tagId) }))
    .filter((entry): entry is { signal: AppetiteSignal; tag: AppetiteTag } => Boolean(entry.tag))
    .sort((a, b) => scoreSignal(b.signal) - scoreSignal(a.signal))

  const projection: AppetiteDiscoveryProjection = {}

  for (const { tag } of wanted) {
    const discovery = tag.discovery
    if (!discovery) continue
    if (!projection.craving && discovery.craving) projection.craving = discovery.craving
    if (!projection.dietary && discovery.dietary) projection.dietary = discovery.dietary
    if (!projection.budget && discovery.budget) projection.budget = discovery.budget
    if (!projection.intent && discovery.intent) projection.intent = discovery.intent
    if (!projection.eventStyle && discovery.eventStyle) projection.eventStyle = discovery.eventStyle
    if (!projection.useCase && discovery.useCase) projection.useCase = discovery.useCase
  }

  return projection
}

const EVIDENCE_WEIGHTS: Record<AppetiteEvidenceAction, number> = {
  spin_seen: 0,
  lock: 1.2,
  unlock: -0.15,
  reject: -1,
  result_open: 0.7,
  shortlist: 1.4,
  conversion: 3,
  repeat: 4,
}

export function aggregateAppetiteDemand(
  evidence: readonly AppetiteEvidence[]
): AppetiteDemandEntry[] {
  const demand = new Map<string, AppetiteDemandEntry>()

  for (const item of evidence) {
    if (!TAG_BY_ID.has(item.tagId)) continue
    const weight = EVIDENCE_WEIGHTS[item.action]
    if (typeof weight !== 'number') continue

    const current = demand.get(item.tagId) ?? {
      tagId: item.tagId,
      score: 0,
      evidenceCount: 0,
    }
    current.score += weight
    current.evidenceCount += 1
    demand.set(item.tagId, current)
  }

  return [...demand.values()].sort((a, b) => b.score - a.score || b.evidenceCount - a.evidenceCount)
}

export function describeAppetiteState(state: AppetiteState): string[] {
  return state.signals
    .filter((signal) => signal.polarity === 'want')
    .sort((a, b) => Number(Boolean(b.locked)) - Number(Boolean(a.locked)))
    .map((signal) => getAppetiteTag(signal.tagId)?.label)
    .filter((label): label is string => Boolean(label))
}


export function rankAppetiteSupply(
  state: AppetiteState,
  candidates: readonly AppetiteSupplyCandidate[]
): RankedAppetiteSupply[] {
  const hardWants = state.signals.filter(
    (signal) => signal.hardness === 'hard' && signal.polarity === 'want'
  )
  const hardAvoids = state.signals.filter(
    (signal) => signal.hardness === 'hard' && signal.polarity === 'avoid'
  )
  const softSignals = state.signals.filter((signal) => signal.hardness === 'soft')

  return candidates
    .map((candidate) => {
      const tags = new Set(candidate.tagIds.filter((tagId) => TAG_BY_ID.has(tagId)))
      const missingHardTagIds = hardWants
        .filter((signal) => !tags.has(signal.tagId))
        .map((signal) => signal.tagId)
      const conflictingHardTagIds = hardAvoids
        .filter((signal) => tags.has(signal.tagId))
        .map((signal) => signal.tagId)
      const eligible = missingHardTagIds.length === 0 && conflictingHardTagIds.length === 0
      const matchedTagIds: string[] = []
      let score = 0

      if (eligible) {
        for (const signal of softSignals) {
          const matches = tags.has(signal.tagId)
          const weight = signal.strength * signal.confidence
          if (signal.polarity === 'want' && matches) {
            score += weight
            matchedTagIds.push(signal.tagId)
          } else if (signal.polarity === 'avoid' && matches) {
            score -= weight
          }
        }

        for (const signal of hardWants) {
          if (tags.has(signal.tagId)) {
            score += 2
            matchedTagIds.push(signal.tagId)
          }
        }

        score *= Math.max(0, candidate.availabilityWeight ?? 1)
      }

      return {
        ...candidate,
        eligible,
        score,
        matchedTagIds: [...new Set(matchedTagIds)],
        missingHardTagIds,
        conflictingHardTagIds,
      }
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.score - a.score ||
        (b.availabilityWeight ?? 1) - (a.availabilityWeight ?? 1)
    )
}

export function resolveGroupAppetite(
  participants: readonly GroupAppetiteParticipant[]
): GroupAppetiteResolution {
  const aggregate = new Map<
    string,
    {
      wantScore: number
      avoidScore: number
      wantParticipants: Set<string>
      avoidParticipants: Set<string>
      hardWant?: AppetiteSignal
      hardAvoid?: AppetiteSignal
    }
  >()

  for (const participant of participants) {
    for (const signal of participant.state.signals) {
      if (!TAG_BY_ID.has(signal.tagId)) continue
      const entry = aggregate.get(signal.tagId) ?? {
        wantScore: 0,
        avoidScore: 0,
        wantParticipants: new Set<string>(),
        avoidParticipants: new Set<string>(),
      }
      const weight = signal.strength * signal.confidence

      if (signal.polarity === 'want') {
        entry.wantScore += weight
        entry.wantParticipants.add(participant.participantId)
        if (
          signal.hardness === 'hard' &&
          (!entry.hardWant || scoreSignal(signal) > scoreSignal(entry.hardWant))
        ) {
          entry.hardWant = signal
        }
      } else {
        entry.avoidScore += weight
        entry.avoidParticipants.add(participant.participantId)
        if (
          signal.hardness === 'hard' &&
          (!entry.hardAvoid || scoreSignal(signal) > scoreSignal(entry.hardAvoid))
        ) {
          entry.hardAvoid = signal
        }
      }

      aggregate.set(signal.tagId, entry)
    }
  }

  const signals: AppetiteSignal[] = []
  const sharedWants: GroupAppetitePreference[] = []
  const sharedAvoids: GroupAppetitePreference[] = []

  for (const [tagId, entry] of aggregate) {
    if (entry.hardAvoid) {
      signals.push({
        ...entry.hardAvoid,
        scope: 'session',
        source: 'context',
        locked: true,
      })
    } else if (entry.hardWant) {
      signals.push({
        ...entry.hardWant,
        scope: 'session',
        source: 'context',
        locked: true,
      })
    } else {
      const netScore = entry.wantScore - entry.avoidScore
      if (netScore !== 0) {
        signals.push({
          tagId,
          polarity: netScore > 0 ? 'want' : 'avoid',
          strength: clamp01(Math.abs(netScore) / Math.max(1, participants.length)),
          confidence: clamp01(
            Math.max(entry.wantParticipants.size, entry.avoidParticipants.size) /
              Math.max(1, participants.length)
          ),
          hardness: 'soft',
          scope: 'session',
          source: 'context',
          locked: false,
        })
      }
    }

    if (entry.wantParticipants.size > 0) {
      sharedWants.push({
        tagId,
        score: entry.wantScore,
        participantCount: entry.wantParticipants.size,
      })
    }
    if (entry.avoidParticipants.size > 0) {
      sharedAvoids.push({
        tagId,
        score: entry.avoidScore,
        participantCount: entry.avoidParticipants.size,
      })
    }
  }

  const preferenceSort = (a: GroupAppetitePreference, b: GroupAppetitePreference) =>
    b.participantCount - a.participantCount || b.score - a.score

  return {
    state: buildAppetiteState(signals),
    sharedWants: sharedWants.sort(preferenceSort),
    sharedAvoids: sharedAvoids.sort(preferenceSort),
  }
}

function combinations(values: readonly string[], size: number): string[][] {
  if (size <= 0) return [[]]
  if (values.length < size) return []

  const result: string[][] = []
  for (let index = 0; index <= values.length - size; index += 1) {
    const head = values[index]
    for (const tail of combinations(values.slice(index + 1), size - 1)) {
      result.push([head, ...tail])
    }
  }
  return result
}

export function aggregateAppetiteBundleDemand(
  evidence: readonly AppetiteEvidence[],
  options: { minSize?: number; maxSize?: number } = {}
): AppetiteBundleDemandEntry[] {
  const minSize = Math.max(2, options.minSize ?? 2)
  const maxSize = Math.max(minSize, Math.min(4, options.maxSize ?? 3))
  const decisions = new Map<
    string,
    { action: AppetiteEvidenceAction; tagIds: Set<string>; weight: number }
  >()

  for (const item of evidence) {
    if (!TAG_BY_ID.has(item.tagId)) continue
    const weight = EVIDENCE_WEIGHTS[item.action]
    if (typeof weight !== 'number' || weight === 0) continue
    const decisionKey = item.decisionId ?? item.occurredAt + ':' + item.action
    const current = decisions.get(decisionKey) ?? {
      action: item.action,
      tagIds: new Set<string>(),
      weight,
    }

    if (current.action !== item.action) continue
    current.tagIds.add(item.tagId)
    decisions.set(decisionKey, current)
  }

  const bundles = new Map<string, AppetiteBundleDemandEntry>()

  for (const decision of decisions.values()) {
    const tagIds = [...decision.tagIds].sort()
    for (let size = minSize; size <= Math.min(maxSize, tagIds.length); size += 1) {
      for (const bundle of combinations(tagIds, size)) {
        const key = bundle.join('|')
        const current = bundles.get(key) ?? {
          tagIds: bundle,
          score: 0,
          evidenceCount: 0,
        }
        current.score += decision.weight
        current.evidenceCount += 1
        bundles.set(key, current)
      }
    }
  }

  return [...bundles.values()].sort(
    (a, b) =>
      b.score - a.score ||
      b.tagIds.length - a.tagIds.length ||
      b.evidenceCount - a.evidenceCount
  )
}

export function measureAppetiteBundleMarketGaps(
  demand: readonly AppetiteBundleDemandEntry[],
  supply: readonly AppetiteSupplyObservation[]
): AppetiteBundleMarketGap[] {
  return demand
    .filter((entry) => entry.score > 0 && entry.tagIds.length >= 2)
    .map((entry) => {
      const supplyScore = supply.reduce((score, observation) => {
        const tags = new Set(observation.tagIds)
        const coversBundle = entry.tagIds.every((tagId) => tags.has(tagId))
        return coversBundle ? score + Math.max(0, observation.availabilityWeight ?? 1) : score
      }, 0)

      return {
        ...entry,
        supplyScore,
        gapScore: entry.score / (1 + supplyScore),
      }
    })
    .sort(
      (a, b) =>
        b.gapScore - a.gapScore ||
        b.tagIds.length - a.tagIds.length ||
        b.score - a.score
    )
}

export function measureAppetiteMarketGaps(
  demand: readonly AppetiteDemandEntry[],
  supply: readonly AppetiteSupplyObservation[]
): AppetiteMarketGap[] {
  const supplyScores = new Map<string, number>()

  for (const observation of supply) {
    const weight = Math.max(0, observation.availabilityWeight ?? 1)
    for (const tagId of new Set(observation.tagIds)) {
      if (!TAG_BY_ID.has(tagId)) continue
      supplyScores.set(tagId, (supplyScores.get(tagId) ?? 0) + weight)
    }
  }

  return demand
    .filter((entry) => entry.score > 0 && TAG_BY_ID.has(entry.tagId))
    .map((entry) => {
      const supplyScore = supplyScores.get(entry.tagId) ?? 0
      return {
        tagId: entry.tagId,
        demandScore: entry.score,
        supplyScore,
        gapScore: entry.score / (1 + supplyScore),
      }
    })
    .sort((a, b) => b.gapScore - a.gapScore || b.demandScore - a.demandScore)
}
