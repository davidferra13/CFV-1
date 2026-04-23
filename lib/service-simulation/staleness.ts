import { createHash } from 'node:crypto'
import type {
  ServiceSimulationContext,
  ServiceSimulationContextSnapshot,
  ServiceSimulationStaleReason,
} from './types'

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function normalizeList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )
}

function normalizeSnapshot(
  snapshot: Partial<ServiceSimulationContextSnapshot> | null | undefined
): ServiceSimulationContextSnapshot {
  return {
    eventStatus: normalizeText(snapshot?.eventStatus) || 'draft',
    eventUpdatedAt: normalizeText(snapshot?.eventUpdatedAt),
    guestCount: snapshot?.guestCount ?? null,
    eventDate: snapshot?.eventDate ?? null,
    eventTime: snapshot?.eventTime ?? null,
    serveTime: snapshot?.serveTime ?? null,
    arrivalTime: snapshot?.arrivalTime ?? null,
    locationAddress: normalizeText(snapshot?.locationAddress),
    locationCity: normalizeText(snapshot?.locationCity),
    locationState: normalizeText(snapshot?.locationState),
    locationZip: normalizeText(snapshot?.locationZip),
    accessInstructions: normalizeText(snapshot?.accessInstructions),
    dietaryRestrictions: normalizeList(snapshot?.dietaryRestrictions ?? []),
    allergies: normalizeList(snapshot?.allergies ?? []),
    menuAttached: Boolean(snapshot?.menuAttached),
    menuIds: normalizeList(snapshot?.menuIds ?? []),
    menuStatuses: normalizeList(snapshot?.menuStatuses ?? []),
    menuDishCount: snapshot?.menuDishCount ?? 0,
    menuComponentCount: snapshot?.menuComponentCount ?? 0,
    menuMakeAheadComponentCount: snapshot?.menuMakeAheadComponentCount ?? 0,
    menuUpdatedAtFingerprint: normalizeText(snapshot?.menuUpdatedAtFingerprint),
    menuFinalizedAt: normalizeText(snapshot?.menuFinalizedAt),
    menuApprovalStatus: normalizeText(snapshot?.menuApprovalStatus),
    groceryListReady: Boolean(snapshot?.groceryListReady),
    frontOfHouseMenuReady: Boolean(snapshot?.frontOfHouseMenuReady),
    prepSheetReady: Boolean(snapshot?.prepSheetReady),
    executionSheetReady: Boolean(snapshot?.executionSheetReady),
    packingListReady: Boolean(snapshot?.packingListReady),
    travelRouteReady: Boolean(snapshot?.travelRouteReady),
    guestRecordCount: snapshot?.guestRecordCount ?? 0,
    attendingGuestCount: snapshot?.attendingGuestCount ?? 0,
    accountedGuestCount: snapshot?.accountedGuestCount ?? 0,
    prepBlockCount: snapshot?.prepBlockCount ?? 0,
    completedPrepBlockCount: snapshot?.completedPrepBlockCount ?? 0,
    prepTimelineItemCount: snapshot?.prepTimelineItemCount ?? 0,
    untimedPrepItemCount: snapshot?.untimedPrepItemCount ?? 0,
    prepLatestUpdatedAt: normalizeText(snapshot?.prepLatestUpdatedAt),
    packingConfirmationCount: snapshot?.packingConfirmationCount ?? 0,
    packingLastConfirmedAt: normalizeText(snapshot?.packingLastConfirmedAt),
    carPacked: Boolean(snapshot?.carPacked),
    serviceLegCount: snapshot?.serviceLegCount ?? 0,
    plannedTravelLegCount: snapshot?.plannedTravelLegCount ?? 0,
    travelLatestUpdatedAt: normalizeText(snapshot?.travelLatestUpdatedAt),
    serviceStarted: Boolean(snapshot?.serviceStarted),
    serviceCompleted: Boolean(snapshot?.serviceCompleted),
    dopCompleted: snapshot?.dopCompleted ?? 0,
    dopTotal: snapshot?.dopTotal ?? 0,
    resetComplete: Boolean(snapshot?.resetComplete),
    followUpSent: Boolean(snapshot?.followUpSent),
    financiallyClosed: Boolean(snapshot?.financiallyClosed),
  }
}

