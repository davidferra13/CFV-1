// Post-Event Follow-Up Email Templates
// Returns { subject, react } for each step in the follow-up sequence.
// Templates are deterministic (no AI). Warm, personal, human tone.

import { createElement } from 'react'
import type { ReactElement } from 'react'
import { ThankYouFollowUpEmail } from '@/components/email/thank-you-email'
import { RebookingNudgeEmail } from '@/components/email/rebooking-email'
import { SeasonalTeaserEmail } from '@/components/email/seasonal-teaser-email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'

/**
 * Day 1: Thank you email after event completion.
 */
export function getThankYouEmail(
  chefName: string,
  clientName: string,
  eventTitle: string,
  eventDate: string
): { subject: string; react: ReactElement } {
  return {
    subject: `Thank you for a wonderful evening`,
    react: createElement(ThankYouFollowUpEmail, {
      chefName,
      clientName,
      eventTitle,
      eventDate,
      bookAgainUrl: `${APP_URL}/book`,
    }),
  }
}

/**
 * Day 14: Gentle rebooking nudge.
 */
export function getRebookingNudgeEmail(
  chefName: string,
  clientName: string,
  lastEventDate: string
): { subject: string; react: ReactElement } {
  return {
    subject: `Let us cook for you again`,
    react: createElement(RebookingNudgeEmail, {
      chefName,
      clientName,
      lastEventDate,
      bookingUrl: `${APP_URL}/book`,
    }),
  }
}

/**
 * Day 90: Seasonal menu teaser.
 */
export function getSeasonalTeaserEmail(
  chefName: string,
  clientName: string,
  season: string
): { subject: string; react: ReactElement } {
  return {
    subject: `New ${season} menus are here`,
    react: createElement(SeasonalTeaserEmail, {
      chefName,
      clientName,
      season,
      bookingUrl: `${APP_URL}/book`,
    }),
  }
}
