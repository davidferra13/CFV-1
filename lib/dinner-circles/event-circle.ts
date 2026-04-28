import type { EventTicket, EventTicketSummary, EventTicketType } from '@/lib/tickets/types'
import { createServerClient } from '@/lib/db/server'
import { buildEventDefaultLayer } from '@/lib/events/default-behaviors'
import type {
  DinnerCircleAdaptiveSnapshot,
  DinnerCircleConfig,
  DinnerCircleIngredientStatus,
  DinnerCircleSnapshot,
  DinnerCircleSourcingEvent,
  DinnerCircleSubstitutionProposal,
  DinnerCircleTheme,
  PopUpCloseoutItem,
  PopUpConfig,
  PopUpLifecycleStage,
  PopUpLocationProfile,
  PopUpMenuItemPlan,
  PopUpOrderSource,
} from './types'

const DEFAULT_THEME: DinnerCircleTheme = {
  palette: 'field',
  accentColor: '#2f855a',
  backgroundMode: 'plain',
}

const DEFAULT_LAYOUT_ZONES = [
  { id: 'kitchen', label: 'Kitchen', kind: 'kitchen' as const, x: 6, y: 8, w: 28, h: 24 },
  { id: 'prep', label: 'Prep', kind: 'prep' as const, x: 40, y: 8, w: 24, h: 18 },
  { id: 'service', label: 'Service', kind: 'service' as const, x: 68, y: 28, w: 22, h: 18 },
  { id: 'guest', label: 'Guest Area', kind: 'guest' as const, x: 22, y: 58, w: 56, h: 28 },
  { id: 'path', label: 'Flow Path', kind: 'path' as const, x: 34, y: 34, w: 34, h: 8 },
]

const VALID_INGREDIENT_STATUSES = new Set<DinnerCircleIngredientStatus>([
  'confirmed',
  'flexible',
  'pending',
  'substitution_pending',
  'unavailable',
])

const VALID_SUBSTITUTION_PROPOSAL_STATUSES = new Set<DinnerCircleSubstitutionProposal['status']>([
  'proposed',
  'acknowledged',
  'flagged',
])

function normalizeIngredientStatus(value: unknown): DinnerCircleIngredientStatus {
  if (typeof value !== 'string') return 'pending'
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  return VALID_INGREDIENT_STATUSES.has(normalized as DinnerCircleIngredientStatus)
    ? (normalized as DinnerCircleIngredientStatus)
    : 'pending'
}

function positiveCents(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value)
}

const VALID_POP_UP_STAGES = new Set<PopUpLifecycleStage>([
  'concept',
  'menu_build',
  'orders_open',
  'production_lock',
  'day_of',
  'closed',
  'analyzed',
])

const VALID_POP_UP_ORDER_SOURCES = new Set<PopUpOrderSource>([
  'online',
  'dm',
  'comment',
  'word_of_mouth',
  'form',
  'walkup',
  'comp',
])

const VALID_PRODUCTION_STATUSES = new Set<NonNullable<PopUpMenuItemPlan['productionStatus']>>([
  'not_started',
  'prep_started',
  'batched',
  'packed',
  'ready',
])

const VALID_LOCATION_KINDS = new Set<PopUpLocationProfile['locationKind']>([
  'cafe_collab',
  'standalone_drop',
  'private_event',
  'market',
  'other',
])

const DEFAULT_POP_UP_LOCATION_PROFILE: PopUpLocationProfile = {
  locationKind: 'cafe_collab',
  equipmentAvailable: [],
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : []
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optionalStringOrNull(value: unknown): string | null {
  if (value === null) return null
  return optionalString(value) ?? null
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback
}

function optionalNonNegativeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null
}

function optionalPercent(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.min(100, parsed) : null
}

function optionalCostDeltaCents(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : null
}

function optionalPriceFlexibilityPercent(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(50, parsed)) : undefined
}

