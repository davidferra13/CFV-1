// Guest Count Range Mapping
// Maps the midpoint values from the booking form back to their range labels.
// Preserves both the midpoint (used for chef matching) and the human-readable range.

export type GuestCountRange = {
  label: string
  min: number
  max: number
  midpoint: number
}

const GUEST_RANGES: GuestCountRange[] = [
  { label: '1-2 (intimate)', min: 1, max: 2, midpoint: 1 },
  { label: '3-6 (small gathering)', min: 3, max: 6, midpoint: 4 },
  { label: '7-12 (dinner party)', min: 7, max: 12, midpoint: 8 },
  { label: '13-25 (large party)', min: 13, max: 25, midpoint: 18 },
  { label: '26-50 (event)', min: 26, max: 50, midpoint: 35 },
  { label: '50+ (large event)', min: 50, max: 200, midpoint: 75 },
]

/**
 * Look up the guest count range from the form's midpoint value.
 * Returns null if the midpoint doesn't match any known range.
 */
export function resolveGuestCountRange(midpoint: number): GuestCountRange | null {
  return GUEST_RANGES.find((r) => r.midpoint === midpoint) ?? null
}

/**
 * Format guest count for chef display: "18 guests (from 13-25 range)"
 */
export function formatGuestCountForChef(midpoint: number): string {
  const range = resolveGuestCountRange(midpoint)
  if (!range) return `${midpoint} guests`
  return `${midpoint} guests (from ${range.label.split(' (')[0]} range)`
}
