// CANONICAL PREP SYSTEM
//
// This module (lib/prep-timeline/) is the single source of truth for
// prep timeline computation, week pressure analysis, and iCal export.
//
// Other prep-related modules and their relationship to this one:
//   - lib/prep/actions.ts              -> Legacy. Thin wrapper, delegates here
//   - lib/events/prep-timeline.ts      -> Event-scoped view into this data
//   - lib/events/prep-timeline-actions.ts -> Event-scoped mutations
//   - lib/intelligence/prep-consolidation.ts -> Cross-event batching layer
//   - lib/ai/prep-timeline.ts          -> AI suggestions feeding this
//   - lib/scheduling/prep-block-actions.ts -> Calendar block integration
//
// When adding prep logic: put computation here, not in the satellites.

export { computePrepTimeline, formatPrepTime, formatHoursAsReadable } from './compute-timeline'
export { getWeekPrepPressure } from './week-pressure-actions'
export { generatePrepTimelineICal } from './ical-export'
export {
  getEventPrepTimeline,
  updateRecipePeakWindow,
  bulkSetPeakWindows,
  togglePrepCompletion,
  getPrepCompletions,
} from './actions'
