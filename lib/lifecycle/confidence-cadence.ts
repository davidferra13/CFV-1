// Pre-Event Confidence Cadence Rule Engine
// Defines the 7 milestone points, timing calculations, message content,
// portal content, smart skip logic, and chef override support.
// Called by trigger-engine.ts on deposit confirmation.

import type { CadencePoint, CadencePointConfig } from '@/lib/communication/cadence-scheduler'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CadenceConfig {
  /** How many days before the cadence point to check for recent communication */
  skipWindowDays: number
  /** Default send hour (24h format) */
  defaultSendHour: number
  /** Whether to include portal link in all cadence emails */
  includePortalLink: boolean
}

export interface CadenceSchedule {
  eventId: string
  tenantId: string
  eventDate: Date
  points: CadenceScheduleEntry[]
}

export interface CadenceScheduleEntry {
  point: CadencePoint
  scheduledAt: Date
  label: string
  subject: string
  messageTemplate: string
  portalContent: PortalContent
  enabled: boolean
}

export interface PortalContent {
  headline: string
  description: string
  showCountdown: boolean
  showMenu: boolean
  showChecklist: boolean
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

export const DEFAULT_CADENCE_CONFIG: CadenceConfig = {
  skipWindowDays: 3,
  defaultSendHour: 9,
  includePortalLink: true,
}

// ---------------------------------------------------------------------------
// Milestone Point Definitions (portal content per point)
// ---------------------------------------------------------------------------

const PORTAL_CONTENT_MAP: Record<CadencePoint, PortalContent> = {
  deposit_confirmed: {
    headline: 'You are booked!',
    description: 'Your event is confirmed. Your chef will begin planning closer to the date.',
    showCountdown: true,
    showMenu: false,
    showChecklist: false,
  },
  '30_days_before': {
    headline: '30 days to go',
    description: 'Your chef is beginning menu preparation. Update dietary needs anytime.',
    showCountdown: true,
    showMenu: true,
    showChecklist: false,
  },
  '14_days_before': {
    headline: 'Two weeks out',
    description: 'Menu is taking shape. Review and confirm guest count.',
    showCountdown: true,
    showMenu: true,
    showChecklist: false,
  },
  '7_days_before': {
    headline: 'One week to go',
    description: 'Ingredients are being sourced. Your final menu is ready to review.',
    showCountdown: true,
    showMenu: true,
    showChecklist: true,
  },
  '48_hours_before': {
    headline: '48 hours out',
    description: 'Final prep is underway. Confirm any last-minute details with your chef.',
    showCountdown: true,
    showMenu: true,
    showChecklist: true,
  },
  '3_days_before': {
    headline: 'Almost here',
    description: 'Prep begins soon. Review arrival details and any last requests.',
    showCountdown: true,
    showMenu: true,
    showChecklist: true,
  },
  '1_day_before': {
    headline: 'Tomorrow is the day',
    description: 'Everything is set. Your chef arrives tomorrow.',
    showCountdown: true,
    showMenu: true,
    showChecklist: true,
  },
  event_day: {
    headline: 'Today is the day!',
    description: 'Your chef is preparing for your event. Enjoy!',
    showCountdown: false,
    showMenu: true,
    showChecklist: false,
  },
  post_event: {
    headline: 'Hope you enjoyed it!',
    description: 'Your event is complete. Leave feedback or rebook anytime.',
    showCountdown: false,
    showMenu: false,
    showChecklist: false,
  },
  // Cannabis cadence points (chef-facing, not shown in client portal)
  cannabis_attestation_reminder: {
    headline: 'Compliance check',
    description: 'Cannabis compliance items need attention before this event.',
    showCountdown: true,
    showMenu: false,
    showChecklist: true,
  },
  cannabis_onboarding_reminder: {
    headline: 'Guest intake pending',
    description: 'Some guests have not completed their cannabis intake forms.',
    showCountdown: true,
    showMenu: false,
    showChecklist: true,
  },
  cannabis_closeout_reminder: {
    headline: 'Post-event documentation',
    description: 'Cannabis control packet requires finalization.',
    showCountdown: false,
    showMenu: false,
    showChecklist: true,
  },
}

// ---------------------------------------------------------------------------
// Timing Calculations
// ---------------------------------------------------------------------------

/**
 * Calculate the scheduled send time for a cadence point.
 * Returns null if the point has already passed.
 */
export function calculateScheduledTime(
  eventDate: Date,
  pointConfig: CadencePointConfig,
  config: CadenceConfig = DEFAULT_CADENCE_CONFIG
): Date | null {
  if (pointConfig.daysBefore === -1) {
    // Fires immediately on deposit
    return new Date()
  }

  const scheduled = new Date(eventDate)
  scheduled.setDate(scheduled.getDate() - pointConfig.daysBefore)
  scheduled.setHours(config.defaultSendHour, 0, 0, 0)

  // If the point is already in the past, skip it
  if (scheduled <= new Date()) {
    return null
  }

  return scheduled
}

// ---------------------------------------------------------------------------
// Smart Skip Logic
// ---------------------------------------------------------------------------

export interface SkipCheckResult {
  shouldSkip: boolean
  reason: string | null
}

/**
 * Determine whether a cadence point should be skipped.
 * Checks:
 * 1. Chef disabled this point
 * 2. Chef communicated within the skip window (handled at scheduler level)
 */
export function evaluateSkipConditions(
  point: CadencePoint,
  disabledPoints: CadencePoint[],
  recentCommunicationTimestamp: string | null,
  config: CadenceConfig = DEFAULT_CADENCE_CONFIG
): SkipCheckResult {
  // Check if chef disabled this point
  if (disabledPoints.includes(point)) {
    return { shouldSkip: true, reason: 'Chef disabled this cadence point' }
  }

  // Check if chef communicated within skip window
  if (recentCommunicationTimestamp) {
    const commDate = new Date(recentCommunicationTimestamp)
    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - config.skipWindowDays)

    if (commDate >= windowStart) {
      return {
        shouldSkip: true,
        reason: `Chef communicated manually within ${config.skipWindowDays}-day window (${recentCommunicationTimestamp})`,
      }
    }
  }

