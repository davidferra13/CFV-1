export type EventSpineSeverity = 'ok' | 'info' | 'waiting' | 'attention' | 'blocked'

export type EventSpineLane = {
  key: string
  label: string
  owner: 'Chef' | 'Client' | 'System' | 'Chef and client'
  status: string
  severity: EventSpineSeverity
  nextStep: string
  href?: string
  dueLabel?: string
  missing?: string[]
}

export type EventSpineAction = {
  label: string
  href: string
  owner: 'Chef' | 'Client' | 'System' | 'Chef and client'
  reason: string
}

export type EventOperatingSpine = {
  mode: 'triage' | 'planning' | 'reviewing'
  nextAction: EventSpineAction
  lanes: EventSpineLane[]
  missingDetails: string[]
  readinessLabel: string
}

type EventRecord = {
  id: string
  status: string
  event_date?: string | Date | null
  serve_time?: string | null
  guest_count?: number | null
  client_id?: string | null
  client?: { full_name?: string | null; email?: string | null } | null
  inquiry_id?: string | null
  location_address?: string | null
  location_city?: string | null
  location_state?: string | null
  location_zip?: string | null
  quoted_price_cents?: number | null
  total_price_cents?: number | null
  deposit_amount_cents?: number | null
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
  special_requests?: string | null
  menu_approval_status?: string | null
  menu_modified_after_approval?: boolean | null
  follow_up_sent?: boolean | null
}

type GuestRecord = {
  dietary_restrictions?: string[] | null
  allergies?: string[] | null
}

type ChefSpineInput = {
  event: EventRecord
  eventMenus?: unknown[] | string[] | null
  guestList?: GuestRecord[] | null
  rsvpSummary?: Record<string, unknown> | null
  totalPaidCents?: number | null
  totalRefundedCents?: number | null
  outstandingBalanceCents?: number | null
  financialAvailable?: boolean
  messagesCount?: number
  hasActiveShare?: boolean
  prepTimelineReady?: boolean
  prepBlocksCount?: number
  parAlertCount?: number
  packingConfirmedCount?: number
  hasAAR?: boolean
}

type ClientSpineInput = {
  event: EventRecord & {
    hasContract?: boolean
    contractStatus?: string | null
    contractSignedAt?: string | null
    hasReview?: boolean
    menus?: unknown[] | null
  }
  currentAction?: {
    actionLabel?: string | null
    actionHref?: string | null
    key?: string | null
  } | null
  totalPaidCents?: number | null
  outstandingBalanceCents?: number | null
  financialAvailable?: boolean
  guestCountChangePending?: boolean
  guestsCount?: number
  hasActiveShare?: boolean
}

function countItems(value: unknown[] | string[] | null | undefined) {
  return Array.isArray(value) ? value.length : 0
}

function hasMeaningfulText(value: string | null | undefined) {
  const text = value?.trim()
  if (!text) return false
  return !['tbd', 'unknown', 'not set', 'n/a'].includes(text.toLowerCase())
}

function hasLocation(event: EventRecord) {
  return [
    event.location_address,
    event.location_city,
    event.location_state,
    event.location_zip,
  ].some(hasMeaningfulText)
}

function hasDietaryTruth(event: EventRecord, guestList?: GuestRecord[] | null) {
  const eventDietary =
    countItems(event.dietary_restrictions ?? []) +
    countItems(event.allergies ?? []) +
    (hasMeaningfulText(event.special_requests) ? 1 : 0)
  const guestDietary = (guestList ?? []).some(
    (guest) =>
      countItems(guest.dietary_restrictions ?? []) > 0 || countItems(guest.allergies ?? []) > 0
  )
  return eventDietary > 0 || guestDietary
}

export function getEventMissingDetails(event: EventRecord) {
  const missing: string[] = []
  if (!event.client_id) missing.push('client')
  if (!hasLocation(event)) missing.push('location')
  if (!hasMeaningfulText(event.serve_time ?? null)) missing.push('serve time')
  if (!event.guest_count || event.guest_count <= 1) missing.push('confirmed guest count')
  if (!event.quoted_price_cents && !event.total_price_cents) missing.push('price')
  return missing
}

