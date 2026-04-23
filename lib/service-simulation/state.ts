import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getDocumentReadiness } from '@/lib/documents/actions'
import { getEventClosureStatus } from '@/lib/events/actions'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { getEventDOPProgress } from '@/lib/scheduling/actions'
import { buildServiceSimulation } from './engine'
import {
  buildServiceSimulationSnapshot,
  diffServiceSimulationSnapshots,
  hashServiceSimulationSnapshot,
} from './staleness'
import {
  SERVICE_SIMULATION_ENGINE_VERSION,
  type ServiceSimulationContext,
  type ServiceSimulationPanelState,
  type ServiceSimulationResult,
  type ServiceSimulationStaleReason,
} from './types'

type LatestRunRow = {
  id: string
  engine_version: string
  context_hash: string
  context_snapshot: Record<string, unknown> | null
  simulation_payload: {
    simulation?: ServiceSimulationResult
  } | null
  created_at: string
}

export type CurrentEventServiceSimulationState = {
  tenantId: string
  simulation: ServiceSimulationResult
  snapshot: ReturnType<typeof buildServiceSimulationSnapshot>
  hash: string
  latestRun: LatestRunRow | null
  panelState: ServiceSimulationPanelState
}

type SimulationScope = {
  tenantId: string
  admin?: boolean
}

function localDateIso(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function getLatestTimestamp(values: Array<string | null | undefined>): string | null {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.localeCompare(a))[0] ?? null
}

function includesMissingTable(error: unknown, table: string): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.includes(table)
  )
}

async function getLatestSimulationRun(
  db: ReturnType<typeof createServerClient>,
  tenantId: string,
  eventId: string
): Promise<LatestRunRow | null> {
  const { data, error } = await (db as any)
    .from('event_service_simulation_runs')
    .select('id, engine_version, context_hash, context_snapshot, simulation_payload, created_at')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (includesMissingTable(error, 'event_service_simulation_runs')) {
      return null
    }
    throw new Error(`Failed to load service simulation run: ${error.message}`)
  }

  return (data as LatestRunRow | null) ?? null
}

async function saveSimulationRun(params: {
  db: ReturnType<typeof createServerClient>
  tenantId: string
  eventId: string
  hash: string
  snapshot: ReturnType<typeof buildServiceSimulationSnapshot>
  simulation: ServiceSimulationResult
}): Promise<LatestRunRow | null> {
  const { db, tenantId, eventId, hash, snapshot, simulation } = params

  const { data, error } = await (db as any)
    .from('event_service_simulation_runs')
    .insert({
      tenant_id: tenantId,
      event_id: eventId,
      engine_version: SERVICE_SIMULATION_ENGINE_VERSION,
      context_hash: hash,
      context_snapshot: snapshot,
      simulation_payload: {
        simulation,
      },
    })
    .select('id, engine_version, context_hash, context_snapshot, simulation_payload, created_at')
    .single()

  if (error) {
    if (includesMissingTable(error, 'event_service_simulation_runs')) {
      return null
    }
    throw new Error(error.message || 'Failed to save service simulation')
  }

  return (data as LatestRunRow | null) ?? null
}

