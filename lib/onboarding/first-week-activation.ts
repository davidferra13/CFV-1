import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export type FirstWeekActivationStepKey =
  | 'profile_ready'
  | 'lead_captured'
  | 'quote_sent'
  | 'event_created'
  | 'prep_started'
  | 'invoice_ready'

export type FirstWeekActivationStep = {
  key: FirstWeekActivationStepKey
  label: string
  description: string
  href: string
  done: boolean
  optional?: boolean
  evidenceLabel?: string | null
}

export type FirstWeekActivationProgress = {
  completedSteps: number
  totalSteps: number
  completedPhases: number
  totalPhases: number
  steps: FirstWeekActivationStep[]
  nextStep: FirstWeekActivationStep | null
  secondarySetup: {
    clientsImported: boolean
    clientsCount: number
    recipesAdded: boolean
    recipesCount: number
    loyaltyConfigured: boolean
    staffAdded: boolean
    staffCount: number
  }
}

export type FirstWeekActivationFacts = {
  profileBasicsReady: boolean
  serviceSetupReady: boolean
  inquiriesCount: number
  clientsCount: number
  sentQuotesCount: number
  eventsCount: number
  prepEvidenceCount: number
  invoiceArtifactCount: number
  recipesCount: number
  loyaltyConfigured: boolean
  staffCount: number
}

const STEP_COPY: Array<
  Omit<FirstWeekActivationStep, 'done' | 'evidenceLabel'> & {
    evidenceLabel: (facts: FirstWeekActivationFacts) => string | null
    isDone: (facts: FirstWeekActivationFacts) => boolean
  }
> = [
  {
    key: 'profile_ready',
    label: 'Finish profile and service setup',
    description: 'Save the chef identity and pricing or service surface needed to quote real work.',
    href: '/settings/my-profile',
    isDone: (facts) => facts.profileBasicsReady && facts.serviceSetupReady,
    evidenceLabel: (facts) => {
      if (!facts.profileBasicsReady) return 'Profile basics missing'
      if (!facts.serviceSetupReady) return 'No pricing or service setup found'
      return 'Profile and service setup ready'
    },
  },
  {
    key: 'lead_captured',
    label: 'Capture the first lead',
    description:
      'Record one real inquiry. A manually created client counts only as a fallback lead.',
    href: '/inquiries/new',
    isDone: (facts) => facts.inquiriesCount > 0 || facts.clientsCount > 0,
    evidenceLabel: (facts) => {
      if (facts.inquiriesCount > 0) {
        return facts.inquiriesCount === 1
          ? '1 inquiry captured'
          : `${facts.inquiriesCount} inquiries captured`
      }
      if (facts.clientsCount > 0) {
        return facts.clientsCount === 1
          ? '1 client fallback lead'
          : `${facts.clientsCount} client fallback leads`
      }
      return 'No inquiry or fallback client yet'
    },
  },
  {
    key: 'quote_sent',
    label: 'Send the first quote',
    description: 'Move at least one quote out of draft so the client has a real proposal.',
    href: '/quotes/new',
    isDone: (facts) => facts.sentQuotesCount > 0,
    evidenceLabel: (facts) =>
      facts.sentQuotesCount > 0
        ? facts.sentQuotesCount === 1
          ? '1 sent quote'
          : `${facts.sentQuotesCount} sent quotes`
        : 'No sent quote yet',
  },
  {
    key: 'event_created',
    label: 'Create the first event',
    description:
      'Turn the lead or quote into an event record with date, client, and guest context.',
    href: '/events/new',
    isDone: (facts) => facts.eventsCount > 0,
    evidenceLabel: (facts) =>
      facts.eventsCount > 0
        ? facts.eventsCount === 1
          ? '1 event created'
          : `${facts.eventsCount} events created`
        : 'No event created yet',
  },
  {
    key: 'prep_started',
    label: 'Start prep planning',
    description: 'Attach a menu or prep block so the event has operational prep evidence.',
    href: '/events',
    isDone: (facts) => facts.prepEvidenceCount > 0,
    evidenceLabel: (facts) =>
      facts.prepEvidenceCount > 0
        ? facts.prepEvidenceCount === 1
          ? '1 prep signal found'
          : `${facts.prepEvidenceCount} prep signals found`
        : 'No prep evidence yet',
  },
  {
    key: 'invoice_ready',
    label: 'Issue the invoice',
    description: 'Create a real billing artifact so the first booking loop reaches money.',
    href: '/finance/invoices',
    isDone: (facts) => facts.invoiceArtifactCount > 0,
    evidenceLabel: (facts) =>
      facts.invoiceArtifactCount > 0
        ? facts.invoiceArtifactCount === 1
          ? '1 invoice artifact'
          : `${facts.invoiceArtifactCount} invoice artifacts`
        : 'No invoice artifact yet',
  },
]

