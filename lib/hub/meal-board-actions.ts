'use server'

import {
  getMealBoard as getMealBoardAction,
  upsertMealEntry as upsertMealEntryAction,
  deleteMealEntry as deleteMealEntryAction,
  updateMealStatus as updateMealStatusAction,
  bulkUpsertMealEntries as bulkUpsertMealEntriesAction,
  cloneWeekMeals as cloneWeekMealsAction,
} from './meal-board/board-crud'
import {
  saveWeekAsTemplate as saveWeekAsTemplateAction,
  getTemplates as getTemplatesAction,
  loadTemplate as loadTemplateAction,
  deleteTemplate as deleteTemplateAction,
} from './meal-board/templates'
import {
  postScheduleChange as postScheduleChangeAction,
  getScheduleChanges as getScheduleChangesAction,
  acknowledgeScheduleChange as acknowledgeScheduleChangeAction,
  resolveScheduleChange as resolveScheduleChangeAction,
} from './meal-board/schedule-changes'
import {
  createRecurringMeal as createRecurringMealAction,
  getRecurringMeals as getRecurringMealsAction,
  deleteRecurringMeal as deleteRecurringMealAction,
  applyRecurringMeals as applyRecurringMealsAction,
} from './meal-board/recurring'
import {
  getFeedbackInsights as getFeedbackInsightsAction,
  getMealHistory as getMealHistoryAction,
} from './meal-board/insights'
import {
  updateGroupDefaultHeadCount as updateGroupDefaultHeadCountAction,
  getGroupDefaultHeadCount as getGroupDefaultHeadCountAction,
  getDefaultMealTimes as getDefaultMealTimesAction,
  updateDefaultMealTimes as updateDefaultMealTimesAction,
} from './meal-board/defaults'
import {
  getBatchCommentCounts as getBatchCommentCountsAction,
  getMealComments as getMealCommentsAction,
  addMealComment as addMealCommentAction,
} from './meal-board/comments'
import {
  getMealRequests as getMealRequestsAction,
  createMealRequest as createMealRequestAction,
  resolveMealRequest as resolveMealRequestAction,
} from './meal-board/requests'

export type {
  MealTemplate,
  ScheduleChange,
  RecurringMealInput,
  FeedbackInsight,
  MealHistoryEntry,
} from './meal-board/contracts'

export async function getMealBoard(...args: Parameters<typeof getMealBoardAction>) {
  return getMealBoardAction(...args)
}

export async function upsertMealEntry(...args: Parameters<typeof upsertMealEntryAction>) {
  return upsertMealEntryAction(...args)
}

export async function deleteMealEntry(...args: Parameters<typeof deleteMealEntryAction>) {
  return deleteMealEntryAction(...args)
}

export async function updateMealStatus(...args: Parameters<typeof updateMealStatusAction>) {
  return updateMealStatusAction(...args)
}

export async function bulkUpsertMealEntries(
  ...args: Parameters<typeof bulkUpsertMealEntriesAction>
) {
  return bulkUpsertMealEntriesAction(...args)
}

export async function cloneWeekMeals(...args: Parameters<typeof cloneWeekMealsAction>) {
  return cloneWeekMealsAction(...args)
}

export async function saveWeekAsTemplate(...args: Parameters<typeof saveWeekAsTemplateAction>) {
  return saveWeekAsTemplateAction(...args)
}

export async function getTemplates(...args: Parameters<typeof getTemplatesAction>) {
  return getTemplatesAction(...args)
}

export async function loadTemplate(...args: Parameters<typeof loadTemplateAction>) {
  return loadTemplateAction(...args)
}

export async function deleteTemplate(...args: Parameters<typeof deleteTemplateAction>) {
  return deleteTemplateAction(...args)
}

export async function postScheduleChange(...args: Parameters<typeof postScheduleChangeAction>) {
  return postScheduleChangeAction(...args)
}

export async function getScheduleChanges(...args: Parameters<typeof getScheduleChangesAction>) {
  return getScheduleChangesAction(...args)
}

export async function acknowledgeScheduleChange(
  ...args: Parameters<typeof acknowledgeScheduleChangeAction>
) {
  return acknowledgeScheduleChangeAction(...args)
}

export async function resolveScheduleChange(
  ...args: Parameters<typeof resolveScheduleChangeAction>
) {
  return resolveScheduleChangeAction(...args)
}

export async function createRecurringMeal(...args: Parameters<typeof createRecurringMealAction>) {
  return createRecurringMealAction(...args)
}

export async function getRecurringMeals(...args: Parameters<typeof getRecurringMealsAction>) {
  return getRecurringMealsAction(...args)
}

export async function deleteRecurringMeal(...args: Parameters<typeof deleteRecurringMealAction>) {
  return deleteRecurringMealAction(...args)
}

export async function applyRecurringMeals(...args: Parameters<typeof applyRecurringMealsAction>) {
  return applyRecurringMealsAction(...args)
}

export async function getFeedbackInsights(...args: Parameters<typeof getFeedbackInsightsAction>) {
  return getFeedbackInsightsAction(...args)
}

export async function getMealHistory(...args: Parameters<typeof getMealHistoryAction>) {
  return getMealHistoryAction(...args)
}

export async function updateGroupDefaultHeadCount(
  ...args: Parameters<typeof updateGroupDefaultHeadCountAction>
) {
  return updateGroupDefaultHeadCountAction(...args)
}

export async function getGroupDefaultHeadCount(
  ...args: Parameters<typeof getGroupDefaultHeadCountAction>
) {
  return getGroupDefaultHeadCountAction(...args)
}

export async function getDefaultMealTimes(...args: Parameters<typeof getDefaultMealTimesAction>) {
  return getDefaultMealTimesAction(...args)
}

export async function updateDefaultMealTimes(
  ...args: Parameters<typeof updateDefaultMealTimesAction>
) {
  return updateDefaultMealTimesAction(...args)
}

export async function getBatchCommentCounts(
  ...args: Parameters<typeof getBatchCommentCountsAction>
) {
  return getBatchCommentCountsAction(...args)
}

export async function getMealComments(...args: Parameters<typeof getMealCommentsAction>) {
  return getMealCommentsAction(...args)
}

export async function addMealComment(...args: Parameters<typeof addMealCommentAction>) {
  return addMealCommentAction(...args)
}

export async function getMealRequests(...args: Parameters<typeof getMealRequestsAction>) {
  return getMealRequestsAction(...args)
}

export async function createMealRequest(...args: Parameters<typeof createMealRequestAction>) {
  return createMealRequestAction(...args)
}

export async function resolveMealRequest(...args: Parameters<typeof resolveMealRequestAction>) {
  return resolveMealRequestAction(...args)
}
