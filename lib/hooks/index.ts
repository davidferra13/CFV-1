// Shared React hooks - all client-side
export { useDebounce, useDebouncedCallback } from './use-debounce'
export { useThrottle, useThrottleWithCooldown } from './use-throttle'

// Consolidated from root hooks/ directory
export { useCollapsedWidgets } from './use-collapsed-widgets'
export { useDeferredAction } from './use-deferred-action'
export { useDeferredGoogleMapsLoader } from './use-deferred-google-maps-loader'
export { useFieldValidation } from './use-field-validation'
export {
  useGoogleMapsAuthFailure,
  useGoogleMapsRuntimeFailure,
} from './use-google-maps-auth-failure'
export { useMediaQuery } from './use-media-query'
export { useQueueSnooze, SNOOZE_OPTIONS } from './use-queue-snooze'
export type { SnoozeDuration } from './use-queue-snooze'
export { useRecentPages } from './use-recent-pages'
export type { RecentPage } from './use-recent-pages'
