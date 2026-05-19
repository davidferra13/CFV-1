export type DinnerStewardshipLifecycleState =
  | 'not_active'
  | 'confirmed_stewardship'
  | 'final_prep'
  | 'service_day'
  | 'completed'
  | 'cancelled'

export type DinnerCircleParticipantRole =
  | 'host'
  | 'client'
  | 'guest'
  | 'assistant'
  | 'planner'
  | 'chef'
  | 'partner'

export type DinnerCircleActionTier = 'primary' | 'secondary' | 'advanced' | 'destructive'

export type DinnerCircleAction = {
  id: string
  label: string
  tier: DinnerCircleActionTier
  allowedRoles: DinnerCircleParticipantRole[]
  audit: 'feed' | 'private_audit' | 'moderation_audit'
  visibility: 'circle' | 'host_chef' | 'chef_only' | 'self'
  requiresReview: boolean
  clientSafeStatus: string
}

export type StewardshipGate = {
  id: string
  label: string
  status: 'complete' | 'current' | 'upcoming' | 'blocked'
  description: string
}

export type StewardshipMemoryItem = {
  id: string
  label: string
  timestamp: string | null
  visibility: 'circle' | 'host_chef' | 'chef_only'
  source: string
}

export type ParticipantProgress = {
  totalKnown: number
  responded: number
  dietaryComplete: number
  pending: number
}

export type StewardshipPrivacyControl = {
  id: string
  label: string
  protectedData: string
  enforcement: string
}

export type StewardshipLogistics = {
  chefBrings: string[]
  hostProvides: string[]
  serviceNotes: string[]
}

export type StewardshipSnapshotInput = {
  event: {
    id: string
    status: string
    event_date: string
    event_timezone?: string | null
    created_at?: string | null
    occasion?: string | null
    guest_count?: number | null
    payment_status?: string | null
    quoted_price_cents?: number | null
    deposit_amount_cents?: number | null
    menu_approval_status?: string | null
    menu_approved_at?: string | null
    pre_event_checklist_confirmed_at?: string | null
    location_address?: string | null
    access_instructions?: string | null
    kitchen_notes?: string | null
    site_notes?: string | null
    table_presentation?: string | null
  }
  guests: Array<{
    full_name?: string | null
    rsvp_status?: string | null
    dietary_restrictions?: string[] | null
    allergies?: string[] | null
  }>
  menuCount: number
  totalPaidCents: number
  outstandingBalanceCents: number
  hasCircle: boolean
  now?: Date
}

export type StewardshipSnapshot = {
  lifecycleState: DinnerStewardshipLifecycleState
  lifecycleLabel: string
  daysUntil: number
  gates: StewardshipGate[]
  participantProgress: ParticipantProgress
  actions: DinnerCircleAction[]
  memoryFeed: StewardshipMemoryItem[]
  privacyControls: StewardshipPrivacyControl[]
  logistics: StewardshipLogistics
}

const ACTIVE_STATUSES = new Set(['paid', 'confirmed'])

function daysUntil(eventDate: string, now: Date): number {
  const target = new Date(`${eventDate}T12:00:00`)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - start.getTime()) / 86_400_000)
}

export function getDinnerStewardshipLifecycleState(input: {
  status: string
  daysUntil: number
  menuApproved: boolean
  totalPaidCents: number
  outstandingBalanceCents: number
}): DinnerStewardshipLifecycleState {
  if (input.status === 'cancelled') return 'cancelled'
  if (input.status === 'completed') return 'completed'
  if (input.daysUntil <= 0 && input.status === 'in_progress') return 'service_day'
  if (input.daysUntil <= 7 && ['confirmed', 'in_progress'].includes(input.status)) {
    return 'final_prep'
  }

  const commerciallyConfirmed =
    ACTIVE_STATUSES.has(input.status) &&
    input.menuApproved &&
    (input.totalPaidCents > 0 || input.outstandingBalanceCents === 0)

  if (commerciallyConfirmed && input.daysUntil > 30) {
    return 'confirmed_stewardship'
  }

  return 'not_active'
}

