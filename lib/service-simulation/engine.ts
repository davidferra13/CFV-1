import {
  SERVICE_SIMULATION_ENGINE_VERSION,
  type ServiceSimulationActionItem,
  type ServiceSimulationContext,
  type ServiceSimulationIssue,
  type ServiceSimulationNextAction,
  type ServiceSimulationPhase,
  type ServiceSimulationPhaseKey,
  type ServiceSimulationPhaseStatus,
  type ServiceSimulationProof,
  type ServiceSimulationProofId,
  type ServiceSimulationProofSeverity,
  type ServiceSimulationProofStatus,
  type ServiceSimulationResult,
  type ServiceSimulationSeverityBand,
} from './types'
import {
  formatMeaningfulLocationTruth,
  hasMeaningfulLocationTruth,
} from '@/lib/events/location-truth'

type RouteTarget = {
  route: string
  uiTarget: string
  ctaLabel: string
}

type PhaseDraft = {
  key: ServiceSimulationPhase['key']
  label: string
  status: ServiceSimulationPhaseStatus
  summary: string
  missingItems?: ServiceSimulationIssue[]
  riskFlags?: ServiceSimulationIssue[]
  nextAction?: ServiceSimulationNextAction | null
}

const DAY_MS = 24 * 60 * 60 * 1000

const PROOF_PHASE_MAP: Record<
  ServiceSimulationProofId,
  { phaseKey: ServiceSimulationPhaseKey; phaseLabel: string }