function eventPath(eventId: string, tab: 'overview' | 'money' | 'prep' | 'ops' | 'wrap') {
  return `/events/${eventId}?tab=${tab}`
}

function eventTotalCents(event: EventRecord) {
  return event.total_price_cents ?? event.quoted_price_cents ?? 0
}

function menuStatusLabel(event: EventRecord, hasMenu: boolean) {
  if (!hasMenu) return 'No menu selected'
  if (event.menu_modified_after_approval) return 'Menu changed after approval'
  switch (event.menu_approval_status) {
    case 'approved':
      return 'Menu approved'
    case 'sent':
      return 'Menu awaiting client review'
    case 'revision_requested':
      return 'Menu revision requested'
    default:
      return 'Menu selected'
  }
}

function menuSeverity(event: EventRecord, hasMenu: boolean): EventSpineSeverity {
  if (!hasMenu) return 'blocked'
  if (event.menu_modified_after_approval || event.menu_approval_status === 'revision_requested') {
    return 'attention'
  }
  if (event.menu_approval_status === 'sent') return 'waiting'
  if (event.menu_approval_status === 'approved') return 'ok'
  return 'info'
}

function statusOwner(status: string): EventSpineLane['owner'] {
  if (status === 'proposed' || status === 'accepted') return 'Client'
  if (status === 'cancelled') return 'System'
  return 'Chef'
}

