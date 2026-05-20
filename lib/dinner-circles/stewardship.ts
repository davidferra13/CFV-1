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

export type StewardshipChangeType =
  | 'headcount'
  | 'guest_swap'
  | 'dietary'
  | 'menu_request'
  | 'private_surprise'
  | 'timing_access'
  | 'cancellation_reschedule'
  | 'addon'
  | 'general'

export type StewardshipWindowStatus = 'easy' | 'chef_review' | 'prep_impact' | 'locked'

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

export type StewardshipTimelineGate = {
  id: string
  label: string
  daysBefore: number
  status: 'complete' | 'current' | 'upcoming' | 'stale'
  purpose: string
  clientAction: string
  notificationTopic: StewardshipNotificationTopic
  suppressesDuplicateManualOutreach: boolean
}

export type StewardshipChangeWindow = {
  changeType: StewardshipChangeType
  label: string
  status: StewardshipWindowStatus
  clientCopy: string
  chefImpact: string[]
  requiresReview: boolean
  paymentScope: 'none' | 'possible_adjustment' | 'policy_review'
}

export type StewardshipNotificationTopic =
  | 'major_updates'
  | 'dietary_allergy'
  | 'menu_occasion'
  | 'logistics'
  | 'addons_payments'
  | 'chef_only_risk'

export type StewardshipNotificationPreference = {
  id: StewardshipNotificationTopic
  label: string
  allowedRoles: DinnerCircleParticipantRole[]
  defaultEnabled: boolean
  sensitive: boolean
  recipientRule: string
  automationGuard: string
}

export type StewardshipAddOnPrompt = {
  id: string
  label: string
  priceStatus: 'priced' | 'quote_needed' | 'chef_review'
  eligible: boolean
  visibility: 'host_client' | 'host_chef' | 'chef_only'
  reason: string
  createsTask: 'chef_review' | 'invoice_or_ledger' | 'future_booking'
  suppressedByWindow: boolean
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
  timelineGates: StewardshipTimelineGate[]
  changeWindows: StewardshipChangeWindow[]
  notificationPreferences: StewardshipNotificationPreference[]
  addOnPrompts: StewardshipAddOnPrompt[]
  participantProgress: ParticipantProgress
  actions: DinnerCircleAction[]
  memoryFeed: StewardshipMemoryItem[]
  privacyControls: StewardshipPrivacyControl[]
  logistics: StewardshipLogistics
}

const ACTIVE_STATUSES = new Set(['paid', 'confirmed'])

const CHANGE_LABELS: Record<StewardshipChangeType, string> = {
  headcount: 'Headcount',
  guest_swap: 'Guest list',
  dietary: 'Dietary or allergy',
  menu_request: 'Menu request',
  private_surprise: 'Private surprise',
  timing_access: 'Timing or access',
  cancellation_reschedule: 'Cancel or reschedule',
  addon: 'Add-on',
  general: 'General update',
}

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

export function getStewardshipWindowStatus(daysUntil: number): StewardshipWindowStatus {
  if (daysUntil >= 30) return 'easy'
  if (daysUntil >= 14) return 'chef_review'
  if (daysUntil >= 7) return 'prep_impact'
  return 'locked'
}

export function getStewardshipChangeWindows(daysUntil: number): StewardshipChangeWindow[] {
  const baseStatus = getStewardshipWindowStatus(daysUntil)

  return (Object.keys(CHANGE_LABELS) as StewardshipChangeType[]).map((changeType) => {
    const isPolicyChange = changeType === 'cancellation_reschedule'
    const isSafetyChange = changeType === 'dietary'
    const status: StewardshipWindowStatus =
      isSafetyChange && baseStatus === 'locked'
        ? 'prep_impact'
        : isPolicyChange && baseStatus === 'easy'
          ? 'chef_review'
          : baseStatus

    const chefImpact: string[] = []
    if (['headcount', 'guest_swap', 'dietary'].includes(changeType)) {
      chefImpact.push('guest readiness')
    }
    if (['menu_request', 'dietary', 'addon'].includes(changeType)) {
      chefImpact.push('menu and sourcing')
    }
    if (['headcount', 'addon', 'cancellation_reschedule'].includes(changeType)) {
      chefImpact.push('price, deposit, or ledger')
    }
    if (['timing_access', 'cancellation_reschedule'].includes(changeType)) {
      chefImpact.push('calendar and staffing')
    }

    return {
      changeType,
      label: CHANGE_LABELS[changeType],
      status,
      clientCopy:
        status === 'easy'
          ? 'Usually simple to adjust.'
          : status === 'chef_review'
            ? 'Your chef will review before anything changes.'
            : status === 'prep_impact'
              ? 'This may affect prep, sourcing, timing, or cost.'
              : 'Locked except for urgent safety or logistics issues.',
      chefImpact: chefImpact.length > 0 ? chefImpact : ['client communication'],
      requiresReview: status !== 'easy' || changeType !== 'timing_access',
      paymentScope: isPolicyChange
        ? 'policy_review'
        : ['headcount', 'menu_request', 'addon'].includes(changeType)
          ? 'possible_adjustment'
          : 'none',
    }
  })
}