> = {
  front_of_house_menu: { phaseKey: 'menu_guest_truth', phaseLabel: 'Menu and Guest Truth' },
  prep_timeline: { phaseKey: 'prep', phaseLabel: 'Prep' },
  packing_list: { phaseKey: 'equipment_packing', phaseLabel: 'Equipment and Packing' },
  dietary_constraints: { phaseKey: 'menu_guest_truth', phaseLabel: 'Menu and Guest Truth' },
  arrival_logistics: { phaseKey: 'travel_arrival', phaseLabel: 'Travel and Arrival' },
  service_plan_flow: { phaseKey: 'service', phaseLabel: 'Service' },
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function routeTarget(route: string, uiTarget: string, ctaLabel: string): RouteTarget {
  return { route, uiTarget, ctaLabel }
}

function issue(
  id: string,
  label: string,
  detail: string,
  target: Pick<RouteTarget, 'route' | 'ctaLabel'>
): ServiceSimulationIssue {
  return {
    id,
    label,
    detail,
    route: target.route,
    ctaLabel: target.ctaLabel,
  }
}

function nextAction(label: string, detail: string, target: RouteTarget): ServiceSimulationNextAction {
  return {
    label,
    detail,
    route: target.route,
    ctaLabel: target.ctaLabel,
  }
}

function buildPhase(draft: PhaseDraft): ServiceSimulationPhase {
  const missingItems = draft.missingItems ?? []
  const riskFlags = draft.riskFlags ?? []
  const resolvedNextAction =
    draft.nextAction ??
    (missingItems[0]
      ? nextAction(missingItems[0].label, missingItems[0].detail, {
          route: missingItems[0].route,
          uiTarget: '',
          ctaLabel: missingItems[0].ctaLabel,
        })
      : riskFlags[0]
        ? nextAction(riskFlags[0].label, riskFlags[0].detail, {
            route: riskFlags[0].route,
            uiTarget: '',
            ctaLabel: riskFlags[0].ctaLabel,
          })
        : null)

  return {
    key: draft.key,
    label: draft.label,
    status: draft.status,
    summary: draft.summary,
    missingItems,
    riskFlags,
    nextAction: resolvedNextAction,
  }
}

function hasLocation(ctx: ServiceSimulationContext): boolean {
  return hasMeaningfulLocationTruth([
    ctx.event.locationAddress,
    ctx.event.locationCity,
    ctx.event.locationState,
    ctx.event.locationZip,
  ])
}

function formatLocation(ctx: ServiceSimulationContext): string {
  return (
    formatMeaningfulLocationTruth([
      ctx.event.locationAddress,
      ctx.event.locationCity,
      ctx.event.locationState,
    ]) ?? 'Location unknown'
  )
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(Date.UTC(year, month - 1, day))
}

function getDaysUntilEvent(ctx: ServiceSimulationContext): number | null {
  const eventDate = parseDateOnly(ctx.event.eventDate)
  const referenceDate = parseDateOnly(ctx.referenceDate)
  if (!eventDate || !referenceDate) return null
  return Math.round((eventDate.getTime() - referenceDate.getTime()) / DAY_MS)
}

function isSoon(daysUntilEvent: number | null, days: number): boolean {
  return daysUntilEvent !== null && daysUntilEvent <= days
}

function getRouteMap(eventId: string, firstMenuId: string | null) {
  return {
    edit: routeTarget(`/events/${eventId}/edit`, 'event.form', 'Edit Event'),
    menuAttach: routeTarget(`/events/${eventId}?tab=money`, 'event.menu', 'Attach Menu'),
    menuApproval: routeTarget(
      `/events/${eventId}/menu-approval`,
      'event.menu_approval',
      'Review Menu Approval'
    ),
    menuEditor: routeTarget(
      firstMenuId ? `/menus/${firstMenuId}/editor` : `/events/${eventId}?tab=money`,
      firstMenuId ? 'menu.editor' : 'event.menu',
      firstMenuId ? 'Edit Menu' : 'Attach Menu'
    ),
    grocery: routeTarget(`/events/${eventId}/grocery-quote`, 'event.grocery', 'Open Grocery Quote'),
    prep: routeTarget(`/events/${eventId}?tab=prep`, 'event.prep', 'Open Prep Tab'),
    prepPlan: routeTarget(`/events/${eventId}/prep-plan`, 'event.prep_plan', 'Open Prep Plan'),
    pack: routeTarget(`/events/${eventId}/pack`, 'event.pack', 'Open Pack List'),
    travel: routeTarget(`/events/${eventId}/travel`, 'event.travel', 'Open Travel Plan'),
    documents: routeTarget(`/events/${eventId}/documents`, 'event.documents', 'Open Documents'),
    schedule: routeTarget(`/events/${eventId}/schedule`, 'event.schedule', 'Open Schedule'),
    execution: routeTarget(`/events/${eventId}/execution`, 'event.execution', 'Open Execution'),
    wrap: routeTarget(`/events/${eventId}?tab=wrap`, 'event.wrap', 'Open Wrap Tab'),
    aar: routeTarget(`/events/${eventId}/aar`, 'event.aar', 'File AAR'),
    reset: routeTarget(`/events/${eventId}/reset`, 'event.reset', 'Complete Reset'),
    financial: routeTarget(`/events/${eventId}/financial`, 'event.financial', 'Close Financials'),
  }
}

function toMs(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function maxTimestamp(values: Array<string | null | undefined>): string | null {
  const sorted = values.filter((value): value is string => Boolean(value)).sort((a, b) => toMs(b) - toMs(a))
  return sorted[0] ?? null
}

function makeProof(params: {
  id: ServiceSimulationProofId
  label: string
  status: ServiceSimulationProofStatus
  lastVerifiedAt: string | null
  staleReason: string | null
  blocking: boolean
  severity: ServiceSimulationProofSeverity
  sourceOfTruth: string
  verifyAction: RouteTarget
}): ServiceSimulationProof {
  return {
    id: params.id,
    label: params.label,
    status: params.status,
    lastVerifiedAt: params.lastVerifiedAt,
    staleReason: params.staleReason,
    blocking: params.blocking,
    severity: params.severity,
    sourceOfTruth: params.sourceOfTruth,
    verifyAction: {
      route: params.verifyAction.route,
      uiTarget: params.verifyAction.uiTarget,
      ctaLabel: params.verifyAction.ctaLabel,
    },
  }
}

function buildReadinessProofs(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>
): ServiceSimulationProof[] {
  const menuChangedAt = ctx.menu.updatedAtFingerprint
  const eventUpdatedAt = ctx.event.updatedAt

  const frontOfHouseVerifiedAt = maxTimestamp([
    ctx.menu.finalizedAt,
    ctx.documents.frontOfHouseMenuGeneratedAt,
  ])
  const frontOfHouseStatus: ServiceSimulationProofStatus = !frontOfHouseVerifiedAt
    ? 'unverified'
    : menuChangedAt && toMs(menuChangedAt) > toMs(frontOfHouseVerifiedAt)
      ? 'stale'
      : 'verified'

  const prepVerifiedAt = ctx.prep.blockCount > 0 ? ctx.prep.latestUpdatedAt : null
  const prepStatus: ServiceSimulationProofStatus = !prepVerifiedAt
    ? 'unverified'
    : menuChangedAt && toMs(menuChangedAt) > toMs(prepVerifiedAt)
      ? 'stale'
      : 'verified'

  const packingVerifiedAt =
    ctx.documents.packingListReady && ctx.packing.confirmationCount > 0
      ? maxTimestamp([ctx.packing.lastConfirmedAt, ctx.documents.packingListGeneratedAt])
      : null
  const packingStatus: ServiceSimulationProofStatus = !packingVerifiedAt
    ? 'unverified'
    : (menuChangedAt && toMs(menuChangedAt) > toMs(packingVerifiedAt)) ||
        (eventUpdatedAt && toMs(eventUpdatedAt) > toMs(packingVerifiedAt) && ctx.event.guestCount !== null)
      ? 'stale'
      : 'verified'

  const dietaryVerifiedAt =
    ctx.event.guestCount &&
    ctx.guests.accountedGuestCount >= ctx.event.guestCount &&
    ctx.guests.unresolvedGuestCount === 0
      ? ctx.guests.latestUpdatedAt
      : null
  const dietaryStatus: ServiceSimulationProofStatus = !dietaryVerifiedAt
    ? 'unverified'
    : eventUpdatedAt && toMs(eventUpdatedAt) > toMs(dietaryVerifiedAt)
      ? 'stale'
      : 'verified'

  const logisticsVerifiedAt =
    hasLocation(ctx) && ctx.event.arrivalTime && ctx.event.serveTime && ctx.travel.serviceLegCount > 0
      ? maxTimestamp([ctx.travel.latestUpdatedAt, eventUpdatedAt])
      : null
  const logisticsStatus: ServiceSimulationProofStatus = !logisticsVerifiedAt
    ? 'unverified'
    : eventUpdatedAt && toMs(eventUpdatedAt) > toMs(logisticsVerifiedAt)
      ? 'stale'
      : 'verified'

  const servicePlanVerifiedAt =
    ctx.documents.executionSheetGeneratedAt ??
    maxTimestamp([ctx.menu.finalizedAt, ctx.event.menuApprovedAt])
  const servicePlanExists = Boolean(
    (ctx.event.serviceStyle && ctx.menu.dishCount > 0) || ctx.documents.executionSheetReady
  )
  const servicePlanStatus: ServiceSimulationProofStatus = !servicePlanExists || !servicePlanVerifiedAt
    ? 'unverified'
    : menuChangedAt && toMs(menuChangedAt) > toMs(servicePlanVerifiedAt)
      ? 'stale'
      : 'verified'

  return [
    makeProof({
      id: 'front_of_house_menu',
      label: 'Front of House Menu',
      status: frontOfHouseStatus,
      lastVerifiedAt: frontOfHouseVerifiedAt,
      staleReason:
        frontOfHouseStatus === 'stale'
          ? 'The menu changed after the last finalized or generated front-of-house version.'
          : null,
      blocking: false,
      severity: 'warning',
      sourceOfTruth: frontOfHouseVerifiedAt
        ? 'A locked menu or generated front-of-house menu exists for the current event.'
        : 'No locked menu or front-of-house menu output exists yet.',
      verifyAction: routes.documents,
    }),
    makeProof({
      id: 'prep_timeline',
      label: 'Prep Timeline',
      status: prepStatus,
      lastVerifiedAt: prepVerifiedAt,
      staleReason:
        prepStatus === 'stale' ? 'The menu changed after the current prep blocks were scheduled.' : null,
      blocking: true,
      severity: 'critical',
      sourceOfTruth:
        ctx.prep.blockCount > 0
          ? `${ctx.prep.blockCount} structured prep block${ctx.prep.blockCount === 1 ? '' : 's'} exist.`
          : 'No structured prep blocks exist yet.',
      verifyAction: routes.prepPlan,
    }),
    makeProof({
      id: 'packing_list',
      label: 'Packing List',
      status: packingStatus,
      lastVerifiedAt: packingVerifiedAt,
      staleReason:
        packingStatus === 'stale'
          ? 'Menu or event shell changed after the last packing confirmation run.'
          : null,
      blocking: true,
      severity: 'critical',
      sourceOfTruth:
        ctx.documents.packingListReady && ctx.packing.confirmationCount > 0
          ? `${ctx.packing.confirmationCount} packing item confirmation${ctx.packing.confirmationCount === 1 ? '' : 's'} recorded.`
          : 'Packing items are missing or there has been no recent confirmation activity.',
      verifyAction: routes.pack,
    }),
    makeProof({
      id: 'dietary_constraints',
      label: 'Dietary Constraints',
      status: dietaryStatus,
      lastVerifiedAt: dietaryVerifiedAt,
      staleReason:
        dietaryStatus === 'stale'
          ? 'The event changed after the guest dietary coverage was last updated.'
          : null,
      blocking: true,
      severity: 'critical',
      sourceOfTruth:
        dietaryVerifiedAt
          ? `${ctx.guests.accountedGuestCount}/${ctx.event.guestCount ?? 0} guests are accounted for in guest records.`
          : 'Guest dietary coverage is incomplete for the current guest count.',
      verifyAction: routes.edit,
    }),
    makeProof({
      id: 'arrival_logistics',
      label: 'Arrival / Logistics',
      status: logisticsStatus,
      lastVerifiedAt: logisticsVerifiedAt,
      staleReason:
        logisticsStatus === 'stale'
          ? 'Timing or route details changed after the arrival plan was last updated.'
          : null,
      blocking: true,
      severity: 'critical',
      sourceOfTruth:
        logisticsVerifiedAt
          ? 'Arrival time, address, and at least one service route are present.'
          : 'Required arrival timing, venue, or route data is still missing.',
      verifyAction: routes.travel,
    }),
    makeProof({
      id: 'service_plan_flow',
      label: 'Service Plan / Flow',
      status: servicePlanStatus,
      lastVerifiedAt: servicePlanVerifiedAt,
      staleReason:
        servicePlanStatus === 'stale'
          ? 'The menu changed after the current service flow was defined.'
          : null,
      blocking: true,
      severity: 'critical',
      sourceOfTruth:
        servicePlanExists && servicePlanVerifiedAt
          ? 'Service style and generated execution flow exist for the current menu.'
          : 'No current execution sheet or finalized service flow exists yet.',
      verifyAction: routes.schedule,
    }),
  ]
}

function compareProofPriority(left: ServiceSimulationProof, right: ServiceSimulationProof): number {
  const score = (proof: ServiceSimulationProof) => {
    const base =
      proof.status === 'unverified'
        ? proof.blocking && proof.severity === 'critical'
          ? 0
          : proof.severity === 'warning'
            ? 2
            : 4
        : proof.status === 'stale'
          ? proof.severity === 'critical'
            ? 1
            : 3
          : 5
    return base
  }

  return score(left) - score(right)
}

function computeReadiness(proofs: ServiceSimulationProof[]): ServiceSimulationResult['readiness'] {
  const blockers = proofs.filter(
    (proof) => proof.status === 'unverified' && proof.blocking && proof.severity === 'critical'
  ).length
  const risks = proofs.filter(
    (proof) =>
      proof.status === 'unverified' &&
      !(proof.blocking && proof.severity === 'critical')
  ).length
  const stale = proofs.filter((proof) => proof.status === 'stale').length
  const overallScore = Math.max(0, Math.min(100, 100 - blockers * 25 - risks * 10 - stale * 6))
  const mostLikelyFailurePoint =
    [...proofs].sort(compareProofPriority).find((proof) => proof.status !== 'verified') ?? null

  return {
    overallScore,
    counts: {
      blockers,
      risks,
      stale,
    },
    mostLikelyFailurePoint,
    proofs,
  }
}

function getProofSeverityBand(proof: ServiceSimulationProof): ServiceSimulationSeverityBand {
  if (proof.status === 'stale') return 'should_verify'
  if (proof.severity === 'critical' && proof.blocking) return 'must_fix'
  if (proof.severity === 'advisory') return 'optional_improvement'
  return 'should_verify'
}

function getProofDetail(proof: ServiceSimulationProof): string {
  if (proof.status === 'stale') return proof.staleReason ?? proof.sourceOfTruth
  return proof.sourceOfTruth
}

function buildActionItems(proofs: ServiceSimulationProof[]): ServiceSimulationActionItem[] {
  return proofs
    .filter((proof) => proof.status !== 'verified')
    .sort(compareProofPriority)
    .map((proof) => {
      const phase = PROOF_PHASE_MAP[proof.id]
      const severity = getProofSeverityBand(proof)
      return {
        id: proof.id,
        key: proof.id,
        label: proof.label,
        detail: getProofDetail(proof),
        route: proof.verifyAction.route,
        ctaLabel: proof.verifyAction.ctaLabel,
        phaseKey: phase.phaseKey,
        phaseLabel: phase.phaseLabel,
        phaseStatus: severity === 'must_fix' ? 'attention' : 'ready',
        source: 'proof',
        severity,
      }
    })
}

function buildRollup(
  proofs: ServiceSimulationProof[],
  actionItems: ServiceSimulationActionItem[]
): ServiceSimulationResult['rollup'] {
  const mustFix = actionItems.filter((item) => item.severity === 'must_fix')
  const shouldVerify = actionItems.filter((item) => item.severity === 'should_verify')
  const optionalImprovement = actionItems.filter(
    (item) => item.severity === 'optional_improvement'
  )
  const unresolvedProofs = proofs.filter((proof) => proof.status !== 'verified')
  const readinessLabel =
    mustFix.length > 0
      ? 'Not service-ready'
      : unresolvedProofs.some((proof) => proof.status === 'stale')
        ? 'Needs refresh'
        : shouldVerify.length > 0
          ? 'Needs verification'
          : 'Service-ready'

  return {
    readinessScore: computeReadiness(proofs).overallScore,
    readinessLabel,
    criticalBlockerCount: mustFix.length,
    warningCount: shouldVerify.length,
    optionalImprovementCount: optionalImprovement.length,
    topConcern: mustFix[0] ?? shouldVerify[0] ?? optionalImprovement[0] ?? null,
  }
}

function buildCoreFactsPhase(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>,
  daysUntilEvent: number | null
): ServiceSimulationPhase {
  const missingItems: ServiceSimulationIssue[] = []
  const riskFlags: ServiceSimulationIssue[] = []

  if (!ctx.event.eventDate) {
    missingItems.push(
      issue(
        'core-event-date',
        'Set the event date',
        'The service cannot be walked chronologically until the event date exists.',
        routes.edit
      )
    )
  }

  if (!ctx.event.guestCount) {
    missingItems.push(
      issue(
        'core-guest-count',
        'Set the guest count',
        'Guest count drives portions, grocery scale, equipment load, and pacing.',
        routes.edit
      )
    )
  }

  if (!hasLocation(ctx)) {
    missingItems.push(
      issue(
        'core-location',
        'Add the event location',
        'Travel, load-in, and venue-specific constraints stay unknown until the location is set.',
        routes.edit
      )
    )
  }

  if (!ctx.event.serveTime && !ctx.event.eventTime) {
    missingItems.push(
      issue(
        'core-serve-time',
        'Set the service time',
        'Service timing anchors prep pacing, travel planning, and the mental walkthrough.',
        routes.edit
      )
    )
  }

  if (['confirmed', 'in_progress'].includes(ctx.event.status) && !ctx.event.arrivalTime) {
    riskFlags.push(
      issue(
        'core-arrival-time',
        'Arrival time is still unknown',
        'The event is already operational, but the arrival target has not been set.',
        routes.edit
      )
    )
  }

  const summary =
    missingItems.length > 0
      ? `${missingItems.length} core fact${missingItems.length === 1 ? '' : 's'} still need to be pinned down before the service can feel concrete.`
      : `Service is anchored for ${ctx.event.guestCount} guests${ctx.event.eventDate ? ` on ${ctx.event.eventDate}` : ''} at ${formatLocation(ctx)}${ctx.event.serveTime ? `, serving at ${ctx.event.serveTime}` : ''}.`

  return buildPhase({
    key: 'core_facts',
    label: 'Core Facts',
    status: missingItems.length > 0 ? 'attention' : 'ready',
    summary:
      daysUntilEvent !== null && daysUntilEvent < 0 && ctx.event.status !== 'completed'
        ? `${summary} The date is already in the past, so current timing truth should be reviewed.`
        : summary,
    missingItems,
    riskFlags,
  })
}

function buildMenuGuestTruthPhase(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>,
  proofs: Map<ServiceSimulationProofId, ServiceSimulationProof>,
  daysUntilEvent: number | null
): ServiceSimulationPhase {
  const missingItems: ServiceSimulationIssue[] = []
  const riskFlags: ServiceSimulationIssue[] = []

  if (!ctx.menu.attached) {
    missingItems.push(
      issue(
        'menu-attach',
        'Attach a menu to this event',
        'Without an attached menu, the simulation can only describe the event at a high level.',
        routes.menuAttach
      )
    )

    return buildPhase({
      key: 'menu_guest_truth',
      label: 'Menu and Guest Truth',
      status: 'waiting',
      summary:
        'No menu is attached yet, so dish flow, grocery scope, and service pacing are still unknown.',
      missingItems,
    })
  }

  if (ctx.menu.dishCount === 0) {
    missingItems.push(
      issue(
        'menu-dishes',
        'Add dishes to the attached menu',
        'The menu shell exists, but there is no dish structure to rehearse.',
        routes.menuEditor
      )
    )
  }

  if (ctx.menu.dishCount > 0 && ctx.menu.componentCount === 0) {
    missingItems.push(
      issue(
        'menu-components',
        'Add components to the menu dishes',
        'Grocery, prep, and packing cannot be verified until the dish components exist.',
        routes.menuEditor
      )
    )
  }

  const frontOfHouseProof = proofs.get('front_of_house_menu')
  if (frontOfHouseProof?.status === 'unverified') {
    riskFlags.push(
      issue(
        'proof-front-of-house-menu',
        frontOfHouseProof.label,
        getProofDetail(frontOfHouseProof),
        frontOfHouseProof.verifyAction
      )
    )
  } else if (frontOfHouseProof?.status === 'stale') {
    riskFlags.push(
      issue(
        'proof-front-of-house-menu-stale',
        frontOfHouseProof.label,
        getProofDetail(frontOfHouseProof),
        frontOfHouseProof.verifyAction
      )
    )
  }

  const dietaryProof = proofs.get('dietary_constraints')
  if (dietaryProof?.status === 'unverified' && isSoon(daysUntilEvent, 7)) {
    riskFlags.push(
      issue(
        'proof-dietary-constraints',
        dietaryProof.label,
        getProofDetail(dietaryProof),
        dietaryProof.verifyAction
      )
    )
  }

  const summary =
    missingItems.length > 0
      ? `The menu is attached, but guest-facing service truth is still incomplete because ${missingItems.length === 1 ? 'one structural gap remains' : `${missingItems.length} structural gaps remain`}.`
      : `The current service shape covers ${ctx.menu.dishCount} dish${ctx.menu.dishCount === 1 ? '' : 'es'} and ${ctx.menu.componentCount} component${ctx.menu.componentCount === 1 ? '' : 's'}.`

  return buildPhase({
    key: 'menu_guest_truth',
    label: 'Menu and Guest Truth',
    status: missingItems.length > 0 ? 'attention' : 'ready',
    summary,
    missingItems,
    riskFlags,
  })
}

function buildGroceryPhase(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>,
  daysUntilEvent: number | null
): ServiceSimulationPhase {
  const missingItems: ServiceSimulationIssue[] = []
  const riskFlags: ServiceSimulationIssue[] = []

  if (!ctx.menu.attached || ctx.menu.dishCount === 0 || ctx.menu.componentCount === 0) {
    return buildPhase({
      key: 'grocery_sourcing',
      label: 'Grocery and Sourcing',
      status: 'waiting',
      summary: 'This phase is waiting on menu structure before sourcing can be rehearsed honestly.',
      missingItems: [
        issue(
          'grocery-wait-structure',
          'Finish the menu structure first',
          'Dishes and components need to exist before sourcing can be checked honestly.',
          ctx.menu.attached ? routes.menuEditor : routes.menuAttach
        ),
      ],
    })
  }

  for (const missing of ctx.documents.groceryListMissing) {
    missingItems.push(
      issue(
        `grocery-${missing}`,
        missing,
        'The current grocery surface cannot verify sourcing from live event truth yet.',
        routes.grocery
      )
    )
  }

  if (isSoon(daysUntilEvent, 2) && !ctx.documents.groceryListReady && !ctx.event.groceryListReady) {
    riskFlags.push(
      issue(
        'grocery-soon',
        'The event is close and sourcing is still unresolved',
        'A grocery quote or list is still missing even though service is approaching.',
        routes.grocery
      )
    )
  }

  return buildPhase({
    key: 'grocery_sourcing',
    label: 'Grocery and Sourcing',
    status:
      missingItems.length > 0
        ? 'attention'
        : ctx.documents.groceryListReady || ctx.event.groceryListReady
          ? 'ready'
          : 'attention',
    summary:
      missingItems.length > 0
        ? `Sourcing cannot be trusted yet because ${missingItems.length === 1 ? 'one grocery dependency is still unresolved' : `${missingItems.length} grocery dependencies are still unresolved`}.`
        : 'The menu exists, and grocery sourcing can be reviewed under the current event truth.',
    missingItems,
    riskFlags,
  })
}

function buildPrepPhase(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>,
  proofs: Map<ServiceSimulationProofId, ServiceSimulationProof>,
  daysUntilEvent: number | null
): ServiceSimulationPhase {
  const missingItems: ServiceSimulationIssue[] = []
  const riskFlags: ServiceSimulationIssue[] = []

  if (!ctx.menu.attached || ctx.menu.dishCount === 0 || ctx.menu.componentCount === 0) {
    return buildPhase({
      key: 'prep',
      label: 'Prep',
      status: 'waiting',
      summary: 'Prep is waiting on menu structure before make-ahead work can be walked honestly.',
      missingItems: [
        issue(
          'prep-wait-structure',
          'Finish the menu structure first',
          'Prep needs dish and component truth before timing can be trusted.',
          ctx.menu.attached ? routes.menuEditor : routes.menuAttach
        ),
      ],
    })
  }

  const prepProof = proofs.get('prep_timeline')
  if (prepProof?.status === 'unverified') {
    missingItems.push(
      issue('proof-prep-timeline', prepProof.label, getProofDetail(prepProof), prepProof.verifyAction)
    )
  } else if (prepProof?.status === 'stale') {
    riskFlags.push(
      issue(
        'proof-prep-timeline-stale',
        prepProof.label,
        getProofDetail(prepProof),
        prepProof.verifyAction
      )
    )
  }

  if (ctx.prep.untimedItemCount > 0) {
    riskFlags.push(
      issue(
        'prep-untimed',
        `${ctx.prep.untimedItemCount} prep item${ctx.prep.untimedItemCount === 1 ? ' is' : 's are'} still untimed`,
        'The walkthrough cannot fully place every prep task on the calendar yet.',
        routes.prep
      )
    )
  }

  if (
    ctx.prep.blockCount > 0 &&
    ctx.prep.completedBlockCount < ctx.prep.blockCount &&
    isSoon(daysUntilEvent, 1)
  ) {
    const remaining = ctx.prep.blockCount - ctx.prep.completedBlockCount
    riskFlags.push(
      issue(
        'prep-incomplete',
        `${remaining} prep block${remaining === 1 ? '' : 's'} remain incomplete`,
        'Service is close, but the prep schedule still shows unfinished work.',
        routes.prepPlan
      )
    )
  }

  const status =
    ctx.prep.blockCount > 0 && ctx.prep.completedBlockCount === ctx.prep.blockCount
      ? 'complete'
      : missingItems.length > 0
        ? 'attention'
        : ctx.prep.blockCount > 0 || ctx.prep.timelineItemCount > 0
          ? 'ready'
          : 'attention'

  return buildPhase({
    key: 'prep',
    label: 'Prep',
    status,
    summary:
      status === 'complete'
        ? 'Prep blocks are fully complete under the current event conditions.'
        : missingItems.length > 0
          ? `Prep cannot be trusted yet because ${missingItems.length === 1 ? 'one prep dependency is still unresolved' : `${missingItems.length} prep dependencies are still unresolved`}.`
          : ctx.prep.blockCount > 0
            ? `${ctx.prep.completedBlockCount}/${ctx.prep.blockCount} prep block${ctx.prep.blockCount === 1 ? '' : 's'} are complete under the current event conditions.`
            : 'No structured prep work has been verified yet.',
    missingItems,
    riskFlags,
    nextAction:
      status !== 'attention'
        ? nextAction(
            'Review the prep plan',
            'Walk the prep days in order and make sure each task has a place before service week tightens.',
            routes.prepPlan
          )
        : null,
  })
}

function buildEquipmentPackingPhase(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>,
  proofs: Map<ServiceSimulationProofId, ServiceSimulationProof>,
  daysUntilEvent: number | null
): ServiceSimulationPhase {
  const missingItems: ServiceSimulationIssue[] = []
  const riskFlags: ServiceSimulationIssue[] = []

  if (!ctx.menu.attached) {
    return buildPhase({
      key: 'equipment_packing',
      label: 'Equipment and Packing',
      status: 'waiting',
      summary: 'Packing is waiting on menu direction before the load-out can be judged honestly.',
      missingItems: [
        issue(
          'pack-wait-menu',
          'Attach the menu first',
          'Equipment and pack-out depend on the actual menu being served.',
          routes.menuAttach
        ),
      ],
    })
  }

  const packingProof = proofs.get('packing_list')
  if (packingProof?.status === 'unverified') {
    missingItems.push(
      issue('proof-packing-list', packingProof.label, getProofDetail(packingProof), packingProof.verifyAction)
    )
  } else if (packingProof?.status === 'stale') {
    riskFlags.push(
      issue(
        'proof-packing-list-stale',
        packingProof.label,
        getProofDetail(packingProof),
        packingProof.verifyAction
      )
    )
  }

  if (isSoon(daysUntilEvent, 1) && !ctx.event.carPacked) {
    riskFlags.push(
      issue(
        'pack-soon',
        'Service is close and the load-out is not marked packed',
        'The walkthrough still ends with an unconfirmed load-out even though service is near.',
        routes.pack
      )
    )
  }

  return buildPhase({
    key: 'equipment_packing',
    label: 'Equipment and Packing',
    status: missingItems.length > 0 ? 'attention' : ctx.packing.confirmationCount > 0 ? 'ready' : 'attention',
    summary:
      missingItems.length > 0
        ? 'Packing still has unresolved operational gaps before service can feel rehearsed.'
        : ctx.packing.confirmationCount > 0
          ? `${ctx.packing.confirmationCount} packing item${ctx.packing.confirmationCount === 1 ? '' : 's'} have been confirmed so far.`
          : 'Packing can be reviewed now, but no confirmed load-out progress is recorded yet.',
    missingItems,
    riskFlags,
  })
}

function buildTravelPhase(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>,
  proofs: Map<ServiceSimulationProofId, ServiceSimulationProof>
): ServiceSimulationPhase {
  const missingItems: ServiceSimulationIssue[] = []
  const riskFlags: ServiceSimulationIssue[] = []

  if (!ctx.event.eventDate || !hasLocation(ctx)) {
    return buildPhase({
      key: 'travel_arrival',
      label: 'Travel and Arrival',
      status: 'waiting',
      summary: 'Travel planning is waiting on the event date and location before it can be rehearsed honestly.',
      missingItems: [
        issue(
          'travel-core-facts',
          'Finish the core event facts first',
          'Travel and arrival need the date and venue to exist first.',
          routes.edit
        ),
      ],
    })
  }

  const logisticsProof = proofs.get('arrival_logistics')
  if (logisticsProof?.status === 'unverified') {
    missingItems.push(
      issue(
        'proof-arrival-logistics',
        logisticsProof.label,
        getProofDetail(logisticsProof),
        logisticsProof.verifyAction
      )
    )
  } else if (logisticsProof?.status === 'stale') {
    riskFlags.push(
      issue(
        'proof-arrival-logistics-stale',
        logisticsProof.label,
        getProofDetail(logisticsProof),
        logisticsProof.verifyAction
      )
    )
  }

  return buildPhase({
    key: 'travel_arrival',
    label: 'Travel and Arrival',
    status:
      missingItems.length > 0
        ? 'attention'
        : ctx.travel.serviceLegCount > 0 || ctx.documents.travelRouteReady
          ? 'ready'
          : 'attention',
    summary:
      missingItems.length > 0
        ? 'Travel still has unresolved planning gaps before arrival can feel rehearsed.'
        : ctx.travel.serviceLegCount > 0
          ? `${ctx.travel.serviceLegCount} service travel leg${ctx.travel.serviceLegCount === 1 ? '' : 's'} are recorded for this event.`
          : 'Travel has not been verified on the dedicated route yet.',
    missingItems,
    riskFlags,
  })
}

function buildServicePhase(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>,
  proofs: Map<ServiceSimulationProofId, ServiceSimulationProof>
): ServiceSimulationPhase {
  const missingItems: ServiceSimulationIssue[] = []
  const riskFlags: ServiceSimulationIssue[] = []

  if (!ctx.menu.attached || !ctx.event.guestCount || !ctx.event.serveTime || !hasLocation(ctx)) {
    return buildPhase({
      key: 'service',
      label: 'Service',
      status: 'waiting',
      summary:
        'The service phase is waiting on core service truth before the dinner itself can be rehearsed honestly.',
      missingItems: [
        issue(
          'service-core-truth',
          'Finish the core service inputs',
          'Guest count, timing, location, and menu truth need to exist before service execution can be walked end to end.',
          ctx.menu.attached ? routes.edit : routes.menuAttach
        ),
      ],
    })
  }

  for (const proofId of ['dietary_constraints', 'service_plan_flow'] as const) {
    const proof = proofs.get(proofId)
    if (!proof) continue
    if (proof.status === 'unverified') {
      missingItems.push(
        issue(`proof-${proof.id}`, proof.label, getProofDetail(proof), proof.verifyAction)
      )
    } else if (proof.status === 'stale') {
      riskFlags.push(
        issue(`proof-${proof.id}-stale`, proof.label, getProofDetail(proof), proof.verifyAction)
      )
    }
  }

  if (ctx.dop && ctx.dop.total > 0 && ctx.dop.completed < ctx.dop.total) {
    const remaining = ctx.dop.total - ctx.dop.completed
    riskFlags.push(
      issue(
        'service-dop',
        `${remaining} DOP item${remaining === 1 ? '' : 's'} remain open`,
        'The day-of protocol is still incomplete under the current event conditions.',
        routes.schedule
      )
    )
  }

  return buildPhase({
    key: 'service',
    label: 'Service',
    status: missingItems.length > 0 ? 'attention' : 'ready',
    summary:
      missingItems.length > 0
        ? `Service is not yet fully rehearsable because ${missingItems.length === 1 ? 'one proof still needs verification' : `${missingItems.length} proof gaps remain`}.`
        : ctx.dop && ctx.dop.total > 0
          ? `${ctx.dop.completed}/${ctx.dop.total} DOP tasks are complete and the core service proofs are in place.`
          : 'Core service truth exists, but there is not enough day-of protocol data yet to verify a fuller run sheet.',
    missingItems,
    riskFlags,
    nextAction:
      missingItems.length === 0
        ? nextAction(
            'Walk the live schedule',
            'Use the schedule surface to rehearse how service should unfold under the current conditions.',
            routes.schedule
          )
        : null,
  })
}

function buildCloseOutPhase(
  ctx: ServiceSimulationContext,
  routes: ReturnType<typeof getRouteMap>
): ServiceSimulationPhase {
  const missingItems: ServiceSimulationIssue[] = []

  if (!ctx.event.serviceCompletedAt && ctx.event.status !== 'completed') {
    return buildPhase({
      key: 'close_out',
      label: 'Close-out',
      status: 'waiting',
      summary: 'Close-out will become actionable after service starts and finishes.',
      nextAction: nextAction(
        'Stay on the event shell',
        'Close-out is not supposed to be complete yet. It will unlock after service happens.',
        routes.wrap
      ),
    })
  }

  if (!ctx.closeOut) {
    return buildPhase({
      key: 'close_out',
      label: 'Close-out',
      status: 'attention',
      summary: 'Post-service close-out truth is missing for this event.',
      missingItems: [
        issue(
          'closeout-status',
          'Open the wrap-up surfaces',
          'The system cannot verify AAR, reset, follow-up, and financial close-out from the current event state.',
          routes.wrap
        ),
      ],
    })
  }

  if (!ctx.closeOut.aarFiled) {
    missingItems.push(
      issue('closeout-aar', 'File the after-action review', 'The event review has not been recorded yet.', routes.aar)
    )
  }

  if (!ctx.closeOut.resetComplete) {
    missingItems.push(
      issue('closeout-reset', 'Complete the reset checklist', 'Kitchen reset and pack-back are not yet marked complete.', routes.reset)
    )
  }

  if (!ctx.closeOut.followUpSent) {
    missingItems.push(
      issue('closeout-follow-up', 'Send the client follow-up', 'The post-service follow-up is still open on this event.', routes.wrap)
    )
  }

  if (!ctx.closeOut.financiallyClosed) {
    missingItems.push(
      issue('closeout-financials', 'Close the financials', 'Final expenses and event close-out are not yet reconciled.', routes.financial)
    )
  }

  return buildPhase({
    key: 'close_out',
    label: 'Close-out',
    status: missingItems.length === 0 ? 'complete' : 'attention',
    summary:
      missingItems.length === 0
        ? 'AAR, reset, follow-up, and financial close-out are all complete.'
        : `${missingItems.length} close-out step${missingItems.length === 1 ? '' : 's'} still remain after service.`,
    missingItems,
  })
}

function buildSummary(
  counts: ServiceSimulationResult['counts'],
  readiness: ServiceSimulationResult['readiness']
): string {
  if (readiness.counts.blockers === 0 && readiness.counts.risks === 0 && readiness.counts.stale === 0) {
    return counts.complete > 0
      ? 'The current walkthrough is fully grounded in recorded event truth.'
      : 'The current walkthrough is grounded and ready to rehearse.'
  }

  if (readiness.counts.blockers > 0) {
    return `${readiness.counts.blockers} blocking proof${readiness.counts.blockers === 1 ? '' : 's'} still need real evidence before this event will feel like the second time.`
  }

  if (readiness.counts.stale > 0) {
    return `${readiness.counts.stale} proof${readiness.counts.stale === 1 ? '' : 's'} are stale and should be refreshed against current event truth.`
  }

  return `${readiness.counts.risks} proof${readiness.counts.risks === 1 ? '' : 's'} still need verification under the current event conditions.`
}

export function buildServiceSimulation(ctx: ServiceSimulationContext): ServiceSimulationResult {
  const daysUntilEvent = getDaysUntilEvent(ctx)
  const routes = getRouteMap(ctx.event.id, ctx.menu.menuIds[0] ?? null)
  const proofs = buildReadinessProofs(ctx, routes)
  const readiness = computeReadiness(proofs)
  const proofMap = new Map(proofs.map((proof) => [proof.id, proof]))

  const phases = [
    buildCoreFactsPhase(ctx, routes, daysUntilEvent),
    buildMenuGuestTruthPhase(ctx, routes, proofMap, daysUntilEvent),
    buildGroceryPhase(ctx, routes, daysUntilEvent),
    buildPrepPhase(ctx, routes, proofMap, daysUntilEvent),
    buildEquipmentPackingPhase(ctx, routes, proofMap, daysUntilEvent),
    buildTravelPhase(ctx, routes, proofMap),
    buildServicePhase(ctx, routes, proofMap),
    buildCloseOutPhase(ctx, routes),
  ]

  const counts = phases.reduce(
    (acc, phase) => {
      acc[phase.status] += 1
      return acc
    },
    {
      attention: 0,
      waiting: 0,
      ready: 0,
      complete: 0,
    } satisfies ServiceSimulationResult['counts']
  )

  const actionItems = buildActionItems(proofs)
  const severityBands = {
    mustFix: actionItems.filter((item) => item.severity === 'must_fix'),
    shouldVerify: actionItems.filter((item) => item.severity === 'should_verify'),
    optionalImprovement: actionItems.filter(
      (item) => item.severity === 'optional_improvement'
    ),
  }
  const rollup = buildRollup(proofs, actionItems)

  return {
    engineVersion: SERVICE_SIMULATION_ENGINE_VERSION,
    summary: buildSummary(counts, readiness),
    phases,
    proofs,
    readiness,
    actionItems,
    severityBands,
    rollup,
    counts,
  }
}