export function buildServiceSimulationSnapshot(
  context: ServiceSimulationContext
): ServiceSimulationContextSnapshot {
  return normalizeSnapshot({
    eventStatus: context.event.status,
    eventUpdatedAt: context.event.updatedAt ?? '',
    guestCount: context.event.guestCount,
    eventDate: context.event.eventDate,
    eventTime: context.event.eventTime,
    serveTime: context.event.serveTime,
    arrivalTime: context.event.arrivalTime,
    locationAddress: context.event.locationAddress ?? '',
    locationCity: context.event.locationCity ?? '',
    locationState: context.event.locationState ?? '',
    locationZip: context.event.locationZip ?? '',
    accessInstructions: context.event.accessInstructions ?? '',
    dietaryRestrictions: context.event.dietaryRestrictions,
    allergies: context.event.allergies,
    menuAttached: context.menu.attached,
    menuIds: context.menu.menuIds,
    menuStatuses: context.menu.menuStatuses,
    menuDishCount: context.menu.dishCount,
    menuComponentCount: context.menu.componentCount,
    menuMakeAheadComponentCount: context.menu.makeAheadComponentCount,
    menuUpdatedAtFingerprint: context.menu.updatedAtFingerprint ?? '',
    menuFinalizedAt: context.menu.finalizedAt ?? '',
    menuApprovalStatus: context.event.menuApprovalStatus ?? '',
    groceryListReady: context.documents.groceryListReady || context.event.groceryListReady,
    frontOfHouseMenuReady: context.documents.frontOfHouseMenuReady,
    prepSheetReady: context.documents.prepSheetReady || context.event.prepListReady,
    executionSheetReady: context.documents.executionSheetReady || context.event.executionSheetReady,
    packingListReady: context.documents.packingListReady || context.event.packingListReady,
    travelRouteReady: context.documents.travelRouteReady || context.travel.serviceLegCount > 0,
    guestRecordCount: context.guests.totalCount,
    attendingGuestCount: context.guests.attendingCount,
    accountedGuestCount: context.guests.accountedGuestCount,
    prepBlockCount: context.prep.blockCount,
    completedPrepBlockCount: context.prep.completedBlockCount,
    prepTimelineItemCount: context.prep.timelineItemCount,
    untimedPrepItemCount: context.prep.untimedItemCount,
    prepLatestUpdatedAt: context.prep.latestUpdatedAt ?? '',
    packingConfirmationCount: context.packing.confirmationCount,
    packingLastConfirmedAt: context.packing.lastConfirmedAt ?? '',
    carPacked: context.event.carPacked,
    serviceLegCount: context.travel.serviceLegCount,
    plannedTravelLegCount: context.travel.plannedLegCount,
    travelLatestUpdatedAt: context.travel.latestUpdatedAt ?? '',
    serviceStarted: Boolean(context.event.serviceStartedAt),
    serviceCompleted: Boolean(context.event.serviceCompletedAt),
    dopCompleted: context.dop?.completed ?? 0,
    dopTotal: context.dop?.total ?? 0,
    resetComplete: context.event.resetComplete,
    followUpSent: context.event.followUpSent,
    financiallyClosed: context.event.financiallyClosed,
  })
}

