// Day-Of Live Client Status - Types
// Client-facing status view for event day service tracking

import type { ServiceStage } from './service-tracker-types'

// ── Client-Facing Status Messages ────────────────────────────────────────────

export const CLIENT_STATUS_MESSAGES: Record<ServiceStage, string> = {
  en_route: 'Your chef is on the way.',
  arrived: 'Your chef has arrived and is setting up.',
  prepping: 'Prep is underway.',
  cooking: 'Your dinner is being prepared.',
  plating: 'Almost ready. Dishes are being plated.',
  serving: 'Enjoy your meal!',
  cleanup: 'Your chef is cleaning up. Almost done.',
  done: 'All done. Thank you for a wonderful evening.',
}

// Stages that trigger client notification (not every stage change)
export const CLIENT_NOTIFY_STAGES: ServiceStage[] = ['arrived', 'done']

// ── Types ────────────────────────────────────────────────────────────────────

export type ClientLiveStatus = {
  eventId: string
  stage: ServiceStage | null
  stageLabel: string
  clientMessage: string
  chefNote: string | null
  eta: string | null
  serveTime: string | null
  isActive: boolean
  isComplete: boolean
  isDelayed: boolean
  delayMinutes: number | null
  lastUpdatedAt: string | null
}

export type ClientStatusTimelineEntry = {
  stage: ServiceStage
  stageLabel: string
  clientMessage: string
  note: string | null
  occurredAt: string
}

export type StatusPublishResult = {
  success: boolean
  stage: ServiceStage
  notifiedClient: boolean
}

export type DelayCheckResult = {
  isDelayed: boolean
  delayMinutes: number
  expectedArrival: string | null
  lastChefUpdate: string | null
}

export type AutoNotifyConfig = {
  eventId: string
  enabled: boolean
  delayThresholdMinutes: number
}

// Default delay threshold before notifying client
export const DEFAULT_DELAY_THRESHOLD_MINUTES = 15
