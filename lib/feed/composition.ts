import type { ComposedFeedEntry, FeedSourceAdapter } from './source-registry'

export interface CompositionOptions {
  maxItems?: number // default 25
  dedupeWindow?: number // ms, default 3600000 (1 hour)
  affinityMap?: Map<string, number> // source -> affinity 0-100
}

export function composeFeed(
  sources: Array<{ adapter: FeedSourceAdapter; items: unknown[] }>,
  options?: CompositionOptions
): ComposedFeedEntry[] {
  const maxItems = options?.maxItems ?? 25
  const dedupeWindow = options?.dedupeWindow ?? 3_600_000
  const affinityMap = options?.affinityMap

  // 1. Adapt all sources, tagging weight for later
  const weighted: Array<{ entry: ComposedFeedEntry; weight: number }> = []
  for (const { adapter, items } of sources) {
    const entries = adapter.adapt(items)
    for (const entry of entries) {
      weighted.push({ entry, weight: adapter.weight })
    }
  }

  // 2. Deduplicate: same href within dedupeWindow keeps highest score
  const seen = new Map<string, { score: number; timestamp: number }>()
  const deduped: typeof weighted = []
  for (const w of weighted) {
    const href = w.entry.href
    if (!href) {
      deduped.push(w)
      continue
    }
    const prev = seen.get(href)
    if (prev && Math.abs(w.entry.timestamp - prev.timestamp) < dedupeWindow) {
      if (w.entry.score > prev.score) {
        const idx = deduped.findIndex(
          (d) => d.entry.href === href && d.entry.timestamp === prev.timestamp
        )
        if (idx !== -1) deduped.splice(idx, 1)
        seen.set(href, { score: w.entry.score, timestamp: w.entry.timestamp })
        deduped.push(w)
      }
      continue
    }
    seen.set(href, { score: w.entry.score, timestamp: w.entry.timestamp })
    deduped.push(w)
  }

  // 3. Apply affinity + weight, clamp score
  for (const w of deduped) {
    let s = w.entry.score
    if (affinityMap) {
      const aff = affinityMap.get(w.entry.source)
      if (aff !== undefined) {
        s *= aff / 50
      }
    }
    s *= w.weight
    w.entry.score = Math.max(0, Math.min(100, s))
  }

  // 4. Sort descending by score, slice
  deduped.sort((a, b) => b.entry.score - a.entry.score)
  return deduped.slice(0, maxItems).map((w) => w.entry)
}
