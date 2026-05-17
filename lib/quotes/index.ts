// Quotes module - public API

// Quote prefill (pure functions, no server action)
export {
  buildQuoteDraftHref,
  buildQuoteDraftPrefillSearchParams,
  readQuoteDraftPrefillFromSearchParams,
  mergeQuoteDraftPrefill,
} from './quote-prefill'
export type {
  QuoteDraftPrefill,
  QuoteDraftPrefillSource,
  QuoteDraftPrefillPricingModel,
} from './quote-prefill'