export function buildChefEventOperatingSpine(input: ChefSpineInput): EventOperatingSpine {
  const event = input.event
  const missingDetails = getEventMissingDetails(event)
  const hasMenu = countItems(input.eventMenus ?? []) > 0
  const totalPaid = input.totalPaidCents ?? 0
  const totalRefunded = input.totalRefundedCents ?? 0
  const outstanding = input.outstandingBalanceCents ?? 0
  const total = eventTotalCents(event)
  const deposit = event.deposit_amount_cents ?? 0
  const depositShortfall = deposit > 0 && totalPaid < deposit
  const dietaryKnown = hasDietaryTruth(event, input.guestList)
  const prepReady = Boolean(input.prepTimelineReady || (input.prepBlocksCount ?? 0) > 0)
  const parAlertCount = input.parAlertCount ?? 0
  const packingConfirmedCount = input.packingConfirmedCount ?? 0
  const hasParAlerts = parAlertCount > 0
  const messagesCount = input.messagesCount ?? 0
  const cancelled = event.status === 'cancelled'
  const completed = event.status === 'completed'

  let nextAction: EventSpineAction = {
    label: 'Review event workspace',
    href: eventPath(event.id, 'overview'),
    owner: 'Chef',
    reason: 'No blocker is currently higher priority.',
  }

  if (cancelled && totalPaid > totalRefunded) {
    nextAction = {
      label: 'Review refund',
      href: eventPath(event.id, 'money'),
      owner: 'Chef',
      reason: 'The event is cancelled and has recorded payments.',
    }
  } else if (cancelled) {
    nextAction = {
      label: 'Review cancellation',
      href: eventPath(event.id, 'wrap'),
      owner: 'Chef',
      reason: 'The event is cancelled, so active planning actions are closed.',
    }
  } else if (missingDetails.length > 0 && event.status === 'draft') {
    nextAction = {
      label: 'Complete event details',
      href: `/events/${event.id}/edit`,
      owner: 'Chef',
      reason: `Missing ${missingDetails.slice(0, 3).join(', ')}.`,
    }
  } else if (event.status === 'proposed') {
    nextAction = {
      label: 'Track client decision',
      href: eventPath(event.id, 'overview'),
      owner: 'Client',
      reason: 'The proposal is with the client.',
    }
  } else if (event.status === 'accepted' && (depositShortfall || outstanding > 0)) {
    nextAction = {
      label: 'Record payment',
      href: eventPath(event.id, 'money'),
      owner: 'Client',
      reason: depositShortfall ? 'Deposit is still short.' : 'Balance is still due.',
    }
  } else if (!hasMenu && !['draft', 'completed'].includes(event.status)) {
    nextAction = {
      label: 'Select menu',
      href: eventPath(event.id, 'money'),
      owner: 'Chef',
      reason: 'Menu selection is required before prep and grocery planning are reliable.',
    }
  } else if (!dietaryKnown && ['accepted', 'paid', 'confirmed'].includes(event.status)) {
    nextAction = {
      label: 'Collect dietary details',
      href: eventPath(event.id, 'overview'),
      owner: 'Client',
      reason: 'Dietary and allergy details are not yet recorded.',
    }
  } else if (
    event.menu_modified_after_approval ||
    event.menu_approval_status === 'revision_requested'
  ) {
    nextAction = {
      label: 'Resolve menu change',
      href: eventPath(event.id, 'money'),
      owner: 'Chef',
      reason: 'Menu approval no longer reflects the current menu.',
    }
  } else if (event.menu_approval_status === 'sent') {
    nextAction = {
      label: 'Follow up on menu approval',
      href: eventPath(event.id, 'overview'),
      owner: 'Client',
      reason: 'The client still needs to review the menu.',
    }
  } else if (!prepReady && ['paid', 'confirmed'].includes(event.status)) {
    nextAction = {
      label: 'Build prep plan',
      href: eventPath(event.id, 'prep'),
      owner: 'Chef',
      reason: 'Prep work is not scheduled yet.',
    }
  } else if (hasParAlerts && ['paid', 'confirmed', 'in_progress'].includes(event.status)) {
    nextAction = {
      label: 'Check inventory',
      href: '/inventory',
      owner: 'Chef',
      reason: 'One or more event items are below par.',
    }
  } else if (event.status === 'in_progress') {
    nextAction = {
      label: 'Run service ops',
      href: eventPath(event.id, 'ops'),
      owner: 'Chef',
      reason: 'The event is in progress.',
    }
  } else if (completed && !event.follow_up_sent) {
    nextAction = {
      label: 'Send follow-up',
      href: eventPath(event.id, 'wrap'),
      owner: 'Chef',
      reason: 'The event is complete and follow-up has not been sent.',
    }
  } else if (completed && !input.hasAAR) {
    nextAction = {
      label: 'Complete debrief',
      href: eventPath(event.id, 'wrap'),
      owner: 'Chef',
      reason: 'Post-event learning is still open.',
    }
  }

  const lanes: EventSpineLane[] = [
    {
      key: 'intake',
      label: 'Intake',
      owner: event.inquiry_id ? 'System' : 'Chef',
      status: event.inquiry_id ? 'Inquiry linked' : 'Direct event record',
      severity: event.client_id ? 'ok' : 'blocked',
      nextStep: event.client_id ? event.client?.full_name || 'Client attached' : 'Attach a client',
      href: event.client_id ? `/clients/${event.client_id}` : `/events/${event.id}/edit`,
      missing: event.client_id ? [] : ['client'],
    },
    {
      key: 'booking',
      label: 'Booking',
      owner: statusOwner(event.status),
      status: event.status.replace(/_/g, ' '),
      severity:
        event.status === 'cancelled' ? 'blocked' : missingDetails.length > 0 ? 'attention' : 'ok',
      nextStep:
        missingDetails.length > 0
          ? `Fill ${missingDetails.slice(0, 2).join(', ')}`
          : 'Core details are present',
      href:
        missingDetails.length > 0 ? `/events/${event.id}/edit` : eventPath(event.id, 'overview'),
      dueLabel: hasMeaningfulText(String(event.event_date ?? ''))
        ? 'Event date set'
        : 'Date needed',
      missing: missingDetails,
    },
    {
      key: 'menu',
      label: 'Menu and dietary',
      owner: event.menu_approval_status === 'sent' || !dietaryKnown ? 'Client' : 'Chef',
      status: menuStatusLabel(event, hasMenu),
      severity: !dietaryKnown ? 'attention' : menuSeverity(event, hasMenu),
      nextStep: dietaryKnown ? 'Dietary details recorded' : 'Collect dietary and allergy details',
      href: hasMenu ? eventPath(event.id, 'money') : eventPath(event.id, 'money'),
      missing: dietaryKnown ? [] : ['dietary and allergy details'],
    },
    {
      key: 'prep',
      label: 'Prep and stock',
      owner: 'Chef',
      status: prepReady ? 'Prep plan started' : hasMenu ? 'Prep not scheduled' : 'Waiting on menu',
      severity: hasParAlerts ? 'attention' : prepReady ? 'ok' : hasMenu ? 'attention' : 'waiting',
      nextStep: hasParAlerts
        ? `${parAlertCount} par alert${parAlertCount === 1 ? '' : 's'}`
        : prepReady
          ? `${packingConfirmedCount} packed item${packingConfirmedCount === 1 ? '' : 's'}`
          : 'Open prep timeline',
      href: hasParAlerts ? '/inventory' : eventPath(event.id, 'prep'),
    },
    {
      key: 'finance',
      label: 'Finance',
      owner: outstanding > 0 ? 'Client' : 'Chef',
      status:
        input.financialAvailable === false
          ? 'Payment status unavailable'
          : total <= 0
            ? 'Price not set'
            : outstanding > 0
              ? 'Balance due'
              : 'Paid or no balance due',
      severity:
        input.financialAvailable === false
          ? 'blocked'
          : total <= 0 || outstanding > 0 || depositShortfall
            ? 'attention'
            : 'ok',
      nextStep:
        input.financialAvailable === false
          ? 'Refresh financial summary'
          : outstanding > 0
            ? 'Collect or record payment'
            : 'Keep ledger current',
      href: eventPath(event.id, 'money'),
      missing: total <= 0 ? ['price'] : [],
    },
    {
      key: 'communication',
      label: 'Communication',
      owner: 'Chef and client',
      status:
        completed && event.follow_up_sent
          ? 'Follow-up sent'
          : completed
            ? 'Follow-up needed'
            : input.hasActiveShare
              ? 'Client portal active'
              : 'Portal link not active',
      severity: completed && !event.follow_up_sent ? 'attention' : 'info',
      nextStep:
        messagesCount > 0
          ? `${messagesCount} message${messagesCount === 1 ? '' : 's'} in context`
          : 'Log the next client touchpoint',
      href: completed ? eventPath(event.id, 'wrap') : eventPath(event.id, 'overview'),
    },
  ]

  const blockedCount = lanes.filter((lane) => lane.severity === 'blocked').length
  const attentionCount = lanes.filter((lane) => lane.severity === 'attention').length
  const readinessLabel =
    blockedCount > 0
      ? `${blockedCount} blocker${blockedCount === 1 ? '' : 's'}`
      : attentionCount > 0
        ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention`
        : 'Ready for next step'

  return {
    mode: completed || cancelled ? 'reviewing' : 'triage',
    nextAction,
    lanes,
    missingDetails,
    readinessLabel,
  }
}

export function buildClientEventProgress(input: ClientSpineInput): EventOperatingSpine {
  const event = input.event
  const missingDetails = getEventMissingDetails(event).filter((item) => item !== 'price')
  const outstanding = input.outstandingBalanceCents ?? 0
  const hasMenu = countItems(event.menus ?? []) > 0
  const hasDietary = hasDietaryTruth(event)
  const currentHref = input.currentAction?.actionHref ?? `/my-events/${event.id}`
  const currentLabel = input.currentAction?.actionLabel ?? 'Review event'

  let nextAction: EventSpineAction = {
    label: currentLabel,
    href: currentHref,
    owner: 'Client',
    reason: 'This is the next visible client step.',
  }

  if (event.status === 'cancelled') {
    nextAction = {
      label: 'Review cancelled event',
      href: `/my-events/${event.id}`,
      owner: 'Client',
      reason: 'The booking is cancelled.',
    }
  } else if (event.status === 'completed' && !event.hasReview) {
    nextAction = {
      label: 'Leave feedback',
      href: `/my-events/${event.id}#review`,
      owner: 'Client',
      reason: 'The event is complete and feedback is still open.',
    }
  } else if (input.currentAction?.actionHref) {
    nextAction = {
      label: currentLabel,
      href: currentHref,
      owner: 'Client',
      reason: 'ChefFlow has an active booking step for you.',
    }
  } else if (!hasDietary && !['draft', 'cancelled', 'completed'].includes(event.status)) {
    nextAction = {
      label: 'Share dietary details',
      href: `/my-events/${event.id}/choose-menu`,
      owner: 'Client',
      reason: 'Dietary needs are not yet recorded.',
    }
  }

  const lanes: EventSpineLane[] = [
    {
      key: 'details',
      label: 'Event details',
      owner: 'Chef and client',
      status: missingDetails.length > 0 ? 'Details needed' : 'Core details set',
      severity: missingDetails.length > 0 ? 'attention' : 'ok',
      nextStep:
        missingDetails.length > 0
          ? `Confirm ${missingDetails.slice(0, 2).join(', ')}`
          : 'Date, location, and guest count are on file',
      missing: missingDetails,
    },
    {
      key: 'approval',
      label: 'Proposal and agreement',
      owner: event.status === 'proposed' ? 'Client' : 'Chef and client',
      status:
        event.status === 'proposed'
          ? 'Proposal ready'
          : event.hasContract && !event.contractSignedAt
            ? 'Agreement in progress'
            : 'Approved path active',
      severity:
        event.status === 'proposed' || (event.hasContract && !event.contractSignedAt)
          ? 'attention'
          : 'ok',
      nextStep:
        event.status === 'proposed'
          ? 'Review and accept the proposal'
          : event.hasContract && !event.contractSignedAt
            ? 'Finish agreement before payment'
            : 'Proposal step is complete',
      href: event.status === 'proposed' ? `/my-events/${event.id}/proposal` : undefined,
    },
    {
      key: 'menu',
      label: 'Menu',
      owner: event.menu_approval_status === 'sent' ? 'Client' : 'Chef',
      status: menuStatusLabel(event, hasMenu),
      severity: !hasDietary ? 'attention' : menuSeverity(event, hasMenu),
      nextStep: !hasDietary
        ? 'Share preferences and dietary needs'
        : event.menu_approval_status === 'sent'
          ? 'Review the menu'
          : 'Chef is keeping menu work current',
      href:
        event.menu_approval_status === 'sent'
          ? `/my-events/${event.id}/approve-menu`
          : `/my-events/${event.id}/choose-menu`,
      missing: hasDietary ? [] : ['dietary and allergy details'],
    },
    {
      key: 'payment',
      label: 'Payment',
      owner: outstanding > 0 ? 'Client' : 'Chef',
      status:
        input.financialAvailable === false
          ? 'Payment status unavailable'
          : outstanding > 0
            ? 'Payment due'
            : 'No balance due',
      severity:
        input.financialAvailable === false ? 'blocked' : outstanding > 0 ? 'attention' : 'ok',
      nextStep:
        input.financialAvailable === false
          ? 'Refresh payment status'
          : outstanding > 0
            ? 'Pay remaining balance'
            : 'Payment obligations are current',
      href: outstanding > 0 ? `/my-events/${event.id}/pay` : undefined,
    },
    {
      key: 'guests',
      label: 'Guests and messages',
      owner: 'Client',
      status: input.hasActiveShare ? 'Guest link active' : 'Guest link not active',
      severity: input.hasActiveShare || event.status === 'proposed' ? 'info' : 'attention',
      nextStep:
        (input.guestsCount ?? 0) > 0
          ? `${input.guestsCount} guest${input.guestsCount === 1 ? '' : 's'} in the workspace`
          : 'Invite guests or message your chef when ready',
      href: `/my-events/${event.id}`,
    },
  ]

  const blockedCount = lanes.filter((lane) => lane.severity === 'blocked').length
  const attentionCount = lanes.filter((lane) => lane.severity === 'attention').length
  const readinessLabel =
    blockedCount > 0
      ? `${blockedCount} blocker${blockedCount === 1 ? '' : 's'}`
      : attentionCount > 0
        ? `${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention`
        : 'Booking is current'

  return {
    mode: event.status === 'completed' || event.status === 'cancelled' ? 'reviewing' : 'planning',
    nextAction,
    lanes,
    missingDetails,
    readinessLabel,
  }
}