async function buildEventServiceSimulationContextForScope(
  eventId: string,
  scope: SimulationScope
): Promise<{
  tenantId: string
  simulation: ServiceSimulationResult
  snapshot: ReturnType<typeof buildServiceSimulationSnapshot>
  hash: string
}> {
  const db: any = createServerClient(scope.admin ? { admin: true } : undefined)

  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      `
      id,
      tenant_id,
      occasion,
      status,
      updated_at,
      event_date,
      serve_time,
      arrival_time,
      guest_count,
      location_address,
      location_city,
      location_state,
      location_zip,
      access_instructions,
      dietary_restrictions,
      allergies,
      service_style,
      special_requests,
      grocery_list_ready,
      prep_list_ready,
      packing_list_ready,
      equipment_list_ready,
      timeline_ready,
      execution_sheet_ready,
      non_negotiables_checked,
      car_packed,
      car_packed_at,
      shopping_completed_at,
      prep_completed_at,
      service_started_at,
      service_completed_at,
      reset_complete,
      reset_completed_at,
      follow_up_sent,
      financially_closed,
      menu_approval_status,
      menu_approved_at
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', scope.tenantId)
    .single()

  if (eventError || !event) {
    throw new Error(eventError?.message || 'Event not found')
  }

  const [
    menusResult,
    documentReadiness,
    dopProgress,
    prepTimelineResult,
    closeOut,
    snapshotRowsResult,
    guestRowsResult,
    prepBlocksResult,
    packingConfirmationsResult,
    travelLegsResult,
  ] = await Promise.all([
    db
      .from('menus')
      .select('id, name, status, locked_at, updated_at')
      .eq('event_id', eventId)
      .eq('tenant_id', scope.tenantId)
      .order('created_at', { ascending: true }),
    getDocumentReadiness(eventId),
    getEventDOPProgress(eventId).catch(() => null),
    getEventPrepTimeline(eventId).catch(() => ({ timeline: null, error: 'failed' })),
    getEventClosureStatus(eventId).catch(() => null),
    db
      .from('event_document_snapshots')
      .select('document_type, generated_at')
      .eq('tenant_id', scope.tenantId)
      .eq('event_id', eventId)
      .in('document_type', ['grocery', 'foh', 'prep', 'execution', 'packing', 'travel']),
    db
      .from('event_guests')
      .select('id, rsvp_status, dietary_restrictions, allergies, updated_at')
      .eq('event_id', eventId),
    db
      .from('event_prep_blocks')
      .select('id, is_completed, updated_at, created_at')
      .eq('chef_id', scope.tenantId)
      .eq('event_id', eventId),
    db
      .from('packing_confirmations')
      .select('id, confirmed_at')
      .eq('tenant_id', scope.tenantId)
      .eq('event_id', eventId),
    db
      .from('event_travel_legs')
      .select('id, leg_type, status, updated_at')
      .eq('tenant_id', scope.tenantId)
      .or(`primary_event_id.eq.${eventId},linked_event_ids.cs.{\"${eventId}\"}`),
  ])

  if (menusResult.error) {
    throw new Error(`Failed to load event menus: ${menusResult.error.message}`)
  }

  if (snapshotRowsResult.error && !includesMissingTable(snapshotRowsResult.error, 'event_document_snapshots')) {
    throw new Error(`Failed to load document snapshots: ${snapshotRowsResult.error.message}`)
  }

  if (guestRowsResult.error && !includesMissingTable(guestRowsResult.error, 'event_guests')) {
    throw new Error(`Failed to load event guests: ${guestRowsResult.error.message}`)
  }

  if (prepBlocksResult.error && !includesMissingTable(prepBlocksResult.error, 'event_prep_blocks')) {
    throw new Error(`Failed to load prep blocks: ${prepBlocksResult.error.message}`)
  }

  if (
    packingConfirmationsResult.error &&
    !includesMissingTable(packingConfirmationsResult.error, 'packing_confirmations')
  ) {
    throw new Error(
      `Failed to load packing confirmations: ${packingConfirmationsResult.error.message}`
    )
  }

  if (travelLegsResult.error && !includesMissingTable(travelLegsResult.error, 'event_travel_legs')) {
    throw new Error(`Failed to load travel legs: ${travelLegsResult.error.message}`)
  }

  const menus = (menusResult.data ?? []) as Array<{
    id: string
    name: string | null
    status: string | null
    locked_at: string | null
    updated_at: string | null
  }>

  const menuIds = menus.map((menu) => menu.id)

  let dishes: Array<{ id: string; updated_at: string | null }> = []
  if (menuIds.length > 0) {
    const { data: dishRows, error: dishError } = await db
      .from('dishes')
      .select('id, updated_at')
      .in('menu_id', menuIds)
      .eq('tenant_id', scope.tenantId)

    if (dishError) {
      throw new Error(`Failed to load event dishes: ${dishError.message}`)
    }

    dishes = (dishRows ?? []) as Array<{ id: string; updated_at: string | null }>
  }

  const dishIds = dishes.map((dish) => dish.id)

  let components: Array<{ id: string; is_make_ahead: boolean | null; updated_at: string | null }> =
    []
  if (dishIds.length > 0) {
    const { data: componentRows, error: componentError } = await db
      .from('components')
      .select('id, is_make_ahead, updated_at')
      .in('dish_id', dishIds)
      .eq('tenant_id', scope.tenantId)

    if (componentError) {
      throw new Error(`Failed to load event components: ${componentError.message}`)
    }

    components = (componentRows ?? []) as Array<{
      id: string
      is_make_ahead: boolean | null
      updated_at: string | null
    }>
  }

  const snapshots = (snapshotRowsResult.data ?? []) as Array<{
    document_type: string
    generated_at: string | null
  }>
  const latestSnapshotByType = new Map<string, string | null>()
  for (const snapshot of snapshots) {
    const current = latestSnapshotByType.get(snapshot.document_type) ?? null
    const next = getLatestTimestamp([current, snapshot.generated_at])
    latestSnapshotByType.set(snapshot.document_type, next)
  }

  const guestRows = (guestRowsResult.data ?? []) as Array<{
    id: string
    rsvp_status: string | null
    dietary_restrictions: string[] | null
    allergies: string[] | null
    updated_at: string | null
  }>
  const activeGuestRows = guestRows.filter((guest) => (guest.rsvp_status ?? 'attending') !== 'declined')
  const attendingGuestRows = activeGuestRows.filter((guest) =>
    ['attending', 'confirmed'].includes((guest.rsvp_status ?? 'attending').toLowerCase())
  )
  const guestRecordCount = activeGuestRows.length
  const eventGuestCount = Number(event.guest_count ?? 0)
  const coveredGuestCount = Math.min(eventGuestCount || guestRecordCount, guestRecordCount)
  const unresolvedGuestCount = Math.max((eventGuestCount || guestRecordCount) - coveredGuestCount, 0)

  const prepBlocks = (prepBlocksResult.data ?? []) as Array<{
    id: string
    is_completed: boolean | null
    updated_at: string | null
    created_at: string | null
  }>
  const packingConfirmations = (packingConfirmationsResult.data ?? []) as Array<{
    id: string
    confirmed_at: string | null
  }>
  const travelRows = (travelLegsResult.data ?? []) as Array<{
    id: string
    leg_type: string
    status: string | null
    updated_at: string | null
  }>

  const timeline = prepTimelineResult.timeline
  const context: ServiceSimulationContext = {
    referenceDate: localDateIso(),
    event: {
      id: event.id as string,
      occasion: (event.occasion as string | null) ?? null,
      status: (event.status as string) ?? 'draft',
      updatedAt: (event.updated_at as string | null) ?? null,
      eventDate: (event.event_date as string | null) ?? null,
      // `serve_time` is the canonical service-time field in the current schema.
      // Older simulation types still carry `eventTime`, so keep it null instead of
      // selecting a non-existent `events.event_time` column.
      eventTime: null,
      serveTime: (event.serve_time as string | null) ?? null,
      arrivalTime: (event.arrival_time as string | null) ?? null,
      guestCount: (event.guest_count as number | null) ?? null,
      locationAddress: (event.location_address as string | null) ?? null,
      locationCity: (event.location_city as string | null) ?? null,
      locationState: (event.location_state as string | null) ?? null,
      locationZip: (event.location_zip as string | null) ?? null,
      accessInstructions: (event.access_instructions as string | null) ?? null,
      dietaryRestrictions: Array.isArray(event.dietary_restrictions)
        ? ((event.dietary_restrictions as string[]) ?? [])
        : [],
      allergies: Array.isArray(event.allergies) ? ((event.allergies as string[]) ?? []) : [],
      serviceStyle: (event.service_style as string | null) ?? null,
      specialRequests: (event.special_requests as string | null) ?? null,
      groceryListReady: Boolean(event.grocery_list_ready),
      prepListReady: Boolean(event.prep_list_ready),
      packingListReady: Boolean(event.packing_list_ready),
      equipmentListReady: Boolean(event.equipment_list_ready),
      timelineReady: Boolean(event.timeline_ready),
      executionSheetReady: Boolean(event.execution_sheet_ready),
      nonNegotiablesChecked: Boolean(event.non_negotiables_checked),
      carPacked: Boolean(event.car_packed),
      carPackedAt: (event.car_packed_at as string | null) ?? null,
      shoppingCompletedAt: (event.shopping_completed_at as string | null) ?? null,
      prepCompletedAt: (event.prep_completed_at as string | null) ?? null,
      serviceStartedAt: (event.service_started_at as string | null) ?? null,
      serviceCompletedAt: (event.service_completed_at as string | null) ?? null,
      resetComplete: Boolean(event.reset_complete),
      resetCompletedAt: (event.reset_completed_at as string | null) ?? null,
      followUpSent: Boolean(event.follow_up_sent),
      financiallyClosed: Boolean(event.financially_closed),
      menuApprovalStatus: (event.menu_approval_status as string | null) ?? null,
      menuApprovedAt: (event.menu_approved_at as string | null) ?? null,
    },
    menu: {
      attached: menuIds.length > 0,
      menuIds,
      menuNames: menus.map((menu) => menu.name ?? 'Untitled menu'),
      menuStatuses: menus.map((menu) => menu.status ?? 'draft'),
      dishCount: dishes.length,
      componentCount: components.length,
      makeAheadComponentCount: components.filter((component) => Boolean(component.is_make_ahead))
        .length,
      updatedAtFingerprint: getLatestTimestamp([
        ...menus.map((menu) => menu.updated_at),
        ...dishes.map((dish) => dish.updated_at),
        ...components.map((component) => component.updated_at),
      ]),
      finalizedAt: getLatestTimestamp(menus.map((menu) => menu.locked_at)),
    },
    documents: {
      groceryListReady: documentReadiness.groceryList.ready,
      groceryListMissing: documentReadiness.groceryList.missing,
      frontOfHouseMenuReady:
        documentReadiness.frontOfHouseMenu.ready || Boolean(latestSnapshotByType.get('foh')),
      frontOfHouseMenuGeneratedAt: latestSnapshotByType.get('foh') ?? null,
      prepSheetReady: documentReadiness.prepSheet.ready,
      prepSheetMissing: documentReadiness.prepSheet.missing,
      prepSheetGeneratedAt: latestSnapshotByType.get('prep') ?? null,
      executionSheetReady: documentReadiness.executionSheet.ready,
      executionSheetMissing: documentReadiness.executionSheet.missing,
      executionSheetGeneratedAt: latestSnapshotByType.get('execution') ?? null,
      packingListReady: documentReadiness.packingList.ready,
      packingListMissing: documentReadiness.packingList.missing,
      packingListGeneratedAt: latestSnapshotByType.get('packing') ?? null,
      travelRouteReady: documentReadiness.travelRoute.ready,
      travelRouteMissing: documentReadiness.travelRoute.missing,
      travelRouteGeneratedAt: latestSnapshotByType.get('travel') ?? null,
    },
    guests: {
      totalCount: guestRecordCount,
      attendingCount: attendingGuestRows.length,
      accountedGuestCount: coveredGuestCount,
      unresolvedGuestCount,
      latestUpdatedAt: getLatestTimestamp(guestRows.map((guest) => guest.updated_at)),
    },
    prep: {
      blockCount: prepBlocks.length,
      completedBlockCount: prepBlocks.filter((block) => Boolean(block.is_completed)).length,
      timelineDayCount: timeline?.days.length ?? 0,
      timelineItemCount: timeline?.days.reduce((sum, day) => sum + day.items.length, 0) ?? 0,
      untimedItemCount: timeline?.untimedItems.length ?? 0,
      latestUpdatedAt: getLatestTimestamp(
        prepBlocks.flatMap((block) => [block.updated_at, block.created_at])
      ),
    },
    packing: {
      confirmationCount: packingConfirmations.length,
      lastConfirmedAt: getLatestTimestamp(
        packingConfirmations.map((confirmation) => confirmation.confirmed_at)
      ),
    },
    travel: {
      totalLegCount: travelRows.length,
      serviceLegCount: travelRows.filter((leg) => leg.leg_type === 'service_travel').length,
      plannedLegCount: travelRows.filter((leg) => (leg.status ?? 'planned') === 'planned').length,
      inProgressLegCount: travelRows.filter((leg) => leg.status === 'in_progress').length,
      completedLegCount: travelRows.filter((leg) => leg.status === 'completed').length,
      latestUpdatedAt: getLatestTimestamp(travelRows.map((leg) => leg.updated_at)),
    },
    dop: dopProgress
      ? {
          completed: dopProgress.completed,
          total: dopProgress.total,
        }
      : null,
    closeOut: closeOut
      ? {
          aarFiled: closeOut.aarFiled,
          resetComplete: closeOut.resetComplete,
          followUpSent: closeOut.followUpSent,
          financiallyClosed: closeOut.financiallyClosed,
          allComplete: closeOut.allComplete,
        }
      : null,
  }

  const simulation = buildServiceSimulation(context)
  const snapshot = buildServiceSimulationSnapshot(context)
  const hash = hashServiceSimulationSnapshot(snapshot)

  return {
    tenantId: scope.tenantId,
    simulation,
    snapshot,
    hash,
  }
}