export function getDinnerCircleActionContract(): DinnerCircleAction[] {
  return [
    {
      id: 'tell_us_anything_changed',
      label: 'Tell us anything changed',
      tier: 'primary',
      allowedRoles: ['host', 'client', 'assistant', 'planner'],
      audit: 'private_audit',
      visibility: 'host_chef',
      requiresReview: true,
      clientSafeStatus: 'Chef review',
    },
    {
      id: 'update_guest_status',
      label: 'Update attendance or dietary status',
      tier: 'primary',
      allowedRoles: ['host', 'client', 'guest', 'assistant', 'planner'],
      audit: 'feed',
      visibility: 'host_chef',
      requiresReview: false,
      clientSafeStatus: 'Updates readiness',
    },
    {
      id: 'view_dinner_home',
      label: 'View dinner home',
      tier: 'primary',
      allowedRoles: ['host', 'client', 'guest', 'assistant', 'planner', 'chef', 'partner'],
      audit: 'private_audit',
      visibility: 'self',
      requiresReview: false,
      clientSafeStatus: 'Available',
    },
    {
      id: 'share_circle_invite',
      label: 'Share Dinner Circle invite',
      tier: 'secondary',
      allowedRoles: ['host', 'client', 'assistant', 'planner', 'chef'],
      audit: 'feed',
      visibility: 'circle',
      requiresReview: false,
      clientSafeStatus: 'Invite link',
    },
    {
      id: 'private_surprise_note',
      label: 'Send private surprise note',
      tier: 'secondary',
      allowedRoles: ['host', 'client', 'assistant', 'planner'],
      audit: 'private_audit',
      visibility: 'host_chef',
      requiresReview: true,
      clientSafeStatus: 'Hidden from guests',
    },
    {
      id: 'cancel_or_reschedule',
      label: 'Request cancellation or reschedule',
      tier: 'destructive',
      allowedRoles: ['host', 'client'],
      audit: 'moderation_audit',
      visibility: 'chef_only',
      requiresReview: true,
      clientSafeStatus: 'Requires chef follow-up',
    },
  ]
}

export function getDinnerCirclePrivacyControls(): StewardshipPrivacyControl[] {
  return [
    {
      id: 'tenant_scope',
      label: 'Tenant and event boundary',
      protectedData: 'event, household, guest, payment, and profile data',
      enforcement: 'server actions must filter by event id, client id, and tenant id',
    },
    {
      id: 'guest_profile_minimization',
      label: 'Guest profile minimization',
      protectedData: 'dietary, relationship, household, and contact details',
      enforcement: 'client surfaces show readiness status unless the role can see person details',
    },
    {
      id: 'surprise_safety',
      label: 'Private surprise safety',
      protectedData: 'birthday, gift, and private host notes',
      enforcement: 'private notes are host/chef scoped and never rendered in the circle feed',
    },
    {
      id: 'moderation_audit',
      label: 'Moderation audit',
      protectedData: 'reports, removals, revoked-member access, and destructive actions',
      enforcement: 'sensitive actions require chef review and keep a non-public audit event',
    },
  ]
}