export function buildFirstWeekActivationProgress(
  facts: FirstWeekActivationFacts
): FirstWeekActivationProgress {
  const steps = STEP_COPY.map((step) => ({
    key: step.key,
    label: step.label,
    description: step.description,
    href: step.href,
    done: step.isDone(facts),
    optional: step.optional,
    evidenceLabel: step.evidenceLabel(facts),
  }))
  const completedSteps = steps.filter((step) => step.done).length

  return {
    completedSteps,
    totalSteps: steps.length,
    completedPhases: completedSteps,
    totalPhases: steps.length,
    steps,
    nextStep: steps.find((step) => !step.done) ?? null,
    secondarySetup: {
      clientsImported: facts.clientsCount > 0,
      clientsCount: facts.clientsCount,
      recipesAdded: facts.recipesCount > 0,
      recipesCount: facts.recipesCount,
      loyaltyConfigured: facts.loyaltyConfigured,
      staffAdded: facts.staffCount > 0,
      staffCount: facts.staffCount,
    },
  }
}

export function getEmptyFirstWeekActivationProgress(): FirstWeekActivationProgress {
  return buildFirstWeekActivationProgress({
    profileBasicsReady: false,
    serviceSetupReady: false,
    inquiriesCount: 0,
    clientsCount: 0,
    sentQuotesCount: 0,
    eventsCount: 0,
    prepEvidenceCount: 0,
    invoiceArtifactCount: 0,
    recipesCount: 0,
    loyaltyConfigured: false,
    staffCount: 0,
  })
}

function getCount(result: { count: number | null } | null | undefined): number {
  return result?.count ?? 0
}

export async function getFirstWeekActivationProgress(): Promise<FirstWeekActivationProgress> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const [
    chefRow,
    pricingConfig,
    serviceTypes,
    bookingEventTypes,
    inquiries,
    clients,
    sentQuotes,
    events,
    prepBlocks,
    eventMenus,
    prepStartedEvents,
    invoicedEvents,
    recurringInvoiceHistory,
    loyaltyConfig,
    recipes,
    staff,
  ] = await Promise.all([
    db
      .from('chefs')
      .select(
        'business_name, display_name, booking_enabled, booking_slug, booking_base_price_cents, booking_headline, booking_bio_short'
      )
      .eq('id', tenantId)
      .single(),
    db
      .from('chef_pricing_config')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId),
    db
      .from('chef_service_types')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    db
      .from('booking_event_types')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .eq('is_active', true),
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['sent', 'accepted', 'rejected', 'expired'])
      .is('deleted_at', null),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null),
    db
      .from('event_prep_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId),
    db
      .from('menus')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('event_id', 'is', null)
      .is('deleted_at', null),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('prep_started_at', 'is', null)
      .is('deleted_at', null),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('invoice_number', 'is', null)
      .is('deleted_at', null),
    db
      .from('recurring_invoice_history')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .in('status', ['sent', 'paid', 'overdue']),
    db.from('loyalty_config').select('is_active').eq('tenant_id', tenantId).maybeSingle(),
    db
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('archived', false),
    db.from('staff_members').select('id', { count: 'exact', head: true }).eq('chef_id', tenantId),
  ])

  const chef = chefRow.data
  const profileBasicsReady = Boolean(chef?.business_name && chef?.display_name)
  const bookingSurfaceReady = Boolean(
    chef?.booking_enabled &&
    chef?.booking_slug &&
    (chef?.booking_base_price_cents || chef?.booking_headline || chef?.booking_bio_short)
  )
  const serviceSetupReady =
    getCount(pricingConfig) > 0 ||
    getCount(serviceTypes) > 0 ||
    getCount(bookingEventTypes) > 0 ||
    bookingSurfaceReady

  return buildFirstWeekActivationProgress({
    profileBasicsReady,
    serviceSetupReady,
    inquiriesCount: getCount(inquiries),
    clientsCount: getCount(clients),
    sentQuotesCount: getCount(sentQuotes),
    eventsCount: getCount(events),
    prepEvidenceCount: getCount(prepBlocks) + getCount(eventMenus) + getCount(prepStartedEvents),
    invoiceArtifactCount: getCount(invoicedEvents) + getCount(recurringInvoiceHistory),
    recipesCount: getCount(recipes),
    loyaltyConfigured: loyaltyConfig.data !== null,
    staffCount: getCount(staff),
  })
}