export async function buildEventServiceSimulationContext(
  eventId: string
): Promise<{
  tenantId: string
  simulation: ServiceSimulationResult
  snapshot: ReturnType<typeof buildServiceSimulationSnapshot>
  hash: string
}> {
  const user = await requireChef()
  return buildEventServiceSimulationContextForScope(eventId, { tenantId: user.tenantId! })
}

export function buildServiceSimulationPanelState(
  simulation: ServiceSimulationResult,
  currentHash: string,
  currentSnapshot: ReturnType<typeof buildServiceSimulationSnapshot>,
  latestRun: LatestRunRow | null
): ServiceSimulationPanelState {
  if (!latestRun) {
    return {
      status: 'unsimulated',
      simulation,
      latestRun: null,
      staleReasons: [],
    }
  }

  const staleReasons: ServiceSimulationStaleReason[] = []
  if (latestRun.engine_version !== SERVICE_SIMULATION_ENGINE_VERSION) {
    staleReasons.push({
      code: 'engine',
      label: 'Simulation engine changed',
      detail: 'The saved run used an older engine version and should be refreshed under current logic.',
    })
  }

  if (latestRun.context_hash !== currentHash) {
    staleReasons.push(
      ...diffServiceSimulationSnapshots(latestRun.context_snapshot as any, currentSnapshot)
    )
  }

  return {
    status:
      staleReasons.length === 0 && latestRun.context_hash === currentHash ? 'current' : 'stale',
    simulation,
    latestRun: {
      id: latestRun.id,
      createdAt: latestRun.created_at,
      engineVersion: latestRun.engine_version,
    },
    staleReasons,
  }
}