export function buildStewardshipSnapshot(input: StewardshipSnapshotInput): StewardshipSnapshot {
  const now = input.now ?? new Date()
  const remainingDays = daysUntil(input.event.event_date, now)
  const menuApproved = input.event.menu_approval_status === 'approved'
  const lifecycleState = getDinnerStewardshipLifecycleState({
    status: input.event.status,
    daysUntil: remainingDays,
    menuApproved,
    totalPaidCents: input.totalPaidCents,
    outstandingBalanceCents: input.outstandingBalanceCents,
  })

  const responded = input.guests.filter((guest) => guest.rsvp_status !== 'pending').length
  const dietaryComplete = input.guests.filter(
    (guest) =>
      (guest.dietary_restrictions?.filter(Boolean).length ?? 0) > 0 ||
      (guest.allergies?.filter(Boolean).length ?? 0) > 0 ||
      guest.rsvp_status !== 'pending'
  ).length
  const totalKnown = Math.max(input.guests.length, input.event.guest_count ?? 0)

  const gates: StewardshipGate[] = [
    {
      id: 'commercial_confirmation',
      label: 'Booking confirmed',
      status:
        input.totalPaidCents > 0 || input.outstandingBalanceCents === 0 ? 'complete' : 'blocked',
      description: 'Payment and booking basics are in place.',
    },
    {
      id: 'menu_confirmation',
      label: 'Menu confirmed',
      status: menuApproved ? 'complete' : input.menuCount > 0 ? 'current' : 'blocked',
      description: 'Menu decisions are clear enough for long-horizon stewardship.',
    },
    {
      id: 'circle_readiness',
      label: 'Dinner Circle active',
      status: input.hasCircle ? 'complete' : 'current',
      description: 'Host, chef, and participants have one shared dinner home.',
    },
    {
      id: 'participant_readiness',
      label: 'Participants checked in',
      status: totalKnown > 0 && dietaryComplete >= totalKnown ? 'complete' : 'current',
      description: 'Attendance and dietary readiness are tracked without exposing private details.',
    },
    {
      id: 'final_confirmation',
      label: 'Final confirmation',
      status: remainingDays <= 14 ? 'current' : 'upcoming',
      description: 'The final pass confirms headcount, access, timing, and host responsibilities.',
    },
  ]

  const memoryFeed: StewardshipMemoryItem[] = [
    {
      id: 'event_created',
      label: 'Dinner request captured',
      timestamp: input.event.created_at ?? null,
      visibility: 'circle',
      source: 'events.created_at',
    },
    {
      id: 'payment_confirmed',
      label: input.outstandingBalanceCents > 0 ? 'Payment started' : 'Payment complete',
      timestamp: null,
      visibility: 'host_chef',
      source: 'event_financial_summary',
    },
    {
      id: 'menu_approved',
      label: menuApproved ? 'Menu approved' : 'Menu is still being finalized',
      timestamp: input.event.menu_approved_at ?? null,
      visibility: 'circle',
      source: 'events.menu_approval_status',
    },
    {
      id: 'guest_readiness',
      label: `${dietaryComplete} of ${totalKnown} participant readiness checks complete`,
      timestamp: null,
      visibility: 'host_chef',
      source: 'event_guests',
    },
  ]

  const logistics: StewardshipLogistics = {
    chefBrings: [
      'Menu ingredients and chef-prepared components',
      'Core prep plan, service timing, and food-safety handling',
      input.menuCount > 0 ? 'Client-safe menu and serving notes' : 'Menu notes once finalized',
    ],
    hostProvides: [
      input.event.location_address ? 'Confirmed access to the event location' : 'Final address',
      input.event.access_instructions ? 'Access instructions' : 'Entry, parking, and access notes',
      'Accurate guest count and last material changes',
    ],
    serviceNotes: [
      input.event.kitchen_notes || 'Kitchen setup will be confirmed before final prep.',
      input.event.table_presentation || 'Table and service presentation can be confirmed here.',
      input.event.site_notes || 'Site-specific notes stay client-safe unless marked private.',
    ],
  }

  const labels: Record<DinnerStewardshipLifecycleState, string> = {
    not_active: 'Active booking',
    confirmed_stewardship: 'Confirmed Dinner Stewardship',
    final_prep: 'Final prep',
    service_day: 'Service day',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  return {
    lifecycleState,
    lifecycleLabel: labels[lifecycleState],
    daysUntil: remainingDays,
    gates,
    participantProgress: {
      totalKnown,
      responded,
      dietaryComplete,
      pending: Math.max(0, totalKnown - dietaryComplete),
    },
    actions: getDinnerCircleActionContract(),
    memoryFeed,
    privacyControls: getDinnerCirclePrivacyControls(),
    logistics,
  }
}
