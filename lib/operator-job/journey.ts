import { buildQuoteDraftHref } from '@/lib/quotes/quote-prefill'

export type OperatorJobStepKey =
  | 'inquiry'
  | 'client'
  | 'quote_menu'
  | 'booking'
  | 'event_plan'
  | 'production'
  | 'service'
  | 'payment'
  | 'follow_up'

export type OperatorJobStepStatus = 'complete' | 'current' | 'waiting' | 'blocked'

export type OperatorJobStep = {
  key: OperatorJobStepKey
  label: string
  status: OperatorJobStepStatus
  summary: string
  href: string
  actionLabel: string
}

export type OperatorJobRecord = {
  inquiryId: string | null
  clientId: string | null
  quoteId: string | null
  menuSourceId: string | null
  menuId: string | null
  eventId: string | null
}

export type ChefOperatorJobInput = {
  title?: string | null
  clientName?: string | null
  inquiry?: {
    id: string
    status: string
    clientId?: string | null
    convertedEventId?: string | null
  } | null
  client?: {
    id: string
  } | null
  quote?: {
    id: string
    status: string
    sourceMenuId?: string | null
  } | null
  menuSourceId?: string | null
  menu?: {
    id: string
  } | null
  event?: {
    id: string
    status: string
    clientId?: string | null
    menuId?: string | null
    timelineReady?: boolean | null
    groceryListReady?: boolean | null
    prepListReady?: boolean | null
    packingListReady?: boolean | null
    serviceStartedAt?: string | null
    serviceCompletedAt?: string | null
    paymentStatus?: string | null
    outstandingBalanceCents?: number | null
    financialAvailable?: boolean
    financiallyClosed?: boolean | null
    followUpSent?: boolean | null
  } | null
}

export type ChefOperatorJobJourney = {
  connectionKey: string
  title: string
  clientName: string | null
  record: OperatorJobRecord
  currentStep: OperatorJobStep
  steps: OperatorJobStep[]
  complete: boolean
}

const QUOTE_ACCEPTED_STATUSES = new Set(['accepted'])
const PAYMENT_COMPLETE_STATUSES = new Set(['paid', 'settled'])
const SERVICE_COMPLETE_STATUSES = new Set(['completed'])

function quoteMenuHref(input: ChefOperatorJobInput, clientId: string | null) {
  if (input.quote?.id) return `/quotes/${input.quote.id}`
  if (!input.inquiry?.id) return '/inquiries/new'

  return buildQuoteDraftHref({
    client_id: clientId ?? undefined,
    inquiry_id: input.inquiry.id,
    source: 'inquiry',
  })
}

function productionAction(eventId: string, event: NonNullable<ChefOperatorJobInput['event']>) {
  if (!event.groceryListReady) {
    return {
      href: `/events/${eventId}/grocery-run`,
      label: 'Open shopping',
      summary: 'Shopping is the next unresolved production task.',
    }
  }
  if (!event.prepListReady) {
    return {
      href: `/events/${eventId}/prep-plan`,
      label: 'Open prep plan',
      summary: 'Prep is the next unresolved production task.',
    }
  }
  return {
    href: `/events/${eventId}/pack`,
    label: 'Open packing',
    summary: 'Packing is the next unresolved production task.',
  }
}

function waitingStep(
  key: OperatorJobStepKey,
  label: string,
  href: string,
  actionLabel: string,
  summary: string
): OperatorJobStep {
  return { key, label, status: 'waiting', href, actionLabel, summary }
}