export function getDinnerCircleNotificationPreferences(): StewardshipNotificationPreference[] {
  return [
    {
      id: 'major_updates',
      label: 'Major dinner updates',
      allowedRoles: ['host', 'client', 'assistant', 'planner', 'guest'],
      defaultEnabled: true,
      sensitive: false,
      recipientRule: 'Send client-safe milestone changes to opted-in Dinner Circle members.',
      automationGuard: 'Never send if the member muted all stewardship updates.',
    },
    {
      id: 'dietary_allergy',
      label: 'Dietary and allergy requests',
      allowedRoles: ['host', 'client', 'assistant', 'planner', 'guest', 'chef'],
      defaultEnabled: true,
      sensitive: true,
      recipientRule: 'Send only to the person, host-approved coordinators, and chef-side users.',
      automationGuard:
        'Strip unrelated guest details and keep chef-only risk out of guest messages.',
    },
    {
      id: 'menu_occasion',
      label: 'Menu and occasion updates',
      allowedRoles: ['host', 'client', 'assistant', 'planner', 'guest'],
      defaultEnabled: true,
      sensitive: false,
      recipientRule: 'Send menu reveal and occasion updates when they are marked client-safe.',
      automationGuard: 'Do not expose chef-only notes, vendor notes, or surprise details.',
    },
    {
      id: 'logistics',
      label: 'Timing, access, and logistics',
      allowedRoles: ['host', 'client', 'assistant', 'planner', 'guest', 'partner'],
      defaultEnabled: true,
      sensitive: false,
      recipientRule: 'Send arrival, parking, and day-before logistics to relevant participants.',
      automationGuard: 'Respect quiet hours and avoid duplicate manual chef outreach.',
    },
    {
      id: 'addons_payments',
      label: 'Add-ons and payment-sensitive updates',
      allowedRoles: ['host', 'client', 'assistant', 'planner'],
      defaultEnabled: false,
      sensitive: true,
      recipientRule: 'Send only to financially authorized roles.',
      automationGuard: 'Guests never receive price, invoice, deposit, or contract-scope prompts.',
    },
    {
      id: 'chef_only_risk',
      label: 'Chef-only readiness risk',
      allowedRoles: ['chef', 'partner'],
      defaultEnabled: true,
      sensitive: true,
      recipientRule: 'Route risk, stale gates, and failed sends to chef-side readiness surfaces.',
      automationGuard: 'Never render in the client portal or Dinner Circle feed.',
    },
  ]
}

export function getStewardshipNotificationTopicsForRole(
  role: DinnerCircleParticipantRole
): StewardshipNotificationTopic[] {
  return getDinnerCircleNotificationPreferences()
    .filter((preference) => preference.allowedRoles.includes(role))
    .map((preference) => preference.id)
}

