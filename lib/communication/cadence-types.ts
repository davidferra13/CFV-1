export type CadencePoint =
  | 'deposit_confirmed'
  | '30_days_before'
  | '14_days_before'
  | '7_days_before'
  | '3_days_before'
  | '48_hours_before'
  | '1_day_before'
  | 'event_day'
  | 'post_event'
  | 'cannabis_attestation_reminder'
  | 'cannabis_onboarding_reminder'
  | 'cannabis_closeout_reminder'

export interface CadenceItem {
  id?: string
  event_id: string
  tenant_id: string
  cadence_point: CadencePoint
  channel?: 'email' | 'sms'
  scheduled_at: string
  sent_at: string | null
  skipped_at: string | null
  skip_reason: string | null
}

export interface CadencePointConfig {
  point: CadencePoint
  daysBefore: number
  label: string
  subject: string
  defaultMessage: string
}

export const CADENCE_POINTS: CadencePointConfig[] = [
  {
    point: 'deposit_confirmed',
    daysBefore: -1,
    label: 'Booking Confirmation',
    subject: "You're booked!",
    defaultMessage:
      "You're booked! Here's your event portal link. Your chef will begin planning closer to the date.",
  },
  {
    point: '30_days_before',
    daysBefore: 30,
    label: '30 Days Out',
    subject: 'Your event is 30 days away',
    defaultMessage:
      'Your event is 30 days away. {chefName} is beginning menu preparation. Any dietary updates? Reply here or update in your portal.',
  },
  {
    point: '14_days_before',
    daysBefore: 14,
    label: '14 Days Out',
    subject: 'Two weeks until your event',
    defaultMessage:
      'Two weeks out. Your menu is {menuStatus}. Guest count: {guestCount}. Anything to update?',
  },
  {
    point: '7_days_before',
    daysBefore: 7,
    label: '7 Days Out',
    subject: 'One week to go',
    defaultMessage:
      'One week to go. {chefName} is sourcing ingredients this week. Here is your final menu.',
  },
  {
    point: '3_days_before',
    daysBefore: 3,
    label: '3 Days Out',
    subject: 'Almost here!',
    defaultMessage:
      'Almost here! {chefName} begins prep on {prepDate}. Arrival time: {arrivalTime}. Any last questions?',
  },
  {
    point: '1_day_before',
    daysBefore: 1,
    label: '1 Day Before',
    subject: "Tomorrow's the day",
    defaultMessage:
      "Tomorrow's the day. {chefName} arrives at {arrivalTime} at {location}. Everything is set.",
  },
  {
    point: 'event_day',
    daysBefore: 0,
    label: 'Event Day',
    subject: 'Today is the day!',
    defaultMessage: 'Today! {chefName} is preparing for your {occasion}. Enjoy your evening.',
  },
]

export const SMS_CADENCE_POINTS: CadencePointConfig[] = [
  {
    point: '48_hours_before',
    daysBefore: 2,
    label: '48 Hours Out (SMS)',
    subject: '',
    defaultMessage: '',
  },
  {
    point: 'post_event',
    daysBefore: -2,
    label: 'Post Event (SMS)',
    subject: '',
    defaultMessage: '',
  },
]

export const SMS_CADENCE_TEMPLATES: Partial<Record<CadencePoint, string>> = {
  deposit_confirmed:
    'Booked! {chefName} confirmed for {occasion}. Details in your portal: {portalUrl}',
  '7_days_before':
    'One week out! {chefName} is sourcing ingredients for your {occasion}. Any last updates? Reply here.',
  '48_hours_before':
    "2 days! {chefName} arrives {arrivalTime} on {eventDate}. Can't wait to cook for you.",
  post_event: 'Hope you loved it! {chefName} would love your feedback. Reply or visit: {portalUrl}',
}

// ---------------------------------------------------------------------------
// Cannabis-specific cadence points (chef-facing reminders)
// daysBefore > 0 = before event, daysBefore < 0 = after event
// ---------------------------------------------------------------------------

export interface CannabisCadencePointConfig {
  point: CadencePoint
  daysBefore: number
  label: string
  subject: string
  defaultMessage: string
}

export const CANNABIS_CADENCE_POINTS: CannabisCadencePointConfig[] = [
  {
    point: 'cannabis_attestation_reminder',
    daysBefore: 14,
    label: 'Cannabis Attestation Check (14 days)',
    subject: 'Cannabis compliance action needed for {occasion}',
    defaultMessage:
      'Your cannabis event "{occasion}" on {eventDate} has outstanding compliance items. Please review the host agreement and guest age attestation status before proceeding.',
  },
  {
    point: 'cannabis_onboarding_reminder',
    daysBefore: 7,
    label: 'Cannabis Guest Onboarding Check (7 days)',
    subject: 'Guest cannabis intake incomplete for {occasion}',
    defaultMessage:
      'One or more guests have not completed their cannabis intake form for "{occasion}" on {eventDate}. Follow up with them to ensure a smooth experience.',
  },
  {
    point: 'cannabis_closeout_reminder',
    daysBefore: -3,
    label: 'Cannabis Closeout Reminder (3 days after)',
    subject: 'Cannabis control packet needs attention for {occasion}',
    defaultMessage:
      'Your cannabis event "{occasion}" completed {daysAgo} days ago but the control packet has not been finalized. Please complete the post-event documentation.',
  },
]
