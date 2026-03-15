export const TOOLTIP_CHARACTER_LIMIT = 88

function normalizeComparisonText(value: string): string {
  return normalizeTooltipText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function normalizeTooltipText(value?: string | null): string {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}

export function clampTooltipText(
  value?: string | null,
  maxLength = TOOLTIP_CHARACTER_LIMIT
): string | null {
  const normalized = normalizeTooltipText(value)
  const suffix = '...'

  if (!normalized) {
    return null
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  if (maxLength <= suffix.length) {
    return normalized.slice(0, maxLength)
  }

  const softLimit = Math.max(1, maxLength - suffix.length)
  const truncated = normalized.slice(0, softLimit).trimEnd()
  const lastWordBreak = truncated.lastIndexOf(' ')
  const wordBoundaryFloor = Math.max(0, softLimit - 16)

  if (lastWordBreak > wordBoundaryFloor) {
    return `${truncated.slice(0, lastWordBreak)}${suffix}`
  }

  return `${truncated}${suffix}`
}

export function isTooltipLabelRedundant(
  label?: string | null,
  visibleText?: string | null
): boolean {
  const normalizedLabel = normalizeComparisonText(label ?? '')
  const normalizedVisibleText = normalizeComparisonText(visibleText ?? '')

  if (!normalizedLabel || !normalizedVisibleText) {
    return false
  }

  return normalizedLabel === normalizedVisibleText
}
