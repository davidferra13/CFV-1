// Utils module - public API

export { cn } from './cn'

// Note: currency.ts has simpler versions of formatCurrency/parseCurrencyToCents/formatCentsToDisplay
// but format.ts has the locale-aware versions. Barrel exports format.ts versions to avoid conflict.
// Import from './currency' directly if you need the simpler signatures.

export {
  formatDate,
  formatDateLong,
  formatDateNumeric,
  formatTime,
  formatDateTime,
  formatDateTimeFull,
  formatWeekday,
  formatRelativeTime,
  formatCurrencyCtx,
  formatDateCtx,
  formatDateTimeCtx,
  nowFormatted,
  todayLocalDateString,
  dateToMonthString,
  dateToDateString,
  todayWeekday,
  daysUntilDate,
} from './format'

export { normalizeName, namesMatch, normalizePhone } from './name-matching'

export { safeFetch, safeFetchAll, safeFetchPartial } from './safe-fetch'

export { displayQuantity, displayTemp } from './units'
export type { MeasurementSystem } from './units'