async function ensureCurrentEventServiceSimulationForScope(
  eventId: string,
  scope: SimulationScope,
  options?: { forceSave?: boolean }
): Promise<CurrentEventServiceSimulationState> {
  const currentState = await getCurrentEventServiceSimulationStateForScope(eventId, scope)
  const shouldSave =
    options?.forceSave === true ||
    currentState.panelState.status === 'unsimulated' ||
    currentState.panelState.status === 'stale'

  if (!shouldSave) {
    return currentState
  }

  const db = createServerClient(scope.admin ? { admin: true } : undefined)
  const savedRun = await saveSimulationRun({
    db,
    tenantId: currentState.tenantId,
    eventId,
    hash: currentState.hash,
    snapshot: currentState.snapshot,
    simulation: currentState.simulation,
  })

  return {
    tenantId: currentState.tenantId,
    simulation: currentState.simulation,
    snapshot: currentState.snapshot,
    hash: currentState.hash,
    latestRun: savedRun ?? currentState.latestRun,
    panelState:
      savedRun !== null
        ? {
            status: 'current',
            simulation: currentState.simulation,
            latestRun: {
              id: savedRun.id,
              createdAt: savedRun.created_at,
              engineVersion: savedRun.engine_version,
            },
            staleReasons: [],
          }
        : currentState.panelState,
  }
}