export function getStewardshipTimelineGates(daysUntil: number): StewardshipTimelineGate[] {
  const schedule: Array<Omit<StewardshipTimelineGate, 'status'>> = [
    {
      id: 't120_confirmation_complete',
      label: 'Confirmation complete',
      daysBefore: 120,
      purpose: 'Confirm the dinner is real, paid or contracted, and stewarded.',
      clientAction: 'Review the dinner home.',
      notificationTopic: 'major_updates',
      suppressesDuplicateManualOutreach: true,
    },
    {
      id: 't90_occasion_detail_check',
      label: 'Occasion detail check',
      daysBefore: 90,
      purpose: 'Catch early occasion, guest, or surprise context.',
      clientAction: 'Add anything the chef should know.',
      notificationTopic: 'menu_occasion',
      suppressesDuplicateManualOutreach: true,
    },
    {
      id: 't60_logistics_soft_check',
      label: 'Logistics soft check',
      daysBefore: 60,
      purpose: 'Confirm location, access, timing, and broad guest expectations.',
      clientAction: 'Confirm access and timing.',
      notificationTopic: 'logistics',
      suppressesDuplicateManualOutreach: true,
    },
    {
      id: 't30_experience_finalization',
      label: 'Experience finalization',
      daysBefore: 30,
      purpose: 'Move menu, add-ons, and guest readiness from flexible to reviewable.',
      clientAction: 'Finalize optional changes.',
      notificationTopic: 'major_updates',
      suppressesDuplicateManualOutreach: true,
    },
    {
      id: 't14_prep_impact_warning',
      label: 'Prep-impact warning',
      daysBefore: 14,
      purpose: 'Warn that new changes may affect prep, sourcing, staffing, or cost.',
      clientAction: 'Submit only material changes.',
      notificationTopic: 'major_updates',
      suppressesDuplicateManualOutreach: true,
    },
    {
      id: 't7_host_readiness',
      label: 'Host readiness',
      daysBefore: 7,
      purpose: 'Confirm headcount, access, host-provided items, and chef-side blockers.',
      clientAction: 'Confirm host responsibilities.',
      notificationTopic: 'logistics',
      suppressesDuplicateManualOutreach: true,
    },
    {
      id: 't3_final_confirmation',
      label: 'Final confirmation',
      daysBefore: 3,
      purpose: 'Lock client-safe details while keeping urgent safety issues open.',
      clientAction: 'Confirm final details.',
      notificationTopic: 'major_updates',
      suppressesDuplicateManualOutreach: true,
    },
    {
      id: 't1_service_eve',
      label: 'Service-eve reassurance',
      daysBefore: 1,
      purpose: 'Reassure the host and prevent last-minute silence.',
      clientAction: 'Review tomorrow details.',
      notificationTopic: 'logistics',
      suppressesDuplicateManualOutreach: true,
    },
    {
      id: 'post_event_followup',
      label: 'Post-event follow-up',
      daysBefore: -1,
      purpose: 'Collect memory, thanks, feedback, and next-booking context.',
      clientAction: 'Share feedback or memories.',
      notificationTopic: 'major_updates',
      suppressesDuplicateManualOutreach: false,
    },
  ]

  return schedule.map((gate, index) => {
    const nextGate = schedule[index + 1]
    const status =
      daysUntil < gate.daysBefore && (!nextGate || daysUntil >= nextGate.daysBefore)
        ? 'current'
        : daysUntil < gate.daysBefore
          ? 'complete'
          : daysUntil < gate.daysBefore - 7
            ? 'stale'
            : 'upcoming'

    return { ...gate, status }
  })
}

export function getStewardshipAddOnPrompts(input: {
  daysUntil: number
  guestCount: number
  outstandingBalanceCents: number
  menuApproved: boolean
  occasion?: string | null
}): StewardshipAddOnPrompt[] {
  const windowStatus = getStewardshipWindowStatus(input.daysUntil)
  const suppressedByWindow = windowStatus === 'locked'
  const celebration = /birthday|anniversary|celebration|wedding|proposal/i.test(
    input.occasion ?? ''
  )

  return [
    {
      id: 'wine_beverage_pairing',
      label: 'Wine or beverage pairing',
      priceStatus: 'quote_needed',
      eligible: input.daysUntil >= 14 && input.guestCount > 0,
      visibility: 'host_client',
      reason: 'Pairs naturally with a confirmed menu and known headcount.',
      createsTask: 'chef_review',
      suppressedByWindow,
    },
    {
      id: 'printed_menus',
      label: 'Printed menus',
      priceStatus: input.menuApproved ? 'priced' : 'chef_review',
      eligible: input.daysUntil >= 7 && input.menuApproved,
      visibility: 'host_client',
      reason: 'Best after menu approval and before final prep.',
      createsTask: 'invoice_or_ledger',
      suppressedByWindow,
    },
    {
      id: 'celebration_moment',
      label: 'Birthday or surprise moment',
      priceStatus: 'chef_review',
      eligible: celebration || input.daysUntil >= 30,
      visibility: 'host_chef',
      reason: 'Private celebration notes stay hidden from guests unless the host shares them.',
      createsTask: 'chef_review',
      suppressedByWindow: false,
    },
    {
      id: 'staffing_service_extension',
      label: 'Staffing or service extension',
      priceStatus: 'quote_needed',
      eligible: input.daysUntil >= 14 && input.guestCount >= 8,
      visibility: 'host_client',
      reason: 'Larger groups may need extra hands or a longer service window.',
      createsTask: 'invoice_or_ledger',
      suppressedByWindow,
    },
    {
      id: 'future_booking_hold',
      label: 'Hold a future dinner date',
      priceStatus: 'chef_review',
      eligible: input.outstandingBalanceCents === 0,
      visibility: 'host_client',
      reason: 'Relevant only after the current booking is financially clean.',
      createsTask: 'future_booking',
      suppressedByWindow: false,
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
    timelineGates: getStewardshipTimelineGates(remainingDays),
    changeWindows: getStewardshipChangeWindows(remainingDays),
    notificationPreferences: getDinnerCircleNotificationPreferences(),
    addOnPrompts: getStewardshipAddOnPrompts({
      daysUntil: remainingDays,
      guestCount: totalKnown,
      outstandingBalanceCents: input.outstandingBalanceCents,
      menuApproved,
      occasion: input.event.occasion,
    }),
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
