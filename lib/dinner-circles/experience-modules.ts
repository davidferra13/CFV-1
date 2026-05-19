type EventInput = {
  id: string
  occasion?: string | null
  status?: string | null
  event_date: string
  serve_time?: string | null
  event_timezone?: string | null
  location_address?: string | null
  location_city?: string | null
  location_state?: string | null
  location_zip?: string | null
  access_instructions?: string | null
  guest_count?: number | null
  menu_approval_status?: string | null
  special_requests?: string | null
  kitchen_notes?: string | null
  site_notes?: string | null
  table_presentation?: string | null
}

type GuestInput = {
  id?: string | null
  full_name?: string | null
  rsvp_status?: string | null
  attendance_queue_status?: string | null
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
  plus_one?: boolean | null
}

type RSVPSummaryInput = {
  total_guests?: number | null
  attending_count?: number | null
  declined_count?: number | null
  maybe_count?: number | null
  pending_count?: number | null
  waitlisted_count?: number | null
  plus_one_count?: number | null
}

type ActiveShareInput = {
  rsvp_deadline_at?: string | null
  is_active?: boolean | null
}

export type DinnerCircleExperienceModulesInput = {
  event: EventInput
  guests: GuestInput[]
  rsvpSummary: RSVPSummaryInput | null
  activeShare: ActiveShareInput | null
  now?: Date
}

export type DinnerCircleExperienceModules = ReturnType<typeof buildDinnerCircleExperienceModules>