export function buildChefOperatorJob(input: ChefOperatorJobInput): ChefOperatorJobJourney {
  const inquiryId = input.inquiry?.id ?? null
  const clientId = input.client?.id ?? input.inquiry?.clientId ?? input.event?.clientId ?? null
  const eventId = input.event?.id ?? input.inquiry?.convertedEventId ?? null
  const quoteId = input.quote?.id ?? null
  const menuSourceId = input.menuSourceId ?? input.quote?.sourceMenuId ?? null
  const menuId = input.menu?.id ?? input.event?.menuId ?? null

  const record: OperatorJobRecord = {
    inquiryId,
    clientId,
    quoteId,
    menuSourceId,
    menuId,
    eventId,
  }

  if (!input.inquiry && !input.event) {
    const steps: OperatorJobStep[] = [
      {
        key: 'inquiry',
        label: 'Inquiry',
        status: 'current',
        summary: 'Start the job with one client request.',
        href: '/inquiries/new',
        actionLabel: 'Capture first inquiry',
      },
      waitingStep('client', 'Client', '/clients/new', 'Create client', 'Client identity follows the inquiry.'),
      waitingStep('quote_menu', 'Quote + menu', '/quotes/new', 'Build quote', 'Pricing and menu follow the client record.'),
      waitingStep('booking', 'Booking', '/events/new', 'Create booking', 'Booking begins after the proposal is ready.'),
      waitingStep('event_plan', 'Event plan', '/events', 'Plan event', 'Timing and logistics follow the booking.'),
      waitingStep('production', 'Shop + prep + pack', '/events', 'Open production', 'Production work follows the event plan.'),
      waitingStep('service', 'Service', '/events', 'Run service', 'Service opens when production is ready.'),
      waitingStep('payment', 'Payment', '/payments', 'Review payment', 'Final payment stays attached to the job.'),
      waitingStep('follow_up', 'Follow-up', '/clients/communication/follow-ups', 'Follow up', 'Close the client loop after service.'),
    ]

    return {
      connectionKey: 'new-chef:first-job',
      title: input.title?.trim() || 'First chef job',
      clientName: input.clientName?.trim() || null,
      record,
      currentStep: steps[0],
      steps,
      complete: false,
    }
  }

  const event = input.event ?? null
  const quoteAccepted = Boolean(input.quote && QUOTE_ACCEPTED_STATUSES.has(input.quote.status))
  const proposalMenuSelected = Boolean(menuSourceId || menuId)
  const quoteMenuComplete = Boolean(eventId || (quoteAccepted && proposalMenuSelected))
  const bookingComplete = Boolean(eventId)
  const eventPlanComplete = Boolean(event && event.timelineReady)
  const productionComplete = Boolean(
    event && event.groceryListReady && event.prepListReady && event.packingListReady
  )
  const serviceComplete = Boolean(
    event &&
      (event.serviceCompletedAt || SERVICE_COMPLETE_STATUSES.has(event.status))
  )
  const paymentKnown = event?.financialAvailable !== false
  const paymentComplete = Boolean(
    event &&
      paymentKnown &&
      (event.financiallyClosed ||
        PAYMENT_COMPLETE_STATUSES.has(event.paymentStatus ?? '') ||
        (typeof event.outstandingBalanceCents === 'number' && event.outstandingBalanceCents === 0))
  )
  const followUpComplete = Boolean(event && event.followUpSent)

  const eventHref = eventId ? `/events/${eventId}` : inquiryId ? `/inquiries/${inquiryId}` : '/events'
  const bookingHref = inquiryId ? `/inquiries/${inquiryId}` : eventHref
  const proposalHref =
    eventId && menuId ? `/menus/${menuId}` : input.inquiry ? quoteMenuHref(input, clientId) : eventHref
  const productionNext = eventId && event ? productionAction(eventId, event) : null

  const stepDefs: Array<Omit<OperatorJobStep, 'status'> & { complete: boolean; blocked?: boolean }> = [
    {
      key: 'inquiry',
      label: 'Inquiry',
      complete: true,
      summary: input.inquiry
        ? 'The client request is captured in ChefFlow.'
        : 'This job was created directly as an event, so the event is the canonical starting record.',
      href: input.inquiry ? `/inquiries/${input.inquiry.id}` : eventHref,
      actionLabel: input.inquiry ? 'Open inquiry' : 'Open event',
    },
    {
      key: 'client',
      label: 'Client',
      complete: Boolean(clientId),
      summary: clientId
        ? 'The job is attached to one client record.'
        : 'Link or create the client once. Preferences should live there from now on.',
      href: clientId
        ? `/clients/${clientId}`
        : input.inquiry
          ? `/inquiries/${input.inquiry.id}`
          : eventHref,
      actionLabel: clientId ? 'Open client' : 'Link client',
    },
    {
      key: 'quote_menu',
      label: 'Quote + menu',
      complete: quoteMenuComplete,
      summary: quoteMenuComplete
        ? eventId && menuId
          ? 'The accepted proposal menu is now the operational event menu.'
          : 'The accepted proposal and selected menu source are connected to this job.'
        : quoteAccepted
          ? 'The quote is accepted; select the menu source before booking.'
          : 'Build the proposal and menu from the same client and inquiry facts.',
      href: proposalHref,
      actionLabel: input.quote?.id ? 'Open quote + menu' : 'Build quote + menu',
    },
    {
      key: 'booking',
      label: 'Booking',
      complete: bookingComplete,
      summary: bookingComplete
        ? 'The inquiry is connected to an event record.'
        : 'Convert the approved inquiry without re-entering the client or event facts.',
      href: bookingHref,
      actionLabel: bookingComplete ? 'Open booking' : 'Create booking',
    },
    {
      key: 'event_plan',
      label: 'Event plan',
      complete: eventPlanComplete,
      summary: eventPlanComplete
        ? 'The event timeline is ready.'
        : 'Set the run of show from the connected event record.',
      href: eventId ? `/events/${eventId}/schedule` : eventHref,
      actionLabel: eventPlanComplete ? 'Open timeline' : 'Plan event',
    },
    {
      key: 'production',
      label: 'Shop + prep + pack',
      complete: productionComplete,
      summary: productionComplete
        ? 'Shopping, prep, and packing are ready on the event.'
        : productionNext?.summary || 'Production opens from the event plan.',
      href: productionNext?.href || eventHref,
      actionLabel: productionComplete ? 'Review production' : productionNext?.label || 'Open production',
    },
    {
      key: 'service',
      label: 'Service',
      complete: serviceComplete,
      summary: serviceComplete
        ? 'Service completion is recorded on the event.'
        : event?.status === 'in_progress' || event?.serviceStartedAt
          ? 'Service is live. Run the event from the service workspace.'
          : 'Service becomes the next task after production is ready.',
      href: eventId ? `/events/${eventId}/service` : eventHref,
      actionLabel: serviceComplete ? 'Review service' : 'Run service',
    },
    {
      key: 'payment',
      label: 'Payment',
      complete: paymentComplete,
      blocked: Boolean(event && !paymentKnown),
      summary: paymentComplete
        ? 'Payment is current on the event ledger.'
        : event && !paymentKnown
          ? 'Payment status could not be verified. Do not assume the balance is clear.'
          : 'Collect or record the remaining payment on the event.',
      href: eventId ? `/events/${eventId}/billing` : eventHref,
      actionLabel: paymentComplete ? 'Review payment' : 'Record final payment',
    },
    {
      key: 'follow_up',
      label: 'Follow-up',
      complete: followUpComplete,
      summary: followUpComplete
        ? 'The client follow-up is recorded on the event.'
        : 'Send the thank-you and keep the relationship history on this job.',
      href: eventId ? `/events/${eventId}/follow-up` : eventHref,
      actionLabel: followUpComplete ? 'Review follow-up' : 'Send follow-up',
    },
  ]

  const firstIncomplete = stepDefs.findIndex((step) => !step.complete)
  const steps = stepDefs.map((step, index): OperatorJobStep => {
    if (step.complete) return { ...step, status: 'complete' }
    if (index === firstIncomplete) {
      return { ...step, status: step.blocked ? 'blocked' : 'current' }
    }
    return { ...step, status: 'waiting' }
  })
  const currentStep =
    steps.find((step) => step.status === 'current' || step.status === 'blocked') ??
    steps[steps.length - 1]

  return {
    connectionKey: eventId
      ? `event:${eventId}`
      : input.inquiry
        ? `inquiry:${input.inquiry.id}`
        : 'chef-job:unlinked',
    title: input.title?.trim() || 'Chef job',
    clientName: input.clientName?.trim() || null,
    record,
    currentStep,
    steps,
    complete: firstIncomplete === -1,
  }
}
