'use server'

import {
  addTrustedChef as addTrustedChefAction,
  getTrustedCircle as getTrustedCircleAction,
  removeTrustedChef as removeTrustedChefAction,
} from './collab/trusted-circle'
import { getCollabRecipientSuggestions as getCollabRecipientSuggestionsAction } from './collab/recipient-suggestions'
import {
  deleteCollabAvailabilitySignal as deleteCollabAvailabilitySignalAction,
  getCollabAvailabilitySignals as getCollabAvailabilitySignalsAction,
  upsertCollabAvailabilitySignal as upsertCollabAvailabilitySignalAction,
} from './collab/availability'
import {
  getCollabMetrics as getCollabMetricsAction,
  getCollabUnreadCount as getCollabUnreadCountAction,
} from './collab/metrics'
import { getCollabHandoffTimeline as getCollabHandoffTimelineAction } from './collab/timeline'
import {
  cancelCollabHandoff as cancelCollabHandoffAction,
  createCollabHandoff as createCollabHandoffAction,
  getCollabInbox as getCollabInboxAction,
  markCollabHandoffViewed as markCollabHandoffViewedAction,
  recordCollabHandoffConversion as recordCollabHandoffConversionAction,
  respondToCollabHandoff as respondToCollabHandoffAction,
} from './collab/handoffs'
import {
  getHandoffDataFromInquiry as getHandoffDataFromInquiryAction,
  getHandoffForInquiry as getHandoffForInquiryAction,
} from './collab/inquiry'

export async function getTrustedCircle(...args: Parameters<typeof getTrustedCircleAction>) {
  return getTrustedCircleAction(...args)
}

export async function addTrustedChef(...args: Parameters<typeof addTrustedChefAction>) {
  return addTrustedChefAction(...args)
}

export async function getCollabRecipientSuggestions(
  ...args: Parameters<typeof getCollabRecipientSuggestionsAction>
) {
  return getCollabRecipientSuggestionsAction(...args)
}

export async function getCollabUnreadCount(...args: Parameters<typeof getCollabUnreadCountAction>) {
  return getCollabUnreadCountAction(...args)
}

export async function getCollabMetrics(...args: Parameters<typeof getCollabMetricsAction>) {
  return getCollabMetricsAction(...args)
}

export async function getCollabHandoffTimeline(
  ...args: Parameters<typeof getCollabHandoffTimelineAction>
) {
  return getCollabHandoffTimelineAction(...args)
}

export async function removeTrustedChef(...args: Parameters<typeof removeTrustedChefAction>) {
  return removeTrustedChefAction(...args)
}

export async function getCollabAvailabilitySignals(
  ...args: Parameters<typeof getCollabAvailabilitySignalsAction>
) {
  return getCollabAvailabilitySignalsAction(...args)
}

export async function upsertCollabAvailabilitySignal(
  ...args: Parameters<typeof upsertCollabAvailabilitySignalAction>
) {
  return upsertCollabAvailabilitySignalAction(...args)
}

export async function deleteCollabAvailabilitySignal(
  ...args: Parameters<typeof deleteCollabAvailabilitySignalAction>
) {
  return deleteCollabAvailabilitySignalAction(...args)
}

export async function createCollabHandoff(...args: Parameters<typeof createCollabHandoffAction>) {
  return createCollabHandoffAction(...args)
}

export async function getCollabInbox(...args: Parameters<typeof getCollabInboxAction>) {
  return getCollabInboxAction(...args)
}

export async function markCollabHandoffViewed(
  ...args: Parameters<typeof markCollabHandoffViewedAction>
) {
  return markCollabHandoffViewedAction(...args)
}

export async function respondToCollabHandoff(
  ...args: Parameters<typeof respondToCollabHandoffAction>
) {
  return respondToCollabHandoffAction(...args)
}

export async function cancelCollabHandoff(...args: Parameters<typeof cancelCollabHandoffAction>) {
  return cancelCollabHandoffAction(...args)
}

export async function recordCollabHandoffConversion(
  ...args: Parameters<typeof recordCollabHandoffConversionAction>
) {
  return recordCollabHandoffConversionAction(...args)
}

export async function getHandoffDataFromInquiry(
  ...args: Parameters<typeof getHandoffDataFromInquiryAction>
) {
  return getHandoffDataFromInquiryAction(...args)
}

export async function getHandoffForInquiry(...args: Parameters<typeof getHandoffForInquiryAction>) {
  return getHandoffForInquiryAction(...args)
}

export type {
  CollabAvailabilitySignal,
  CollabChefCard,
  CollabHandoffTimelineEvent,
  CollabInbox,
  CollabMetrics,
  CollabRecipientSuggestion,
  HandoffRecipientStatus,
  IncomingCollabHandoff,
  OutgoingCollabHandoff,
  TrustedCircleMember,
} from './collab/types'
