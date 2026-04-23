import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildServiceSimulation } from '@/lib/service-simulation/engine'
import { getServiceSimulationTransitionGate } from '@/lib/service-simulation/gates'
import {
  buildServiceSimulationSnapshot,
  diffServiceSimulationSnapshots,
  hashServiceSimulationSnapshot,
} from '@/lib/service-simulation/staleness'
import type {
  ServiceSimulationContext,
  ServiceSimulationPanelState,
  ServiceSimulationPhaseKey,
} from '@/lib/service-simulation/types'

function getPhase(
  context: ServiceSimulationContext,
  key: ServiceSimulationPhaseKey
) {
  const simulation = buildServiceSimulation(context)
  const phase = simulation.phases.find((entry) => entry.key === key)
  assert.ok(phase, `Expected phase ${key} to exist`)
  return phase
}

function buildPanelState(
  context: ServiceSimulationContext,
  status: ServiceSimulationPanelState['status']
): ServiceSimulationPanelState {
  return {
    status,
    simulation: buildServiceSimulation(context),
    latestRun:
      status === 'unsimulated'
        ? null
        : {
            id: 'run-1',
            createdAt: '2026-04-22T10:00:00.000Z',
            engineVersion: 'v2',
          },
    staleReasons:
      status === 'stale'
        ? [
            {
              code: 'guest_count',
              label: 'Guest count changed',
              detail: 'Saved simulation used 10 guests. Current event has 12.',
            },
          ]
        : [],
  }
}

function makeEarlyStageContext(): ServiceSimulationContext {
  return {
    referenceDate: '2026-04-22',
    event: {
      id: 'event-early',
      occasion: 'Spring Supper',
      status: 'draft',
      updatedAt: '2026-04-22T08:00:00.000Z',
      eventDate: '2026-05-10',
      eventTime: null,
      serveTime: null,
      arrivalTime: null,
      guestCount: 10,
      locationAddress: null,
      locationCity: null,
      locationState: null,
      locationZip: null,
      accessInstructions: null,
      dietaryRestrictions: [],
      allergies: [],
      serviceStyle: 'plated',
      specialRequests: null,
      groceryListReady: false,
      prepListReady: false,
      packingListReady: false,
      equipmentListReady: false,
      timelineReady: false,
      executionSheetReady: false,
      nonNegotiablesChecked: false,
      carPacked: false,
      carPackedAt: null,
      shoppingCompletedAt: null,
      prepCompletedAt: null,
      serviceStartedAt: null,
      serviceCompletedAt: null,
      resetComplete: false,
      resetCompletedAt: null,
      followUpSent: false,
      financiallyClosed: false,
      menuApprovalStatus: 'not_sent',
      menuApprovedAt: null,
    },
    menu: {
      attached: false,
      menuIds: [],
      menuNames: [],
      menuStatuses: [],
      dishCount: 0,
      componentCount: 0,
      makeAheadComponentCount: 0,
      updatedAtFingerprint: null,
      finalizedAt: null,
    },
    documents: {
      groceryListReady: false,
      groceryListMissing: ['Menu not attached to event'],
      frontOfHouseMenuReady: false,
      frontOfHouseMenuGeneratedAt: null,
      prepSheetReady: false,
      prepSheetMissing: ['Menu not attached to event'],
      prepSheetGeneratedAt: null,
      executionSheetReady: false,
      executionSheetMissing: ['Menu not attached to event', 'Serve time not set'],
      executionSheetGeneratedAt: null,
      packingListReady: true,
      packingListMissing: [],
      packingListGeneratedAt: null,
      travelRouteReady: false,
      travelRouteMissing: ['No service travel leg added yet - open Travel Plan to add one'],
      travelRouteGeneratedAt: null,
    },
    guests: {
      totalCount: 0,
      attendingCount: 0,
      accountedGuestCount: 0,
      unresolvedGuestCount: 0,
      latestUpdatedAt: null,
    },
    prep: {
      blockCount: 0,
      completedBlockCount: 0,
      timelineDayCount: 0,
      timelineItemCount: 0,
      untimedItemCount: 0,
      latestUpdatedAt: null,
    },
    packing: {
      confirmationCount: 0,
      lastConfirmedAt: null,
    },
    travel: {
      totalLegCount: 0,
      serviceLegCount: 0,
      plannedLegCount: 0,
      inProgressLegCount: 0,
      completedLegCount: 0,
      latestUpdatedAt: null,
    },
    dop: null,
    closeOut: null,
  }
}