async function getCurrentEventServiceSimulationStateForScope(
  eventId: string,
  scope: SimulationScope
): Promise<CurrentEventServiceSimulationState> {
  const db = createServerClient(scope.admin ? { admin: true } : undefined)
  const { tenantId, simulation, snapshot, hash } = await buildEventServiceSimulationContextForScope(
    eventId,
    scope
  )
  const latestRun = await getLatestSimulationRun(db, tenantId, eventId)
  const currentPanelState = buildServiceSimulationPanelState(simulation, hash, snapshot, latestRun)

  return {
    tenantId,
    simulation,
    snapshot,
    hash,
    latestRun,
    panelState: currentPanelState,
  }
}

export async function getCurrentEventServiceSimulation(
  eventId: string
): Promise<CurrentEventServiceSimulationState> {
  const user = await requireChef()
  return getCurrentEventServiceSimulationStateForScope(eventId, { tenantId: user.tenantId! })
}

export async function getCurrentEventServiceSimulationForTenant(
  eventId: string,
  tenantId: string
): Promise<CurrentEventServiceSimulationState> {
  return getCurrentEventServiceSimulationStateForScope(eventId, { tenantId, admin: true })
}

export async function ensureCurrentEventServiceSimulation(
  eventId: string,
  options?: { forceSave?: boolean }
): Promise<CurrentEventServiceSimulationState> {
  const user = await requireChef()
  return ensureCurrentEventServiceSimulationForScope(
    eventId,
    { tenantId: user.tenantId! },
    options
  )
}

export async function ensureCurrentEventServiceSimulationForTenant(
  eventId: string,
  tenantId: string,
  options?: { forceSave?: boolean }
): Promise<CurrentEventServiceSimulationState> {
  return ensureCurrentEventServiceSimulationForScope(
    eventId,
    { tenantId, admin: true },
    options
  )
}

export async function loadEventServiceSimulationPanelState(
  eventId: string
): Promise<ServiceSimulationPanelState> {
  const state = await getCurrentEventServiceSimulation(eventId)
  return state.panelState
}
