export type TimeRange = {
  id?: string
  source?: string
  startAt: string
  endAt: string
}

export type OverlapPair = {
  first: TimeRange
  second: TimeRange
}

function toTimestamp(iso: string): number {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ISO date: ${iso}`)
  }
  return parsed
}

export function rangesOverlap(first: TimeRange, second: TimeRange): boolean {
  const firstStart = toTimestamp(first.startAt)
  const firstEnd = toTimestamp(first.endAt)
  const secondStart = toTimestamp(second.startAt)
  const secondEnd = toTimestamp(second.endAt)
  return firstStart < secondEnd && secondStart < firstEnd
}

export function detectOverlaps(ranges: TimeRange[]): OverlapPair[] {
  const sorted = [...ranges].sort((a, b) => toTimestamp(a.startAt) - toTimestamp(b.startAt))
  const overlaps: OverlapPair[] = []

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const left = sorted[i]
      const right = sorted[j]
      if (toTimestamp(right.startAt) >= toTimestamp(left.endAt)) {
        break
      }
      if (rangesOverlap(left, right)) {
        overlaps.push({ first: left, second: right })
      }
    }
  }

  return overlaps
}
