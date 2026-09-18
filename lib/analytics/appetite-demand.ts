import {
  getAppetiteTag,
  type AppetiteDomain,
  type AppetiteMarketSnapshot,
} from '@/lib/discovery/appetite-engine'

export type AppetiteDemandConfidence = 'early' | 'growing' | 'strong'

export type AppetiteDemandSignal = {
  tagId: string
  label: string
  domain: AppetiteDomain
  confidence: AppetiteDemandConfidence
  evidenceCount: number
  href: string
}

export type AppetiteDemandBundle = {
  tagIds: string[]
  label: string
  confidence: AppetiteDemandConfidence
  evidenceCount: number
  href: string
}

export type AppetiteDemandPanelModel = {
  hasDemand: boolean
  topSignals: AppetiteDemandSignal[]
  topBundles: AppetiteDemandBundle[]
}

function confidenceForEvidence(count: number): AppetiteDemandConfidence {
  if (count >= 8) return 'strong'
  if (count >= 3) return 'growing'
  return 'early'
}

function appetiteHref(tagIds: readonly string[]): string {
  const params = new URLSearchParams()
  params.set('appetite', tagIds.join(','))
  return `/eat?${params.toString()}`
}

export function buildAppetiteDemandPanelModel(
  snapshot: AppetiteMarketSnapshot,
  options: { signalLimit?: number; bundleLimit?: number } = {}
): AppetiteDemandPanelModel {
  const signalLimit = Math.max(1, options.signalLimit ?? 4)
  const bundleLimit = Math.max(1, options.bundleLimit ?? 3)

  const topSignals = snapshot.demand
    .filter((entry) => entry.score > 0)
    .map((entry) => ({ entry, tag: getAppetiteTag(entry.tagId) }))
    .filter(
      (
        item
      ): item is {
        entry: (typeof snapshot.demand)[number]
        tag: NonNullable<ReturnType<typeof getAppetiteTag>>
      } => Boolean(item.tag)
    )
    .map(({ entry, tag }) => ({
      tagId: entry.tagId,
      label: tag.label,
      domain: tag.domain,
      confidence: confidenceForEvidence(entry.evidenceCount),
      evidenceCount: entry.evidenceCount,
      href: appetiteHref([entry.tagId]),
    }))
    .slice(0, signalLimit)

  const topBundles = snapshot.bundleDemand
    .filter((entry) => entry.score > 0 && entry.tagIds.length >= 2)
    .flatMap((entry) => {
      const tags = entry.tagIds
        .map((tagId) => getAppetiteTag(tagId))
        .filter((tag): tag is NonNullable<ReturnType<typeof getAppetiteTag>> => Boolean(tag))
      if (tags.length !== entry.tagIds.length) return []

      return [
        {
          tagIds: [...entry.tagIds],
          label: tags.map((tag) => tag.label).join(' + '),
          confidence: confidenceForEvidence(entry.evidenceCount),
          evidenceCount: entry.evidenceCount,
          href: appetiteHref(entry.tagIds),
        } satisfies AppetiteDemandBundle,
      ]
    })
    .slice(0, bundleLimit)

  return {
    hasDemand: topSignals.length > 0 || topBundles.length > 0,
    topSignals,
    topBundles,
  }
}