function normalizeSourcingEvent(value: unknown, index: number): DinnerCircleSourcingEvent {
  const item =
    value && typeof value === 'object'
      ? (value as DinnerCircleSourcingEvent)
      : ({} as DinnerCircleSourcingEvent)
  const ingredient = optionalString(item.ingredient) ?? 'Ingredient'
  const loggedAt = optionalString(item.loggedAt) ?? ''

  return {
    id: optionalString(item.id) ?? `${ingredient}-${loggedAt}-${index}`,
    ingredient,
    previousStatus: normalizeIngredientStatus(item.previousStatus),
    newStatus: normalizeIngredientStatus(item.newStatus),
    reason: optionalString(item.reason) ?? '',
    sourceName: optionalString(item.sourceName),
    loggedAt,
  }
}

function normalizeSubstitutionProposal(
  value: unknown,
  index: number
): DinnerCircleSubstitutionProposal {
  const item =
    value && typeof value === 'object'
      ? (value as DinnerCircleSubstitutionProposal)
      : ({} as DinnerCircleSubstitutionProposal)
  const originalIngredient = optionalString(item.originalIngredient) ?? 'Ingredient'
  const proposedSubstitute = optionalString(item.proposedSubstitute) ?? 'Substitute'
  const proposedAt = optionalString(item.proposedAt) ?? ''
  const status = VALID_SUBSTITUTION_PROPOSAL_STATUSES.has(item.status) ? item.status : 'proposed'

  return {
    id:
      optionalString(item.id) ??
      `${originalIngredient}-${proposedSubstitute}-${proposedAt}-${index}`,
    originalIngredient,
    proposedSubstitute,
    reason: optionalString(item.reason) ?? '',
    costDeltaCents: optionalCostDeltaCents(item.costDeltaCents),
    status,
    proposedAt,
    respondedAt: optionalString(item.respondedAt),
    clientNote: optionalString(item.clientNote),
  }
}

function normalizePopUpMenuItem(value: unknown): PopUpMenuItemPlan {
  const item =
    value && typeof value === 'object' ? (value as PopUpMenuItemPlan) : ({} as PopUpMenuItemPlan)
  const productionStatus = VALID_PRODUCTION_STATUSES.has(item.productionStatus as any)
    ? item.productionStatus
    : 'not_started'

  return {
    ticketTypeId: optionalStringOrNull(item.ticketTypeId),
    dishIndexId: optionalStringOrNull(item.dishIndexId),
    recipeId: optionalStringOrNull(item.recipeId),
    name: optionalString(item.name) ?? 'Untitled item',
    plannedUnits: nonNegativeInteger(item.plannedUnits, 24),
    suggestedUnits: optionalNonNegativeInteger(item.suggestedUnits),
    bufferPercent: optionalPercent(item.bufferPercent),
    batchSize: optionalNonNegativeInteger(item.batchSize),
    unitCostCents: optionalNonNegativeInteger(item.unitCostCents),
    priceCents: optionalNonNegativeInteger(item.priceCents),
    targetMarginPercent: optionalPercent(item.targetMarginPercent),
    prepLeadHours: optionalNonNegativeInteger(item.prepLeadHours),
    productionStatus,
    equipmentNeeded: stringArray(item.equipmentNeeded),
    constraints: stringArray(item.constraints),
    notes: optionalString(item.notes),
  }
}

function normalizePopUpLocationProfile(value: unknown): PopUpLocationProfile {
  const input =
    value && typeof value === 'object'
      ? (value as PopUpLocationProfile)
      : DEFAULT_POP_UP_LOCATION_PROFILE
  const locationKind = VALID_LOCATION_KINDS.has(input.locationKind as any)
    ? input.locationKind
    : 'cafe_collab'

  return {
    locationKind,
    accessWindow: optionalString(input.accessWindow),
    kitchenAccess: optionalString(input.kitchenAccess),
    equipmentAvailable: stringArray(input.equipmentAvailable),
    coldStorage: optionalString(input.coldStorage),
    holdingConstraints: stringArray(input.holdingConstraints),
    loadInNotes: optionalString(input.loadInNotes),
  }
}

function normalizePopUpCloseoutItem(value: unknown): PopUpCloseoutItem {
  const item =
    value && typeof value === 'object' ? (value as PopUpCloseoutItem) : ({} as PopUpCloseoutItem)
  return {
    name: optionalString(item.name) ?? 'Untitled item',
    plannedUnits: nonNegativeInteger(item.plannedUnits),
    producedUnits: nonNegativeInteger(item.producedUnits),
    soldUnits: nonNegativeInteger(item.soldUnits),
    wastedUnits: nonNegativeInteger(item.wastedUnits),
    soldOutAt: optionalStringOrNull(item.soldOutAt),
    revenueCents: nonNegativeInteger(item.revenueCents),
    estimatedCostCents: nonNegativeInteger(item.estimatedCostCents),
    notes: optionalString(item.notes),
  }
}

