import type { PopUpDropType, PopUpForecastInput, PopUpForecastResult } from './types'

const DEFAULT_UNITS = 24

export function getDefaultPopUpBufferPercent(dropType: PopUpDropType): number {
  if (dropType === 'weekend_drop') return 15
  if (dropType === 'private_dessert_event') return 5
  return 10
}

function median(values: number[]): number | null {
  const sorted = values
    .filter((value) => Number.isFinite(value) && value >= 0)
    .map((value) => Math.round(value))
    .sort((a, b) => a - b)

  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.max(0, (end.getTime() - start.getTime()) / msPerDay)
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function unitsPerDay(input: PopUpForecastInput, now: Date): number {
  const currentSold = Math.max(0, input.currentSoldUnits ?? 0)
  if (currentSold === 0) return 0
  const openedAt = parseDate(input.preorderOpensAt)
  if (!openedAt || openedAt > now) return currentSold
  return currentSold / Math.max(1, daysBetween(openedAt, now))
}

export function forecastPopUpMenuItem(input: PopUpForecastInput): PopUpForecastResult {
  const now = input.now ?? new Date()
  const currentSold = Math.max(0, input.currentSoldUnits ?? 0)
  const historicalMedian = median(input.historicalSoldUnits ?? [])
  let baseUnits = input.item.plannedUnits > 0 ? input.item.plannedUnits : DEFAULT_UNITS
  let baseReason = `planned quantity of ${baseUnits} units`

  if (historicalMedian !== null) {
    baseUnits = historicalMedian
    baseReason = `median historical demand of ${historicalMedian} units`
  } else if ((input.dishTimesServed ?? 0) > 0) {
    baseUnits =
      input.eventGuestCount && input.eventGuestCount > 0 ? input.eventGuestCount : DEFAULT_UNITS
    baseReason =
      input.eventGuestCount && input.eventGuestCount > 0
        ? `served before with event guest count fallback of ${baseUnits} units`
        : `served before with conservative fallback of ${DEFAULT_UNITS} units`
  } else if (!(input.item.plannedUnits > 0)) {
    baseReason = `new item with conservative fallback of ${DEFAULT_UNITS} units`
  }

  const closesAt = parseDate(input.preorderClosesAt)
  const remainingDays = closesAt ? daysBetween(now, closesAt) : 0
  const velocityUnits = currentSold + Math.max(0, remainingDays * unitsPerDay(input, now))
  const demandUnits = Math.max(baseUnits, velocityUnits)
  const bufferPercent =
    input.item.bufferPercent !== null && input.item.bufferPercent !== undefined
      ? input.item.bufferPercent
      : getDefaultPopUpBufferPercent(input.dropType)
  const suggestedUnits = Math.max(currentSold, Math.ceil(demandUnits * (1 + bufferPercent / 100)))

  const velocityReason =
    velocityUnits > currentSold
      ? `current preorder velocity projects ${Math.ceil(velocityUnits)} units before close`
      : `${currentSold} units currently sold`

  return {
    suggestedUnits,
    reason: `${baseReason}; ${velocityReason}; ${bufferPercent}% ${input.dropType.replace(
      /_/g,
      ' '
    )} buffer applied.`,
  }
}

export function forecastPopUpMenuItems(
  items: PopUpForecastInput[]
): Map<string, PopUpForecastResult> {
  return new Map(
    items.map((input) => {
      const key = input.item.ticketTypeId ?? input.item.dishIndexId ?? input.item.name
      return [key, forecastPopUpMenuItem(input)]
    })
  )
}
