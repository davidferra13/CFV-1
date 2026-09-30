import {
  buildAppetiteState,
  getAppetiteTag,
  inferAppetiteTagIds,
  rankAppetiteSupply,
  type AppetiteSignal,
} from '@/lib/discovery/appetite-engine'

export type AppetiteDiscoveryCard = {
  id: string
  title: string
  subtitle: string | null
  eyebrow: string
  priceLabel: string | null
  dietaryTags: string[]
  serviceModes: string[]
  relevanceScore: number
}

export function appetiteSignalsFromTagIds(tagIds: readonly string[]): AppetiteSignal[] {
  return tagIds.flatMap((tagId) => {
    const tag = getAppetiteTag(tagId)
    if (!tag) return []

    return [
      {
        tagId,
        polarity: 'want' as const,
        strength: tag.domain === 'needs' ? 1 : 0.75,
        confidence: tag.domain === 'needs' ? 1 : 0.8,
        hardness: tag.domain === 'needs' ? ('hard' as const) : ('soft' as const),
        scope: 'session' as const,
        source: 'explicit' as const,
        locked: false,
      },
    ]
  })
}

export function boostAndFilterByAppetite<T extends AppetiteDiscoveryCard>(
  cards: readonly T[],
  appetiteTagIds: readonly string[]
): T[] {
  if (appetiteTagIds.length === 0 || cards.length === 0) return [...cards]

  const state = buildAppetiteState(appetiteSignalsFromTagIds(appetiteTagIds))
  if (state.signals.length === 0) return [...cards]

  const ranked = rankAppetiteSupply(
    state,
    cards.map((card) => ({
      id: card.id,
      tagIds: inferAppetiteTagIds([
        card.title,
        card.subtitle,
        card.eyebrow,
        card.priceLabel,
        ...card.dietaryTags,
        ...card.serviceModes,
      ]),
      availabilityWeight: 1,
    }))
  )
  const resultById = new Map(ranked.map((candidate) => [candidate.id, candidate]))

  return cards.flatMap((card) => {
    const result = resultById.get(card.id)
    if (!result?.eligible) return []

    return [
      {
        ...card,
        relevanceScore: card.relevanceScore + result.score * 18,
      },
    ]
  })
}