export function hashServiceSimulationSnapshot(snapshot: ServiceSimulationContextSnapshot): string {
  const normalized = normalizeSnapshot(snapshot)
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

export function diffServiceSimulationSnapshots(
  previous: Partial<ServiceSimulationContextSnapshot> | null | undefined,
  current: Partial<ServiceSimulationContextSnapshot> | null | undefined
): ServiceSimulationStaleReason[] {
  const from = normalizeSnapshot(previous)
  const to = normalizeSnapshot(current)
  const reasons: ServiceSimulationStaleReason[] = []

  if (from.eventStatus !== to.eventStatus) {
    reasons.push({
      code: 'status',
      label: 'Event status changed',
      detail: `Saved simulation used ${from.eventStatus}. Current event is ${to.eventStatus}.`,
    })
  }

  if (from.guestCount !== to.guestCount) {
    reasons.push({
      code: 'guest_count',
      label: 'Guest count changed',
      detail: `Saved simulation used ${from.guestCount ?? 'unknown'} guests. Current event has ${to.guestCount ?? 'unknown'}.`,
    })
  }

  if (
    from.eventDate !== to.eventDate ||
    from.eventTime !== to.eventTime ||
    from.serveTime !== to.serveTime ||
    from.arrivalTime !== to.arrivalTime
  ) {
    reasons.push({
      code: 'schedule',
      label: 'Date or service timing changed',
      detail: 'Event date, service time, or arrival time changed after the last saved simulation.',
    })
  }

  if (
    from.locationAddress !== to.locationAddress ||
    from.locationCity !== to.locationCity ||
    from.locationState !== to.locationState ||
    from.locationZip !== to.locationZip ||
    from.accessInstructions !== to.accessInstructions
  ) {
    reasons.push({
      code: 'location',
      label: 'Location or access changed',
      detail: 'Venue or access details changed after the last saved simulation.',
    })
  }

  if (
    JSON.stringify(from.dietaryRestrictions) !== JSON.stringify(to.dietaryRestrictions) ||
    JSON.stringify(from.allergies) !== JSON.stringify(to.allergies) ||
    from.guestRecordCount !== to.guestRecordCount ||
    from.attendingGuestCount !== to.attendingGuestCount ||
    from.accountedGuestCount !== to.accountedGuestCount
  ) {
    reasons.push({
      code: 'dietary',
      label: 'Dietary coverage changed',
      detail: 'Guest dietary or allergy coverage changed after the last saved simulation.',
    })
  }

  if (
    from.menuAttached !== to.menuAttached ||
    JSON.stringify(from.menuIds) !== JSON.stringify(to.menuIds) ||
    JSON.stringify(from.menuStatuses) !== JSON.stringify(to.menuStatuses) ||
    from.menuDishCount !== to.menuDishCount ||
    from.menuComponentCount !== to.menuComponentCount ||
    from.menuMakeAheadComponentCount !== to.menuMakeAheadComponentCount ||
    from.menuUpdatedAtFingerprint !== to.menuUpdatedAtFingerprint ||
    from.menuFinalizedAt !== to.menuFinalizedAt ||
    from.menuApprovalStatus !== to.menuApprovalStatus
  ) {
    reasons.push({
      code: 'menu',
      label: 'Menu shape changed',
      detail: 'Menu structure or finalization changed after the last saved simulation.',
    })
  }

  if (from.groceryListReady !== to.groceryListReady) {
    reasons.push({
      code: 'grocery',
      label: 'Grocery progress changed',
      detail: 'Grocery readiness changed after the last saved simulation.',
    })
  }

  if (
    from.frontOfHouseMenuReady !== to.frontOfHouseMenuReady ||
    from.prepSheetReady !== to.prepSheetReady ||
    from.executionSheetReady !== to.executionSheetReady ||
    from.packingListReady !== to.packingListReady ||
    from.travelRouteReady !== to.travelRouteReady
  ) {
    reasons.push({
      code: 'documents',
      label: 'Execution documents changed',
      detail: 'Document generation or verification changed after the last saved simulation.',
    })
  }

  if (
    from.prepBlockCount !== to.prepBlockCount ||
    from.completedPrepBlockCount !== to.completedPrepBlockCount ||
    from.prepTimelineItemCount !== to.prepTimelineItemCount ||
    from.untimedPrepItemCount !== to.untimedPrepItemCount ||
    from.prepLatestUpdatedAt !== to.prepLatestUpdatedAt
  ) {
    reasons.push({
      code: 'prep',
      label: 'Prep plan changed',
      detail: 'Prep schedule or timing changed after the last saved simulation.',
    })
  }

  if (
    from.packingConfirmationCount !== to.packingConfirmationCount ||
    from.packingLastConfirmedAt !== to.packingLastConfirmedAt ||
    from.carPacked !== to.carPacked
  ) {
    reasons.push({
      code: 'packing',
      label: 'Packing readiness changed',
      detail: 'Packing confirmations changed after the last saved simulation.',
    })
  }

  if (
    from.serviceLegCount !== to.serviceLegCount ||
    from.plannedTravelLegCount !== to.plannedTravelLegCount ||
    from.travelLatestUpdatedAt !== to.travelLatestUpdatedAt
  ) {
    reasons.push({
      code: 'travel',
      label: 'Travel plan changed',
      detail: 'Route or travel timing changed after the last saved simulation.',
    })
  }

  if (from.dopCompleted !== to.dopCompleted || from.dopTotal !== to.dopTotal) {
    reasons.push({
      code: 'dop',
      label: 'Day-of protocol changed',
      detail: 'Execution progress changed after the last saved simulation.',
    })
  }

  if (from.serviceStarted !== to.serviceStarted || from.serviceCompleted !== to.serviceCompleted) {
    reasons.push({
      code: 'service',
      label: 'Service progress changed',
      detail: 'Recorded service start or completion changed after the last saved simulation.',
    })
  }

  if (
    from.resetComplete !== to.resetComplete ||
    from.followUpSent !== to.followUpSent ||
    from.financiallyClosed !== to.financiallyClosed
  ) {
    reasons.push({
      code: 'close_out',
      label: 'Close-out progress changed',
      detail: 'Wrap-up completion changed after the last saved simulation.',
    })
  }

  return reasons
}