function makeConfirmedContext(): ServiceSimulationContext {
  return {
    referenceDate: '2026-04-22',
    event: {
      id: 'event-confirmed',
      occasion: 'Joy Anniversary Dinner',
      status: 'confirmed',
      updatedAt: '2026-04-22T11:00:00.000Z',
      eventDate: '2026-04-25',
      eventTime: null,
      serveTime: '18:30:00',
      arrivalTime: '16:30:00',
      guestCount: 12,
      locationAddress: '123 Main St',
      locationCity: 'Brooklyn',
      locationState: 'NY',
      locationZip: '11201',
      accessInstructions: 'Use the side entrance by the garden gate.',
      dietaryRestrictions: ['pescatarian'],
      allergies: ['sesame'],
      serviceStyle: 'plated',
      specialRequests: 'Birthday dessert surprise.',
      groceryListReady: true,
      prepListReady: true,
      packingListReady: false,
      equipmentListReady: true,
      timelineReady: true,
      executionSheetReady: true,
      nonNegotiablesChecked: false,
      carPacked: false,
      carPackedAt: null,
      shoppingCompletedAt: null,
      prepCompletedAt: null,
      serviceStartedAt: null,
      serviceCompletedAt: null,
      resetComplete: false,
      resetCompletedAt: null,
      followUpSent: false,
      financiallyClosed: false,
      menuApprovalStatus: 'sent',
      menuApprovedAt: null,
    },
    menu: {
      attached: true,
      menuIds: ['menu-1'],
      menuNames: ['Joy Anniversary'],
      menuStatuses: ['draft'],
      dishCount: 5,
      componentCount: 14,
      makeAheadComponentCount: 6,
      updatedAtFingerprint: '2026-04-22T10:00:00.000Z',
      finalizedAt: null,
    },
    documents: {
      groceryListReady: true,
      groceryListMissing: [],
      frontOfHouseMenuReady: true,
      frontOfHouseMenuGeneratedAt: '2026-04-22T08:00:00.000Z',
      prepSheetReady: true,
      prepSheetMissing: [],
      prepSheetGeneratedAt: '2026-04-22T08:15:00.000Z',
      executionSheetReady: true,
      executionSheetMissing: [],
      executionSheetGeneratedAt: null,
      packingListReady: true,
      packingListMissing: [],
      packingListGeneratedAt: '2026-04-22T08:30:00.000Z',
      travelRouteReady: true,
      travelRouteMissing: [],
      travelRouteGeneratedAt: '2026-04-22T08:45:00.000Z',
    },
    guests: {
      totalCount: 12,
      attendingCount: 12,
      accountedGuestCount: 12,
      unresolvedGuestCount: 0,
      latestUpdatedAt: '2026-04-22T09:00:00.000Z',
    },
    prep: {
      blockCount: 4,
      completedBlockCount: 2,
      timelineDayCount: 3,
      timelineItemCount: 6,
      untimedItemCount: 1,
      latestUpdatedAt: '2026-04-22T09:30:00.000Z',
    },
    packing: {
      confirmationCount: 3,
      lastConfirmedAt: '2026-04-22T09:45:00.000Z',
    },
    travel: {
      totalLegCount: 2,
      serviceLegCount: 1,
      plannedLegCount: 1,
      inProgressLegCount: 0,
      completedLegCount: 0,
      latestUpdatedAt: '2026-04-22T10:15:00.000Z',
    },
    dop: {
      completed: 5,
      total: 7,
    },
    closeOut: {
      aarFiled: false,
      resetComplete: false,
      followUpSent: false,
      financiallyClosed: false,
      allComplete: false,
    },
  }
}

