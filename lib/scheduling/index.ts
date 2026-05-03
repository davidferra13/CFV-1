// Scheduling module - public API

// actions.ts ('use server')
export {
  getEventTimeline,
  getEventDOPSchedule,
  getEventDOPProgress,
  getAllPrepPrompts,
  getTodaysSchedule,
  getTodaysScheduleEnriched,
  getWeekSchedule,
  rescheduleEvent,
  getCalendarEvents,
  updateEventTravelTime,
} from './actions'
export type { CalendarEvent } from './actions'

// availability-share-actions.ts ('use server')
export {
  generateShareToken,
  revokeShareToken,
  getShareTokens,
  getSharedAvailability,
} from './availability-share-actions'
export type { ShareToken, AvailabilityDay } from './availability-share-actions'

// calendar-sync-actions.ts ('use server')
export {
  syncEventToGoogle,
  deleteEventFromGoogle,
  getCalendarConnection as getCalendarConnectionAction,
  initiateGoogleCalendarConnect as initiateGoogleCalendarConnectAction,
  disconnectGoogleCalendar as disconnectGoogleCalendarAction,
} from './calendar-sync-actions'

// calendar-sync.ts
export {
  getGoogleCalendarTruthForRange,
  getCalendarConnectionForChef,
  getCalendarConnection,
  initiateGoogleCalendarConnect,
  disconnectGoogleCalendar,
  checkCalendarAvailability,
  syncEventToGoogleCalendar,
  deleteEventFromGoogleCalendar,
} from './calendar-sync'
export type { CalendarConnection } from './calendar-sync'

// capacity-actions.ts ('use server')
export {
  getCapacitySettings,
  updateCapacitySettings,
  updateOffHoursSettings,
  checkCapacityForDate,
} from './capacity-actions'
export type { CapacitySettings, OffHoursSettings, CapacityCheckResult } from './capacity-actions'

// capacity-check.ts
export { checkCapacity } from './capacity-check'
export type { CapacityWarning } from './capacity-check'

// capacity-planning-actions.ts ('use server')
export {
  getCapacityPlanningSettings,
  updateCapacityPlanningSettings,
  getDateAvailability,
  getWeekAvailability,
  getMonthCapacity,
  checkBookingConflict,
  getCapacityUtilization,
} from './capacity-planning-actions'
export type {
  CapacityPlanningSettings,
  DayAvailability,
  BookingConflictResult,
  MonthDayCapacity,
  CapacityUtilization,
} from './capacity-planning-actions'
// Note: TimeBlock type from capacity-planning-actions conflicts with time-blocks.ts

// capacity.ts
export {
  computeDayCapacity,
  CAPACITY_COLORS,
  CAPACITY_BG,
  findGroceryWindows,
  checkRestDays,
} from './capacity'
export type { CapacityLabel, DayCapacity, GroceryWindow, RestDayWarning } from './capacity'

// dop-completions.ts ('use server')
export { getDOPManualCompletions, toggleDOPTaskCompletion } from './dop-completions'

// dop.ts
export { getDOPSchedule, getDOPProgress } from './dop'

// generate-ics.ts
export { generateICS, escapeICS } from './generate-ics'

// grocery-route-actions.ts ('use server')
export { getGroceryRoute, optimizeStoreOrder } from './grocery-route-actions'
export type {
  GroceryItem,
  StoreGroup,
  GroceryRoute,
  StoreVisitOrder,
  OptimizedRoute,
} from './grocery-route-actions'

// multi-event-days.ts ('use server')
export { getMultiEventDays } from './multi-event-days'
export type { MultiEventDay } from './multi-event-days'

// overlap-detection.ts
export { rangesOverlap, detectOverlaps } from './overlap-detection'
export type { TimeRange, OverlapPair } from './overlap-detection'

// prep-block-actions.ts
export {
  getEventPrepBlocks,
  getWeekPrepBlocks,
  getYearSummary,
  getSchedulingGaps,
  createPrepBlock,
  getPrepBlockConflicts,
  bulkCreatePrepBlocks,
  updatePrepBlock,
  deletePrepBlock,
  completePrepBlock,
  uncompletePrepBlock,
  autoPlacePrepBlocks,
  autoSuggestEventBlocks,
} from './prep-block-actions'

