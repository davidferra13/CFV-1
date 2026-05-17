/**
 * Settings action-layer types and resolvers.
 * Identifies configuration gaps and produces fix-task cards.
 */

import type { SurfaceActionTone } from '@/lib/interface/shared-types'
import type { SchedulingRules } from '@/lib/availability/rules-actions'
import type { BookingSettings } from '@/lib/booking/booking-settings-actions'
import type { GoogleConnectionStatus } from '@/lib/google/types'
import type { WixConnectionStatus } from '@/lib/wix/types'

export type SettingsProfileState = {
  slug: string | null
  tagline: string | null
  bio: string | null
  profileImageUrl: string | null
  publicProfileHidden: boolean
}

export type SettingsFixTask = {
  id: string
  title: string
  description: string
  currentState: string
  impact: string
  href: string
  ctaLabel: string
  tone: SurfaceActionTone
}

export function hasSchedulingRulesConfigured(rules: SchedulingRules | null): boolean {
  if (!rules) return false

  return (
    rules.blocked_days_of_week.length > 0 ||
    rules.preferred_days_of_week.length > 0 ||
    rules.min_buffer_days > 0 ||
    rules.min_lead_days > 0 ||
    rules.max_events_per_week !== null ||
    rules.max_events_per_month !== null
  )
}

function describeBookingGaps(settings: BookingSettings): string[] {
  const gaps: string[] = []

  if (!settings.booking_slug) gaps.push('booking URL')
  if (!settings.booking_headline) gaps.push('headline')
  if (!settings.booking_bio_short) gaps.push('short description')

  return gaps
}

export function resolveSettingsFixTasks(input: {
  profile: SettingsProfileState
  googleConnection: GoogleConnectionStatus
  schedulingRules: SchedulingRules | null
  bookingSettings: BookingSettings | null
  googleReviewUrl: string | null
  wixConnection: WixConnectionStatus | null
}): SettingsFixTask[] {
  const tasks: SettingsFixTask[] = []

  if (!input.profile.slug) {
    tasks.push({
      id: 'profile-url',
      title: 'Give your profile a live URL',
      description:
        'Set the public profile basics so clients have a real surface to land on and share.',
      currentState: 'Current state: no public profile URL is saved yet.',
      impact: 'Without it, your public surface cannot act like a dependable front door.',
      href: '/settings/my-profile',
      ctaLabel: 'Fix This Setting',
      tone: 'rose',
    })
  } else if (input.profile.publicProfileHidden) {
    tasks.push({
      id: 'profile-copy',
      title: 'Unhide your public profile',
      description:
        'Finish the missing public-facing copy so your profile can be shown with confidence.',
      currentState:
        'Current state: the live profile is hidden because the bio or tagline is missing.',
      impact: 'Clients cannot trust or share a profile that never fully resolves.',
      href: '/settings/my-profile',
      ctaLabel: 'Fix This Setting',
      tone: 'rose',
    })
  }

  if (input.googleConnection.gmail.connected && input.googleConnection.gmail.errorCount > 0) {
    tasks.push({
      id: 'gmail-repair',
      title: 'Repair inbox capture',
      description:
        'Gmail is connected, but recent sync failures mean inquiry capture may drift or stall.',
      currentState: `Current state: ${input.googleConnection.gmail.errorCount} recent Gmail sync error(s).`,
      impact: 'New leads can sit outside the triage flow until this connection is healthy again.',
      href: '/settings#connected-accounts-integrations',
      ctaLabel: 'Fix This Setting',
      tone: 'emerald',
    })
  } else if (!input.googleConnection.gmail.connected) {
    tasks.push({
      id: 'gmail-connect',
      title: 'Connect Gmail capture',
      description:
        'Connect the inbox ChefFlow is supposed to read so inquiry triage stops depending on manual copy-paste.',
      currentState: 'Current state: Gmail capture is disconnected.',
      impact: 'Inbox-driven inquiry flow stays incomplete until this account is connected.',
      href: '/settings#connected-accounts-integrations',
      ctaLabel: 'Fix This Setting',
      tone: 'emerald',
    })
  }

  if (!input.googleConnection.calendar.connected) {
    tasks.push({
      id: 'calendar-connect',
      title: 'Connect Google Calendar',
      description:
        'Wire up the calendar ChefFlow should respect before booking and schedule surfaces drift from reality.',
      currentState: 'Current state: live calendar availability is disconnected.',
      impact: 'Availability warnings and booking context stay weaker until the calendar is synced.',
      href: '/settings#connected-accounts-integrations',
      ctaLabel: 'Fix This Setting',
      tone: 'emerald',
    })
  }

  if (!hasSchedulingRulesConfigured(input.schedulingRules)) {
    tasks.push({
      id: 'availability-rules',
      title: 'Define your availability rules',
      description:
        'Save your lead time, buffers, or capacity limits so ChefFlow can warn before double-booking.',
      currentState: 'Current state: no active scheduling rules are saved yet.',
      impact:
        'Booking and event flows cannot protect your real operating limits until rules exist.',
      href: '/settings#availability-rules',
      ctaLabel: 'Fix This Setting',
      tone: 'sky',
    })
  }

  if (input.bookingSettings?.booking_enabled) {
    const bookingGaps = describeBookingGaps(input.bookingSettings)
    if (bookingGaps.length > 0) {
      tasks.push({
        id: 'booking-page',
        title: 'Finish your booking page',
        description:
          'Complete the shared booking surface so the public link resolves to something clients can actually understand.',
        currentState: `Current state: missing ${bookingGaps.join(', ')} on the booking page.`,
        impact:
          'A half-configured booking link adds friction right at the handoff from interest to inquiry.',
        href: '/settings#booking-page',
        ctaLabel: 'Fix This Setting',
        tone: 'sky',
      })
    }
  }

  if (!input.googleReviewUrl) {
    tasks.push({
      id: 'review-link',
      title: 'Add your Google review link',
      description:
        'Set the review destination ChefFlow should send clients to after service is complete.',
      currentState: 'Current state: no Google review URL is saved.',
      impact:
        'Review collection stays fragmented when the post-event path has nowhere concrete to point.',
      href: '/settings#client-reviews',
      ctaLabel: 'Fix This Setting',
      tone: 'amber',
    })
  }

  if (input.wixConnection?.connected && input.wixConnection.errorCount > 0) {
    tasks.push({
      id: 'wix-repair',
      title: 'Repair Wix form intake',
      description:
        'Your Wix intake is connected, but recent delivery failures mean website leads may not land cleanly in ChefFlow.',
      currentState: `Current state: ${input.wixConnection.errorCount} Wix delivery error(s) recorded.`,
      impact:
        'Website-originated inquiries can fall out of the operating queue until this is stable.',
      href: '/settings#connected-accounts-integrations',
      ctaLabel: 'Fix This Setting',
      tone: 'emerald',
    })
  }

  return tasks
}
