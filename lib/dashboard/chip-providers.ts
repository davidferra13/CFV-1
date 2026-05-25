import type { AttentionChip } from '@/lib/dashboard/section-types'

const MIN_CHIP_SCORE = 50

export function mergeChips(...batches: AttentionChip[][]): AttentionChip[] {
  const seen = new Set<string>()
  const result: AttentionChip[] = []
  for (const batch of batches) {
    for (const chip of batch) {
      if (!seen.has(chip.id)) {
        seen.add(chip.id)
        result.push(chip)
      }
    }
  }
  return result
}

export function filterActiveChips(chips: AttentionChip[]): AttentionChip[] {
  return chips.filter((c) => c.urgencyScore >= MIN_CHIP_SCORE)
}
