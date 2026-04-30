import type { CulinaryRadarNormalizedItem } from './types'

export type CulinaryRadarContextEntityType = 'ingredient' | 'event' | 'vendor' | 'profile'

export type CulinaryRadarContextEntity = {
  type: CulinaryRadarContextEntityType
  id: string
  label: string
  terms: string[]
  href?: string
}

export type CulinaryRadarContextMatch = {
  relevanceScore: number
  matchReasons: string[]
  matchedEntities: Array<{
    type: CulinaryRadarContextEntityType
    id: string
    label: string
    href?: string
  }>
  recommendedActions: string[]
}

export function matchRadarItemToChefContext(
  item: CulinaryRadarNormalizedItem,
  entities: CulinaryRadarContextEntity[]
): CulinaryRadarContextMatch {
  const text = searchableItemText(item)
  const matchedEntities: CulinaryRadarContextMatch['matchedEntities'] = []
  const matchReasons: string[] = []
  let entityScore = 0

  for (const entity of entities) {
    const matchedTerms = entity.terms
      .map(normalizeTerm)
      .filter((term) => term && text.includes(term))
    if (matchedTerms.length === 0) continue

    matchedEntities.push({
      type: entity.type,
      id: entity.id,
      label: entity.label,
      href: entity.href,
    })
    matchReasons.push(
      `Matched ${entity.type} "${entity.label}" through ${formatTerms(matchedTerms.slice(0, 3))}.`
    )
    entityScore += entity.type === 'event' ? 20 : 15
  }

  const relevanceScore = clampScore(item.relevanceScore + entityScore)

  return {
    relevanceScore,
    matchReasons,
    matchedEntities,
    recommendedActions: buildRecommendedActions(item, matchedEntities),
  }
}

function searchableItemText(item: CulinaryRadarNormalizedItem): string {
  return normalizeTerm(
    [
      item.title,
      item.summary,
      item.status ?? '',
      item.tags.join(' '),
      item.locations.join(' '),
      item.relevanceSignals.join(' '),
    ].join(' ')
  )
}

function buildRecommendedActions(
  item: CulinaryRadarNormalizedItem,
  entities: CulinaryRadarContextMatch['matchedEntities']
): string[] {
  if (item.sourceAuthority === 'regulatory') {
    const actions = ['Check labels, lot numbers, and vendor invoices.']
    if (entities.some((entity) => entity.type === 'event')) {
      actions.push('Review affected event menus and prep lists.')
    }
    if (entities.some((entity) => entity.type === 'vendor')) {
      actions.push('Confirm status with the matched vendor.')
    }
    return actions
  }

  if (item.sourceAuthority === 'relief') {
    return ['Review opportunity requirements.', 'Save the deadline as a task if relevant.']
  }

  if (item.category === 'local') {
    return [
      'Open the official source and search by ZIP code or event city.',
      'Confirm market hours, accepted payment, and vendor fit before sourcing.',
    ]
  }

  return ['Read the source and decide whether it belongs in your operating notes.']
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function formatTerms(terms: string[]): string {
  if (terms.length === 1) return `"${terms[0]}"`
  return terms.map((term) => `"${term}"`).join(', ')
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
