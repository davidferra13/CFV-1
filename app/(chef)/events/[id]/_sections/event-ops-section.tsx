// Server component: fetches ops-tab data for a single event
import { requireChef } from '@/lib/auth/get-user'
import {
  getEventClosureStatus,
  updateEventTimeAndCard,
  startEventActivity,
  stopEventActivity,
} from '@/lib/events/actions'
import { getAARByEventId } from '@/lib/aar/actions'
import {
  getDocumentReadiness,
  getBusinessDocInfo,
  type DocumentReadiness,
} from '@/lib/documents/actions'
import { hasAllergyData } from '@/lib/documents/generate-allergy-card'
import { getUnrecordedComponentsForEvent } from '@/lib/recipes/actions'
import { isAIConfigured } from '@/lib/ai/parse'
import { getEventModifications } from '@/lib/menus/modifications'
import { getUnusedIngredients } from '@/lib/expenses/unused'
import { getSubstitutions } from '@/lib/shopping/substitutions'
import { getEventContingencyNotes, listEmergencyContacts } from '@/lib/contingency/actions'
import { getEventTempLog } from '@/lib/compliance/actions'
import { listStaffMembers, getEventStaffRoster } from '@/lib/staff/actions'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { getAvailableCarryForwardItems } from '@/lib/events/carry-forward'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { evaluateReadinessForDocumentGeneration, getEventReadiness } from '@/lib/events/readiness'
import { loadEventServiceSimulationPanelState } from '@/lib/service-simulation/state'
import { getCourseProgress } from '@/lib/service-execution/actions'
import { getEventStationPlan } from '@/lib/stations/event-station-actions'
import { getEventPricingIntelligence } from '@/lib/finance/event-pricing-intelligence-actions'
import { getServiceTrackerState } from '@/lib/lifecycle/service-tracker-actions'
import { getServiceTimeline } from '@/lib/lifecycle/timeline-generator-actions'
import { createServerClient } from '@/lib/db/server'
import { EventDetailOpsTab } from '../_components/event-detail-ops-tab'

async function getEventMenusForCheck(eventId: string): Promise<string[] | null> {
  const db: any = createServerClient()
  const { data: menus } = await db.from('menus').select('id, name').eq('event_id', eventId)
  if (!menus || menus.length === 0) return null
  return menus.map((m: any) => m.id)
}

