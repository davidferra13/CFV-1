// Side-effect observability
export type { SideEffectCategory, SideEffectEntry, SideEffectSummary } from './side-effect-types'

export { trackSideEffect, trackEmail, trackStateChange } from './side-effect-tracker'

// Re-exports from existing observability modules
export { createLogger, log } from './logger'
export { getRequestId } from './request-id'