describe('service simulation engine', () => {
  it('keeps downstream phases waiting when early-stage truth is missing', () => {
    const context = makeEarlyStageContext()
    const simulation = buildServiceSimulation(context)

    assert.equal(getPhase(context, 'core_facts').status, 'attention')
    assert.equal(getPhase(context, 'menu_guest_truth').status, 'waiting')
    assert.equal(getPhase(context, 'grocery_sourcing').status, 'waiting')
    assert.equal(getPhase(context, 'prep').status, 'waiting')
    assert.equal(getPhase(context, 'travel_arrival').status, 'waiting')
    assert.equal(getPhase(context, 'service').status, 'waiting')
    assert.equal(getPhase(context, 'close_out').status, 'waiting')
    assert.match(getPhase(context, 'menu_guest_truth').summary, /unknown/i)
    assert.equal(simulation.counts.waiting >= 5, true)
    assert.equal(simulation.rollup.criticalBlockerCount >= 3, true)
    assert.equal(
      simulation.severityBands.mustFix.some((item) => item.id === 'arrival_logistics'),
      true
    )
  })

  it('treats placeholder location values as unknown instead of venue truth', () => {
    const context = makeConfirmedContext()
    context.event.locationAddress = 'TBD'
    context.event.locationCity = 'Unknown'
    context.event.locationState = null
    context.event.locationZip = 'N/A'
    context.documents.travelRouteReady = true
    context.travel.serviceLegCount = 1

    const coreFacts = getPhase(context, 'core_facts')
    const travel = getPhase(context, 'travel_arrival')
    const service = getPhase(context, 'service')

    assert.equal(coreFacts.status, 'attention')
    assert.equal(coreFacts.missingItems.some((item) => item.id === 'core-location'), true)
    assert.equal(travel.status, 'waiting')
    assert.equal(service.status, 'waiting')
  })

  it('produces actionable routes from current confirmed-event truth', () => {
    const context = makeConfirmedContext()
    const simulation = buildServiceSimulation(context)
    const servicePhase = getPhase(context, 'service')
    const prepPhase = getPhase(context, 'prep')
    const packingPhase = getPhase(context, 'equipment_packing')

    assert.equal(getPhase(context, 'menu_guest_truth').status, 'ready')
    assert.equal(getPhase(context, 'grocery_sourcing').status, 'ready')
    assert.equal(prepPhase.status, 'ready')
    assert.equal(servicePhase.status, 'attention')
    assert.equal(packingPhase.status, 'ready')
    assert.equal(servicePhase.missingItems[0]?.route, '/events/event-confirmed/schedule')
    assert.equal(prepPhase.riskFlags[0]?.route, '/events/event-confirmed/prep-plan')
    assert.match(simulation.summary, /blocking proof/i)
    assert.equal(simulation.rollup.warningCount >= 2, true)
    assert.equal(
      simulation.severityBands.mustFix.some((item) => item.id === 'service_plan_flow'),
      true
    )
  })

  it('only marks close-out complete when post-service facts are actually complete', () => {
    const context = makeConfirmedContext()
    context.event.status = 'completed'
    context.event.serviceCompletedAt = '2026-04-25T23:00:00.000Z'
    context.closeOut = {
      aarFiled: true,
      resetComplete: true,
      followUpSent: true,
      financiallyClosed: true,
      allComplete: true,
    }

    assert.equal(getPhase(context, 'service').status, 'attention')
    assert.equal(getPhase(context, 'close_out').status, 'complete')
  })

  it('builds hard and soft transition gates from deterministic simulation state', () => {
    const softContext = makeConfirmedContext()
    const softGate = getServiceSimulationTransitionGate(buildPanelState(softContext, 'unsimulated'), 'confirmed')

    assert.equal(softGate.status, 'soft')
    assert.equal(softGate.reasons.some((reason) => reason.code === 'unsimulated'), true)

    const hardContext = makeConfirmedContext()
    hardContext.travel.serviceLegCount = 0
    const hardGate = getServiceSimulationTransitionGate(buildPanelState(hardContext, 'current'), 'in_progress')

    assert.equal(hardGate.status, 'hard')
    assert.equal(hardGate.reasons.some((reason) => reason.code === 'critical'), true)
  })
})

describe('service simulation staleness', () => {
  it('hashes normalized snapshots deterministically and reports material changes', () => {
    const context = makeConfirmedContext()
    const baseSnapshot = buildServiceSimulationSnapshot(context)
    const reorderedSnapshot = {
      ...baseSnapshot,
      dietaryRestrictions: ['pescatarian'],
      allergies: ['sesame'],
    }

    assert.equal(
      hashServiceSimulationSnapshot(baseSnapshot),
      hashServiceSimulationSnapshot(reorderedSnapshot)
    )

    const nextContext = makeConfirmedContext()
    nextContext.event.guestCount = 14
    nextContext.menu.componentCount = 16
    nextContext.packing.confirmationCount = 5
    const nextSnapshot = buildServiceSimulationSnapshot(nextContext)
    const reasons = diffServiceSimulationSnapshots(baseSnapshot, nextSnapshot)

    assert.deepEqual(
      reasons.map((reason) => reason.code),
      ['guest_count', 'menu', 'packing']
    )
  })
})