async function getEventFinancialSummary(eventId: string) {
  const db: any = createServerClient()
  const { data: summary } = await db
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()
  return {
    totalPaid: summary?.total_paid_cents ?? 0,
    totalRefunded: summary?.total_refunded_cents ?? 0,
    outstandingBalance: summary?.outstanding_balance_cents ?? 0,
    financialAvailable: Boolean(summary),
  }
}

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventOpsSection({ eventId, tenantId, event, activeTab }: Props) {
  const user = await requireChef()
  const isCompletedOrBeyond = ['completed', 'in_progress'].includes(event.status)
  const canTrackTime = !['draft', 'cancelled'].includes(event.status)
  const isEventOwner = (event as any).tenant_id === user.entityId

  const [
    closureStatus,
    aar,
    docReadiness,
    businessDocs,
    eventMenus,
    unrecordedComponents,
    aiConfigured,
    menuMods,
    unusedItems,
    substitutionItems,
    eventReadiness,
    documentReadinessGate,
    contingencyNotes,
    emergencyContacts,
    tempLogs,
    staffMembers,
    staffAssignments,
    eventCollaborators,
    carryForwardItems,
    eventPhotos,
    serviceSimulationState,
    courseProgress,
    stationPlan,
    eventHasAllergyData,
  ] = await Promise.all([
    isCompletedOrBeyond ? getEventClosureStatus(eventId).catch(() => null) : Promise.resolve(null),
    isCompletedOrBeyond ? getAARByEventId(eventId) : Promise.resolve(null),
    getDocumentReadiness(eventId).catch(
      (): DocumentReadiness => ({
        eventSummary: { ready: false, missing: [] },
        groceryList: { ready: false, missing: [] },
        frontOfHouseMenu: { ready: false, missing: [] },
        prepSheet: { ready: false, missing: [] },
        executionSheet: { ready: false, missing: [] },
        checklist: { ready: false, missing: [] },
        packingList: { ready: false, missing: [] },
        resetChecklist: { ready: false, missing: [] },
        travelRoute: { ready: false, missing: [] },
        platingGuide: { ready: false, missing: [] },
        allergenReference: { ready: false, missing: [] },
        venueRecon: { ready: false, missing: [] },
        beverageNotes: { ready: false, missing: [] },
        clientContact: { ready: false, missing: [] },
        miseCheck: { ready: false, missing: [] },
      })
    ),
    getBusinessDocInfo(eventId).catch(() => null),
    getEventMenusForCheck(eventId).catch(() => [] as string[]),
    isCompletedOrBeyond ? getUnrecordedComponentsForEvent(eventId) : Promise.resolve([]),
    isAIConfigured().catch(() => false),
    isCompletedOrBeyond ? getEventModifications(eventId) : Promise.resolve([]),
    isCompletedOrBeyond ? getUnusedIngredients(eventId) : Promise.resolve([]),
    getSubstitutions(eventId).catch(() => []),
    getEventReadiness(eventId).catch(() => null),
    evaluateReadinessForDocumentGeneration(eventId).catch(() => null),
    event.status !== 'cancelled'
      ? getEventContingencyNotes(eventId).catch(() => [])
      : Promise.resolve([]),
    event.status !== 'cancelled' ? listEmergencyContacts().catch(() => []) : Promise.resolve([]),
    ['in_progress', 'completed'].includes(event.status)
      ? getEventTempLog(eventId).catch(() => [])
      : Promise.resolve([]),
    !['draft', 'cancelled'].includes(event.status)
      ? listStaffMembers().catch(() => [])
      : Promise.resolve([]),
    !['draft', 'cancelled'].includes(event.status)
      ? getEventStaffRoster(eventId).catch(() => [])
      : Promise.resolve([]),
    getEventCollaborators(eventId).catch(() => []),
    event.status !== 'cancelled'
      ? getAvailableCarryForwardItems(eventId).catch(() => [])
      : Promise.resolve([]),
    isCompletedOrBeyond ? getEventPhotosForChef(eventId) : Promise.resolve([]),
    loadEventServiceSimulationPanelState(eventId).catch(() => null),
    event.status === 'in_progress'
      ? getCourseProgress(eventId).catch(() => [])
      : Promise.resolve([]),
    getEventStationPlan(eventId).catch(() => null),
    hasAllergyData(eventId).catch(() => false),
  ])

  // Day-of service tracker state and timeline (only for in_progress events)
  const [serviceTrackerState, serviceTimeline] = await Promise.all([
    event.status === 'in_progress'
      ? getServiceTrackerState(eventId).catch(() => null)
      : Promise.resolve(null),
    event.status === 'in_progress'
      ? getServiceTimeline(eventId).catch(() => null)
      : Promise.resolve(null),
  ])

  // Financial summary for eventTotalCents
  const { totalPaid } = await getEventFinancialSummary(eventId).catch(() => ({
    totalPaid: 0,
    totalRefunded: 0,
    outstandingBalance: 0,
    financialAvailable: false,
  }))
  const eventTotalCents = (event as any).total_price_cents ?? (event as any).quoted_price_cents ?? 0

  return (
    <EventDetailOpsTab
      activeTab={activeTab as any}
      event={event}
      canTrackTime={canTrackTime}
      updateEventTimeAndCard={updateEventTimeAndCard}
      startEventActivity={startEventActivity}
      stopEventActivity={stopEventActivity}
      staffMembers={staffMembers as any[]}
      staffAssignments={staffAssignments as any[]}
      isEventOwner={isEventOwner}
      eventCollaborators={eventCollaborators as any[]}
      tempLogs={tempLogs as any[]}
      substitutionItems={substitutionItems}
      isCompletedOrBeyond={isCompletedOrBeyond}
      menuMods={menuMods as any[]}
      carryForwardItems={carryForwardItems}
      unusedItems={unusedItems as any[]}
      contingencyNotes={contingencyNotes as any[]}
      emergencyContacts={emergencyContacts as any[]}
      docReadiness={docReadiness}
      businessDocs={businessDocs}
      eventReadiness={eventReadiness}
      documentReadinessGate={documentReadinessGate}
      closureStatus={closureStatus}
      aar={aar}
      eventPhotos={eventPhotos}
      eventMenus={eventMenus as any}
      unrecordedComponents={unrecordedComponents}
      aiConfigured={aiConfigured}
      hasAllergyData={eventHasAllergyData as boolean}
      eventTotalCents={eventTotalCents}
      serviceSimulationState={serviceSimulationState}
      courseProgress={courseProgress}
      stationPlan={stationPlan}
      serviceTrackerState={serviceTrackerState}
      serviceTimeline={serviceTimeline}
    />
  )
}