export function normalizePopUpConfig(value: unknown): PopUpConfig {
  const input = value && typeof value === 'object' ? (value as PopUpConfig) : ({} as PopUpConfig)
  const stage = VALID_POP_UP_STAGES.has(input.stage as any) ? input.stage : 'concept'
  const dropType =
    input.dropType === 'weekend_drop' ||
    input.dropType === 'private_dessert_event' ||
    input.dropType === 'other'
      ? input.dropType
      : 'cafe_collab'
  const orderSources =
    Array.isArray(input.orderSources) && input.orderSources.length
      ? input.orderSources.filter((source): source is PopUpOrderSource =>
          VALID_POP_UP_ORDER_SOURCES.has(source as PopUpOrderSource)
        )
      : (['online', 'dm', 'walkup', 'comp'] satisfies PopUpOrderSource[])

  return {
    stage,
    dropType,
    preorderOpensAt: optionalStringOrNull(input.preorderOpensAt),
    preorderClosesAt: optionalStringOrNull(input.preorderClosesAt),
    productionLocksAt: optionalStringOrNull(input.productionLocksAt),
    pickupWindows: stringArray(input.pickupWindows),
    orderSources,
    locationProfile: normalizePopUpLocationProfile(input.locationProfile),
    menuItems: Array.isArray(input.menuItems) ? input.menuItems.map(normalizePopUpMenuItem) : [],
    closeout: input.closeout
      ? {
          itemResults: Array.isArray(input.closeout.itemResults)
            ? input.closeout.itemResults.map(normalizePopUpCloseoutItem)
            : [],
          overallNotes: optionalString(input.closeout.overallNotes),
          nextDropIdeas: optionalString(input.closeout.nextDropIdeas),
        }
      : undefined,
  }
}