  return { shouldSkip: false, reason: null }
}

// ---------------------------------------------------------------------------
// Schedule Builder
// ---------------------------------------------------------------------------

/**
 * Build a full cadence schedule for an event.
 * Uses CADENCE_POINTS from the scheduler and adds portal content.
 * Points that have already passed are excluded.
 */
export function buildCadenceSchedule(
  eventId: string,
  tenantId: string,
  eventDate: Date,
  cadencePoints: CadencePointConfig[],
  disabledPoints: CadencePoint[] = [],
  config: CadenceConfig = DEFAULT_CADENCE_CONFIG
): CadenceSchedule {
  const points: CadenceScheduleEntry[] = []

  for (const pointConfig of cadencePoints) {
    const scheduledAt = calculateScheduledTime(eventDate, pointConfig, config)

    // Skip points that have already passed
    if (!scheduledAt) continue

    const enabled = !disabledPoints.includes(pointConfig.point)

    points.push({
      point: pointConfig.point,
      scheduledAt,
      label: pointConfig.label,
      subject: pointConfig.subject,
      messageTemplate: pointConfig.defaultMessage,
      portalContent: PORTAL_CONTENT_MAP[pointConfig.point],
      enabled,
    })
  }

  return {
    eventId,
    tenantId,
    eventDate,
    points,
  }
}

// ---------------------------------------------------------------------------
// Trigger Engine Integration
// ---------------------------------------------------------------------------

/**
 * Entry point for the trigger engine on deposit confirmation.
 * Called when the 'deposit_received_cadence' trigger fires.
 * Delegates to the cadence scheduler for DB persistence.
 */
export async function initializeConfidenceCadence(
  tenantId: string,
  eventId: string,
  eventDate: string | Date
): Promise<{ created: number; skipped: number }> {
  const { createCadenceSchedule } = await import('@/lib/communication/cadence-scheduler')

  return createCadenceSchedule(tenantId, eventId, eventDate)
}

/**
 * Get portal content for a specific cadence point.
 * Used by client portal components to render stage-appropriate content.
 */
export function getPortalContent(point: CadencePoint): PortalContent {
  return PORTAL_CONTENT_MAP[point]
}

/**
 * Get all cadence points with their portal content.
 * Useful for settings UI where chef can toggle individual points.
 */
export function getAllCadencePointsWithContent(
  cadencePoints: CadencePointConfig[]
): Array<CadencePointConfig & { portalContent: PortalContent }> {
  return cadencePoints.map((cp) => ({
    ...cp,
    portalContent: PORTAL_CONTENT_MAP[cp.point],
  }))
}