function formatDateLabel(dateLike: string | null | undefined): string {
  if (!dateLike) return 'Date to be confirmed'
  const date = new Date(`${dateLike.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(dateLike: string, offset: number): string {
  const date = new Date(`${dateLike.slice(0, 10)}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return dateOnly(date)
}

function locationLabel(event: EventInput): string {
  return (
    [event.location_address, event.location_city, event.location_state, event.location_zip]
      .filter(Boolean)
      .join(', ') || 'Location will be confirmed before final prep.'
  )
}

function timeLabel(event: EventInput): string {
  return event.serve_time
    ? `Dinner service starts around ${event.serve_time}.`
    : 'Dinner timing is being held with your chef.'
}

function hasDietarySignal(guest: GuestInput): boolean {
  return (
    (guest.dietary_restrictions?.filter(Boolean).length ?? 0) > 0 ||
    (guest.allergies?.filter(Boolean).length ?? 0) > 0
  )
}

function guestDisplayName(guest: GuestInput, index: number): string {
  return guest.full_name?.trim() || `Guest ${index + 1}`
}

export function buildDinnerCircleReminderUrl(input: {
  title: string
  date: string
  details: string
}): string {
  const day = input.date.replace(/-/g, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${day}T090000/${day}T091500`,
    details: input.details,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildDinnerCircleExperienceModules(input: DinnerCircleExperienceModulesInput) {
  const summary = input.rsvpSummary
  const attendingCount =
    summary?.attending_count ??
    input.guests.filter((guest) => guest.rsvp_status === 'attending').length
  const maybeCount =
    summary?.maybe_count ?? input.guests.filter((guest) => guest.rsvp_status === 'maybe').length
  const declinedCount =
    summary?.declined_count ??
    input.guests.filter((guest) => guest.rsvp_status === 'declined').length
  const pendingCount =
    summary?.pending_count ??
    input.guests.filter((guest) => !guest.rsvp_status || guest.rsvp_status === 'pending').length
  const plusOneCount =
    summary?.plus_one_count ?? input.guests.filter((guest) => guest.plus_one).length
  const waitlistedCount =
    summary?.waitlisted_count ??
    input.guests.filter((guest) => guest.attendance_queue_status === 'waitlisted').length
  const dietaryComplete = input.guests.filter(hasDietarySignal).length
  const expectedCount = Math.max(
    input.event.guest_count ?? 0,
    summary?.total_guests ?? 0,
    input.guests.length
  )
  const rsvpDeadline = input.activeShare?.rsvp_deadline_at
    ? input.activeShare.rsvp_deadline_at.slice(0, 10)
    : addDays(input.event.event_date, -7)
  const dietaryDeadline = addDays(input.event.event_date, -10)
  const arrivalReminderDate = addDays(input.event.event_date, -1)
  const title = input.event.occasion || 'Private Chef Dinner'

  const guideSections = [
    {
      id: 'arrival',
      title: 'Arrival',
      source: 'Host logistics',
      visibility: 'circle' as const,
      items: [
        formatDateLabel(input.event.event_date),
        timeLabel(input.event),
        locationLabel(input.event),
        input.event.access_instructions ||
          'Access and parking notes can be updated before the final check.',
      ],
    },
    {
      id: 'table_expectations',
      title: 'Table Expectations',
      source: 'Host preferences',
      visibility: 'circle' as const,
      items: [
        input.event.table_presentation ||
          'Table presentation can be shaped with the host and chef.',
        input.event.special_requests ||
          'Guests should follow host photo, phone, gift, and house preferences.',
      ],
    },
    {
      id: 'chef_service',
      title: 'Chef Service',
      source: 'Chef requirements',
      visibility: 'circle' as const,
      items: [
        input.event.menu_approval_status === 'approved'
          ? 'The menu is approved; material changes should be sent for chef review.'
          : 'Menu details are still being finalized.',
        input.event.kitchen_notes || 'Kitchen and prep access stay coordinated with the chef.',
        'Allergy and dietary updates should be submitted before the dietary deadline.',
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy',
      source: 'Dinner Circle safety',
      visibility: 'circle' as const,
      items: [
        'Private surprises stay host/chef scoped.',
        'Dietary and allergy details are used for readiness and chef safety, not broad guest chatter.',
        'Ask for corrections instead of reposting sensitive details in group spaces.',
      ],
    },
  ]

  return {
    rsvpCommandCenter: {
      expectedCount,
      attendingCount,
      maybeCount,
      declinedCount,
      pendingCount,
      waitlistedCount,
      plusOneCount,
      effectiveAttending: attendingCount + plusOneCount,
      dietaryComplete,
      dietaryMissing: Math.max(0, expectedCount - dietaryComplete),
      deadlineLabel: formatDateLabel(rsvpDeadline),
      actions: [
        {
          id: 'review_rsvp_ops',
          label: 'Review RSVP operations',
          href: '#dinner-circle-rsvp-ops',
          visibility: 'host_chef',
        },
        {
          id: 'message_pending_guests',
          label: 'Message pending guests',
          href: '#dinner-circle-rsvp-ops',
          visibility: 'host_chef',
        },
        {
          id: 'update_attendance_or_dietary',
          label: 'Update attendance or dietary status',
          href: '#dinner-stewardship-title',
          visibility: 'circle',
        },
      ],
      rows: input.guests.map((guest, index) => ({
        id: guest.id || `${guestDisplayName(guest, index)}-${index}`,
        name: guestDisplayName(guest, index),
        rsvpStatus:
          guest.attendance_queue_status === 'waitlisted'
            ? 'waitlisted'
            : guest.rsvp_status || 'pending',
        dietaryStatus: hasDietarySignal(guest) ? 'complete' : 'missing',
        dietaryDetailsVisible: false,
        plusOne: Boolean(guest.plus_one),
      })),
    },
    attendeeGuide: {
      title: `${title} attendee guide`,
      sections: guideSections,
      acknowledgementPrompts: [
        'I know when to arrive.',
        'I know what the host expects.',
        'I know dietary changes need chef review.',
      ],
      correctionAction: {
        label: 'Suggest a guide correction',
        visibility: 'host_chef' as const,
        targetActionId: 'tell_us_anything_changed',
      },
    },
    calendarReminders: {
      mainEvent: {
        label: 'Add dinner to calendar',
        icsHref: `/api/calendar/event/${input.event.id}`,
      },
      reminders: [
        {
          id: 'rsvp_deadline',
          label: 'RSVP deadline',
          date: rsvpDeadline,
          visibility: 'self' as const,
          googleHref: buildDinnerCircleReminderUrl({
            title: `${title}: RSVP deadline`,
            date: rsvpDeadline,
            details: 'Confirm attendance and plus-one needs in the Dinner Circle.',
          }),
        },
        {
          id: 'dietary_deadline',
          label: 'Dietary deadline',
          date: dietaryDeadline,
          visibility: 'self' as const,
          googleHref: buildDinnerCircleReminderUrl({
            title: `${title}: dietary deadline`,
            date: dietaryDeadline,
            details: 'Send allergies and dietary changes for chef review.',
          }),
        },
        {
          id: 'arrival_reminder',
          label: 'Arrival reminder',
          date: arrivalReminderDate,
          visibility: 'self' as const,
          googleHref: buildDinnerCircleReminderUrl({
            title: `${title}: arrival reminder`,
            date: arrivalReminderDate,
            details: 'Check arrival time, parking, and access notes before dinner day.',
          }),
        },
      ],
      privateDetailsPolicy:
        'Calendar links are role-safe: they omit private surprises, payment details, access codes, and chef-only notes unless an authorized surface adds them.',
    },
  }
}