export function normalizeDinnerCircleConfig(value: unknown): DinnerCircleConfig {
  const input = value && typeof value === 'object' ? (value as DinnerCircleConfig) : {}
  const supplierText = input.supplier?.rawInput ?? ''
  const ingredientLines =
    input.supplier?.ingredientLines ??
    supplierText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

  return {
    money: {
      paySplit: input.money?.paySplit ?? 'Host covers costs first, remaining net split by role.',
      ticketSeller: input.money?.ticketSeller ?? 'ChefFlow public ticket page',
      compensation:
        input.money?.compensation ?? 'Primary chef payout after platform and hard costs.',
      platformFeePercent: Number.isFinite(input.money?.platformFeePercent)
        ? Number(input.money?.platformFeePercent)
        : 3,
    },
    supplier: {
      rawInput: supplierText,
      ingredientLines,
      sourceLinks: input.supplier?.sourceLinks ?? [],
    },
    menu: {
      manualNotes: input.menu?.manualNotes ?? '',
      pollEnabled: input.menu?.pollEnabled ?? false,
      suggestionsEnabled: input.menu?.suggestionsEnabled ?? true,
      versionLabel: input.menu?.versionLabel ?? 'Working seasonal menu',
      lockedAt: input.menu?.lockedAt ?? null,
      fixedElements: input.menu?.fixedElements ?? '',
      flexibleElements: input.menu?.flexibleElements ?? '',
      changeLog: input.menu?.changeLog ?? [],
    },
    publicPage: {
      story: input.publicPage?.story ?? '',
      pastLinks: input.publicPage?.pastLinks ?? [],
      showGuestMap: input.publicPage?.showGuestMap ?? false,
    },
    layout: {
      name: input.layout?.name ?? 'Event layout',
      reusable: input.layout?.reusable ?? true,
      chefNotes: input.layout?.chefNotes ?? '',
      zones: input.layout?.zones?.length ? input.layout.zones : DEFAULT_LAYOUT_ZONES,
      timeline: input.layout?.timeline ?? [
        { time: 'T-90', title: 'Load-in and cold holding check', zoneId: 'kitchen' },
        { time: 'T-45', title: 'Finish prep and plate staging', zoneId: 'prep' },
        { time: 'T-10', title: 'Guest welcome path clear', zoneId: 'guest' },
        { time: 'Service', title: 'Courses move kitchen to service', zoneId: 'service' },
      ],
    },
    farm: {
      enabled: input.farm?.enabled ?? false,
      showcaseTitle: input.farm?.showcaseTitle ?? 'Farm notes',
      notes: input.farm?.notes ?? '',
      animals: input.farm?.animals ?? [],
    },
    social: {
      enabled: input.social?.enabled ?? false,
      posts: input.social?.posts ?? [],
    },
    adaptive: {
      availabilityItems: (input.adaptive?.availabilityItems ?? []).map((item) => ({
        ingredient: item.ingredient?.trim() || 'Ingredient',
        quantity: item.quantity?.trim() || undefined,
        sourceName: item.sourceName?.trim() || undefined,
        status: normalizeIngredientStatus(item.status),
        unitCostCents: positiveCents(item.unitCostCents),
        allocatedTo: item.allocatedTo?.trim() || undefined,
        substitution: item.substitution?.trim() || undefined,
        flavorRole: item.flavorRole?.trim() || undefined,
      })),
      clientExpectationNote: input.adaptive?.clientExpectationNote ?? '',
      changeWindowNote: input.adaptive?.changeWindowNote ?? '',
      pricingAdjustmentPolicy: input.adaptive?.pricingAdjustmentPolicy ?? '',
      substitutionValidationNotes: input.adaptive?.substitutionValidationNotes ?? '',
      finalValidationLocked: input.adaptive?.finalValidationLocked ?? false,
      finalValidationNotes: input.adaptive?.finalValidationNotes ?? '',
      sourcingLog: Array.isArray(input.adaptive?.sourcingLog)
        ? input.adaptive.sourcingLog.slice(-100).map(normalizeSourcingEvent)
        : [],
      substitutionProposals: Array.isArray(input.adaptive?.substitutionProposals)
        ? input.adaptive.substitutionProposals.slice(-50).map(normalizeSubstitutionProposal)
        : [],
      priceFlexibilityPercent: optionalPriceFlexibilityPercent(
        input.adaptive?.priceFlexibilityPercent
      ),
    },
    popUp: normalizePopUpConfig(input.popUp),
    theme: {
      ...DEFAULT_THEME,
      ...(input.theme ?? {}),
    },
    vendorInquiries: input.vendorInquiries ?? [],
  }
}

export function buildDinnerCircleAdaptiveSnapshot(
  config: DinnerCircleConfig
): DinnerCircleAdaptiveSnapshot {
  const items = config.adaptive?.availabilityItems ?? []
  const confirmedCount = items.filter((item) => item.status === 'confirmed').length
  const flexibleCount = items.filter((item) => item.status === 'flexible').length
  const pendingCount = items.filter((item) => item.status === 'pending').length
  const unavailableCount = items.filter((item) => item.status === 'unavailable').length
  const substitutionPendingCount = items.filter(
    (item) => item.status === 'substitution_pending'
  ).length
  const pricedIngredientCount = items.filter((item) => (item.unitCostCents ?? 0) > 0).length
  const estimatedIngredientCostCents = items.reduce(
    (sum, item) => sum + (item.unitCostCents ?? 0),
    0
  )
  const hasClientExpectationLayer = Boolean(
    config.adaptive?.clientExpectationNote?.trim() || config.adaptive?.changeWindowNote?.trim()
  )
  const hasSubstitutionValidation = Boolean(
    config.adaptive?.substitutionValidationNotes?.trim() ||
    items.some((item) => item.substitution?.trim() || item.flavorRole?.trim())
  )
  const liveMenuState =
    config.adaptive?.finalValidationLocked || config.menu?.lockedAt
      ? 'locked'
      : items.length === 0 && !(config.menu?.manualNotes ?? '').trim()
        ? 'needs_sourcing'
        : 'fluid'

  return {
    confirmedCount,
    flexibleCount,
    pendingCount,
    unavailableCount,
    substitutionPendingCount,
    pricedIngredientCount,
    estimatedIngredientCostCents,
    hasClientExpectationLayer,
    hasSubstitutionValidation,
    finalValidationLocked: config.adaptive?.finalValidationLocked ?? false,
    liveMenuState,
  }
}