// prep-block-engine.ts
export { getRequiredBlockTypes, suggestPrepBlocks, detectGaps } from './prep-block-engine'

// prep-prompts.ts
export { getActivePrompts } from './prep-prompts'

// protected-time-actions.ts ('use server')
export {
  createProtectedTime,
  updateProtectedTime,
  deleteProtectedTime,
  getProtectedTime,
  listProtectedBlocks,
} from './protected-time-actions'
export type {
  CreateProtectedTimeInput,
  UpdateProtectedTimeInput,
  ProtectedTimeBlock,
  ProtectedBlockSummary,
} from './protected-time-actions'

// recurring-actions.ts ('use server')
export {
  createRecurringSchedule,
  updateRecurringSchedule,
  deleteRecurringSchedule,
  getRecurringSchedules,
  generateUpcomingEvents,
  getUpcomingRecurringEvents,
} from './recurring-actions'
export type {
  Frequency,
  RecurringSchedule,
  CreateRecurringScheduleData,
  UpdateRecurringScheduleData,
} from './recurring-actions'

// schedule-block-actions.ts ('use server')
export {
  getScheduleBlocks,
  getScheduleBlocksForRange,
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
} from './schedule-block-actions'
export type {
  ScheduleBlockType,
  ScheduleBlock,
  CreateScheduleBlockInput,
  UpdateScheduleBlockInput,
} from './schedule-block-actions'

// seasonal-availability-actions.ts ('use server')
export {
  getSeasonalPeriods,
  getActiveSeasonalPeriod,
  getAvailabilityForDate,
  getYearOverview,
  checkBookingConflict as checkSeasonalBookingConflict,
  createSeasonalPeriod,
  updateSeasonalPeriod,
  deleteSeasonalPeriod,
} from './seasonal-availability-actions'
export type { SeasonalPeriod, SeasonalPeriodInput } from './seasonal-availability-actions'

// task-digest.ts ('use server')
export { getDOPTaskDigest } from './task-digest'
export type { DigestTask, DOPTaskDigest } from './task-digest'

// time-blocks.ts
export {
  listTimeBlocks,
  createTimeBlock,
  deleteTimeBlock,
  getSchedulingAvailability,
} from './time-blocks'
export type { TimeBlock } from './time-blocks'

// timeline.ts
export { generateTimeline } from './timeline'

// types.ts
export {
  DASHBOARD_WIDGET_IDS,
  WIDGET_CATEGORY_LABELS,
  WIDGET_CATEGORY_ORDER,
  DASHBOARD_WIDGET_META,
  WIDGET_CATEGORY_STYLES,
  WIDGET_ICONS,
  getWidgetIcon,
  getWidgetCategoryStyle,
  widgetGridClass,
  groupWidgetsByCategory,
  DEFAULT_DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_LABELS,
  MENU_ENGINE_FEATURE_KEYS,
  DEFAULT_MENU_ENGINE_FEATURES,
  MENU_ENGINE_FEATURE_LABELS,
  DEFAULT_PREFERENCES,
} from './types'
export type {
  DefaultStore,
  DashboardWidgetId,
  DashboardWidgetPreference,
  WidgetCategory,
  WidgetSize,
  WidgetMeta,
  CategoryStyle,
  SpecialtyStore,
  MenuEngineFeatureKey,
  MenuEngineFeatures,
  ChefPreferences,
  RevenueGoalCustom,
  EventPhase,
  EnrichedTodaySchedule,
} from './types'

// waitlist-actions.ts ('use server')
export {
  getWaitlistEntries,
  addToWaitlist,
  updateWaitlistEntry,
  removeFromWaitlist,
  notifyWaitlistOpening,
  getWaitlistStats,
  convertWaitlistToEvent,
} from './waitlist-actions'
export type {
  WaitlistStatus,
  WaitlistEntry,
  AddToWaitlistInput,
  UpdateWaitlistInput,
  WaitlistStats,
} from './waitlist-actions'