export async function getDinnerCircleConfig(eventId: string): Promise<DinnerCircleConfig> {
  const db: any = createServerClient({ admin: true })
  try {
    const { data } = await db
      .from('event_share_settings')
      .select('circle_config')
      .eq('event_id', eventId)
      .maybeSingle()

    return normalizeDinnerCircleConfig(data?.circle_config ?? null)
  } catch {
    return normalizeDinnerCircleConfig(null)
  }
}

export function buildDinnerCircleSnapshot(input: {
  event: any
  config: DinnerCircleConfig
  ticketTypes: EventTicketType[]
  tickets: EventTicket[]
  ticketSummary: EventTicketSummary | null
  collaborators: any[]
  eventMenus: string[] | null
  eventPhotos: any[]
  shareUrl: string | null
  hubGroupToken: string | null
  prepTimelineReady: boolean
  locationReady: boolean
  totalPaidCents: number
  outstandingBalanceCents: number
  menuCostCents?: number | null
}): DinnerCircleSnapshot {
  const activeTicketTypes = input.ticketTypes.filter((ticketType) => ticketType.is_active)
  const paidTickets = input.tickets.filter((ticket) => ticket.payment_status === 'paid')
  const paidGuests = paidTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)
  const projectedCapacity = activeTicketTypes.reduce((sum, ticketType) => {
    if (ticketType.capacity === null) return sum + (input.event?.guest_count ?? 0)
    return sum + ticketType.capacity
  }, 0)
  const projectedRevenueCents = activeTicketTypes.reduce((sum, ticketType) => {
    const seats = ticketType.capacity ?? input.event?.guest_count ?? 0
    return sum + seats * ticketType.price_cents
  }, 0)
  const revenueCents = input.ticketSummary?.revenue_cents ?? input.totalPaidCents
  const refundedCents = input.ticketSummary?.refunded_cents ?? 0
  const platformFeeCents = Math.round(
    projectedRevenueCents * ((input.config.money?.platformFeePercent ?? 3) / 100)
  )
  const menuCostCents = input.menuCostCents ?? 0
  const netPayoutCents = Math.max(0, projectedRevenueCents - platformFeeCents - menuCostCents)
  const finalNetCents = Math.max(0, revenueCents - refundedCents - menuCostCents)
  const publicUrl = input.shareUrl
  const hubUrl = input.hubGroupToken ? `/hub/g/${input.hubGroupToken}` : null
  const ingredientLineCount = input.config.supplier?.ingredientLines?.length ?? 0
  const locationText = [
    input.event?.location,
    input.event?.location_address,
    input.event?.location_city,
    input.event?.location_state,
  ]
    .filter(Boolean)
    .join(', ')
  const defaults = buildEventDefaultLayer({
    eventId: input.event.id,
    eventName: input.event?.title || input.event?.occasion || 'Event',
    status: input.event?.status ?? null,
    eventDate: input.event?.event_date ?? null,
    launchedAt: input.event?.published_at ?? input.event?.created_at ?? null,
    guestCount: input.event?.guest_count ?? null,
    ticketsSold: paidGuests,
    totalCapacity: projectedCapacity,
    projectedRevenueCents,
    actualRevenueCents: revenueCents,
    actualAttendance: paidGuests || null,
    publicPhotosCount: input.eventPhotos.filter((photo) => photo.is_public !== false).length,
    publicStory: input.config.publicPage?.story ?? null,
    shareUrl: publicUrl,
    locationText,
    chefName: input.event?.chef_name ?? null,
    collaborators: input.collaborators.map((collaborator) => ({
      role: collaborator.role ?? null,
      businessName:
        collaborator.chef?.display_name ||
        collaborator.chef?.business_name ||
        collaborator.businessName,
    })),
    supplierIngredientLines: input.config.supplier?.ingredientLines ?? [],
    sourceLinksCount: input.config.supplier?.sourceLinks?.length ?? 0,
    layoutZoneKinds: input.config.layout?.zones?.map((zone) => zone.kind) ?? [],
    accessibilityNotes: input.config.layout?.chefNotes?.toLowerCase().includes('accessible')
      ? input.config.layout.chefNotes
      : null,
    seatingStyle: input.config.layout?.chefNotes?.toLowerCase().includes('seating')
      ? input.config.layout.chefNotes
      : null,
  })
  const adaptive = buildDinnerCircleAdaptiveSnapshot(input.config)

  const checks: DinnerCircleSnapshot['checks'] = [
    {
      key: 'people',
      label: input.collaborators.length > 0 ? 'Roles assigned' : 'Add collaborators or staff roles',
      status: input.collaborators.length > 0 ? 'ready' : 'warning',
      actionHref: `/events/${input.event.id}?tab=ops`,
    },
    {
      key: 'ingredients',
      label:
        adaptive.confirmedCount + adaptive.flexibleCount > 0
          ? 'Live sourcing state captured'
          : ingredientLineCount > 0
            ? 'Supplier ingredients captured'
            : 'Supplier ingredients missing',
      status:
        adaptive.confirmedCount + adaptive.flexibleCount > 0 || ingredientLineCount > 0
          ? 'ready'
          : 'warning',
    },
    {
      key: 'layout',
      label: input.config.layout?.zones?.length ? 'Layout ready' : 'Map layout missing',
      status: input.config.layout?.zones?.length ? 'ready' : 'warning',
    },
    {
      key: 'menu',
      label: input.eventMenus?.length ? 'Menu connected' : 'Build or attach a menu',
      status: input.eventMenus?.length ? 'ready' : 'warning',
      actionHref: `/events/${input.event.id}?tab=money`,
    },
    {
      key: 'money',
      label:
        adaptive.pricedIngredientCount > 0
          ? 'Adaptive ingredient costs tracked'
          : activeTicketTypes.length > 0 || input.event?.quoted_price_cents
            ? 'Money setup started'
            : 'Money setup missing',
      status:
        adaptive.pricedIngredientCount > 0 ||
        activeTicketTypes.length > 0 ||
        input.event?.quoted_price_cents
          ? 'ready'
          : 'warning',
      actionHref: `/events/${input.event.id}?tab=tickets`,
    },
    {
      key: 'expectations',
      label: adaptive.hasClientExpectationLayer
        ? 'Client variability terms set'
        : 'Client variability terms missing',
      status: adaptive.hasClientExpectationLayer ? 'ready' : 'warning',
    },
    {
      key: 'substitute',
      label:
        adaptive.substitutionPendingCount > 0
          ? 'Substitutions pending validation'
          : adaptive.hasSubstitutionValidation
            ? 'Substitution logic captured'
            : 'Substitution logic missing',
      status:
        adaptive.substitutionPendingCount === 0 && adaptive.hasSubstitutionValidation
          ? 'ready'
          : 'warning',
    },
    {
      key: 'publish',
      label: publicUrl ? 'Public event page exists' : 'Publish/share page missing',
      status: publicUrl ? 'ready' : 'warning',
      actionHref: publicUrl ?? `/events/${input.event.id}?tab=overview`,
    },
    {
      key: 'run',
      label: input.prepTimelineReady ? 'Run timeline connected' : 'Service timeline missing',
      status: input.prepTimelineReady ? 'ready' : 'warning',
      actionHref: `/events/${input.event.id}?tab=prep`,
    },
    {
      key: 'capture',
      label:
        paidGuests > 0 || input.event.status === 'completed'
          ? 'Attendee capture active'
          : 'No attendee data yet',
      status: paidGuests > 0 || input.event.status === 'completed' ? 'ready' : 'warning',
      actionHref: `/events/${input.event.id}?tab=wrap`,
    },
  ]

  return {
    eventId: input.event.id,
    shareUrl: publicUrl,
    hubUrl,
    config: input.config,
    counts: {
      collaborators: input.collaborators.length,
      activeTicketTypes: activeTicketTypes.length,
      paidTickets: paidTickets.length,
      paidGuests,
      publicPhotos: input.eventPhotos.filter((photo) => photo.is_public !== false).length,
      menuCount: input.eventMenus?.length ?? 0,
    },
    money: {
      revenueCents,
      refundedCents,
      projectedCapacity,
      projectedRevenueCents,
      platformFeeCents,
      netPayoutCents,
      finalNetCents,
    },
    checks,
    defaults,
    adaptive,
  }
}
