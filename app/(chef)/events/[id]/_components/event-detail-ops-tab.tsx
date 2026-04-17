import Link from 'next/link'
import type { EventDetailTab } from '@/components/events/event-detail-mobile-nav'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import { TimeTracking } from '@/components/events/time-tracking'
import { EventStaffPanel } from '@/components/events/event-staff-panel'
import { StaffBriefingAIPanel } from '@/components/ai/staff-briefing-ai-panel'
import { PrepTimelinePanel } from '@/components/ai/prep-timeline-panel'
import { ServiceTimelinePanel } from '@/components/ai/service-timeline-panel'
import { EventCollaboratorsPanel } from '@/components/events/event-collaborators-panel'
import { CollaboratorPanel } from '@/components/events/collaborator-panel'
import { TravelIngredientsPanel } from '@/components/events/travel-ingredients-panel'
import { TempLogPanel } from '@/components/events/temp-log-panel'
import { TempSafetyPanel } from '@/components/ai/temp-safety-panel'
import { ShoppingSubstitutions } from '@/components/events/shopping-substitutions'
import { MenuModifications } from '@/components/events/menu-modifications'
import { AvailableLeftovers } from '@/components/events/available-leftovers'
import { CarryForwardMatchPanel } from '@/components/ai/carry-forward-match-panel'
import { GroceryConsolidationPanel } from '@/components/ai/grocery-consolidation-panel'
import { UnusedIngredients } from '@/components/events/unused-ingredients'
import { ContingencyPanel } from '@/components/events/contingency-panel'
import { ContingencyAIPanel } from '@/components/ai/contingency-ai-panel'
import { DocumentSection } from '@/components/documents/document-section'
import { AllergyCardButton } from '@/components/events/allergy-card-button'
import { ReadinessGatePanel } from '@/components/events/readiness-gate-panel'
import { PrepPlanPanel } from '@/components/events/prep-plan-panel'
import { EventTransitions } from '@/components/events/event-transitions'
import { EventClosureActions } from '@/components/events/event-closure-actions'
import { EventPhotoGallery } from '@/components/events/event-photo-gallery'
import { RecipeCapturePrompt } from '@/components/recipes/recipe-capture-prompt'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type EventDetailOpsTabProps = {
  activeTab: EventDetailTab
  event: any
  canTrackTime: boolean
  updateEventTimeAndCard: any
  startEventActivity: any
  stopEventActivity: any
  staffMembers: any[]
  staffAssignments: any[]
  isEventOwner: boolean
  eventCollaborators: any[]
  tempLogs: any[]
  substitutionItems: any[]
  isCompletedOrBeyond: boolean
  menuMods: any[]
  carryForwardItems: any[]
  unusedItems: any[]
  contingencyNotes: any[]
  emergencyContacts: any[]
  docReadiness: any
  businessDocs: any
  eventReadiness: any
  closureStatus: any
  aar: any
  eventPhotos: any[]
  eventMenus: string[] | null
  unrecordedComponents: any[]
  aiConfigured: boolean
  hasAllergyData: boolean
  revenueSplitCollaborators: any[]
  eventTotalCents: number
}

export function EventDetailOpsTab(props: EventDetailOpsTabProps) {
  const {
    activeTab,
    event,
    canTrackTime,
    updateEventTimeAndCard,
    startEventActivity,
    stopEventActivity,
    staffMembers,
    staffAssignments,
    isEventOwner,
    eventCollaborators,
    tempLogs,
    substitutionItems,
    isCompletedOrBeyond,
    menuMods,
    carryForwardItems,
    unusedItems,
    contingencyNotes,
    emergencyContacts,
    docReadiness,
    businessDocs,
    eventReadiness,
    closureStatus,
    aar,
    eventPhotos,
    eventMenus,
    unrecordedComponents,
    aiConfigured,
    hasAllergyData,
    revenueSplitCollaborators,
    eventTotalCents,
  } = props

  return (
    <EventDetailSection tab="ops" activeTab={activeTab}>
      {/* Time Tracking */}
      {canTrackTime && (
        <TimeTracking
          eventId={event.id}
          initialData={{
            time_shopping_minutes: (event as any).time_shopping_minutes ?? null,
            time_prep_minutes: (event as any).time_prep_minutes ?? null,
            time_travel_minutes: (event as any).time_travel_minutes ?? null,
            time_service_minutes: (event as any).time_service_minutes ?? null,
            time_reset_minutes: (event as any).time_reset_minutes ?? null,
            shopping_started_at: (event as any).shopping_started_at ?? null,
            shopping_completed_at: (event as any).shopping_completed_at ?? null,
            prep_started_at: (event as any).prep_started_at ?? null,
            prep_completed_at: (event as any).prep_completed_at ?? null,
            travel_started_at: (event as any).travel_started_at ?? null,
            travel_completed_at: (event as any).travel_completed_at ?? null,
            service_started_at: (event as any).service_started_at ?? null,
            service_completed_at: (event as any).service_completed_at ?? null,
            reset_started_at: (event as any).reset_started_at ?? null,
            reset_completed_at: (event as any).reset_completed_at ?? null,
          }}
          onSave={updateEventTimeAndCard}
          onStart={startEventActivity}
          onStop={stopEventActivity}
        />
      )}

      {/* Prep Plan - component-aware day-by-day breakdown */}
      {event.status !== 'cancelled' && (
        <PrepPlanPanel
          eventId={event.id}
          eventDate={event.event_date}
          eventStatus={event.status}
          hasMenu={!!eventMenus}
        />
      )}

      {/* Event Staff */}
      {!['draft', 'cancelled'].includes(event.status) && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Event Staff</h2>
          <EventStaffPanel
            eventId={event.id}
            roster={staffMembers as any}
            assignments={staffAssignments as any}
          />
        </Card>
      )}

      {/* AI Staff Briefing */}
      {!['draft', 'cancelled'].includes(event.status) && (
        <StaffBriefingAIPanel eventId={event.id} />
      )}

      {/* AI Prep Timeline */}
      {['confirmed', 'in_progress'].includes(event.status) && (
        <PrepTimelinePanel eventId={event.id} />
      )}

      {/* AI Service Timeline */}
      {['confirmed', 'in_progress'].includes(event.status) && (
        <ServiceTimelinePanel eventId={event.id} />
      )}

      {/* Chef Collaboration (network) - shown to event owner on any non-cancelled event */}
      {event.status !== 'cancelled' && (
        <EventCollaboratorsPanel
          eventId={event.id}
          isOwner={isEventOwner}
          collaborators={eventCollaborators as any}
        />
      )}

      {/* Revenue Split Collaborators - station assignments and split management */}
      {event.status !== 'cancelled' && isEventOwner && (
        <CollaboratorPanel
          eventId={event.id}
          initialCollaborators={revenueSplitCollaborators}
          eventTotalCents={eventTotalCents}
        />
      )}

      {/* Temperature Log â€” active and completed events */}
      {['in_progress', 'completed'].includes(event.status) && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Temperature Log</h2>
          <TempLogPanel eventId={event.id} initialLogs={tempLogs as any} />
        </Card>
      )}

      {/* AI Temperature Safety Analysis */}
      {['in_progress', 'completed'].includes(event.status) && (
        <TempSafetyPanel eventId={event.id} />
      )}

      {/* Shopping Substitutions â€” available for any non-draft event */}
      {!['draft', 'cancelled'].includes(event.status) && (
        <ShoppingSubstitutions eventId={event.id} initialItems={substitutionItems} />
      )}

      {/* Menu Modifications â€” for completed events */}
      {isCompletedOrBeyond && (
        <MenuModifications eventId={event.id} initialModifications={menuMods as any} />
      )}

      {/* Carry-Forward Inventory â€” leftovers from other events available for use here */}
      {event.status !== 'cancelled' && (
        <AvailableLeftovers eventId={event.id} items={carryForwardItems} />
      )}

      {/* AI Carry-Forward Ingredient Matching */}
      {event.status !== 'cancelled' && <CarryForwardMatchPanel eventId={event.id} />}

      {/* AI Grocery List Consolidation */}
      {eventMenus && event.status !== 'cancelled' && (
        <GroceryConsolidationPanel eventId={event.id} />
      )}

      {/* Unused Ingredients â€” for completed events */}
      {isCompletedOrBeyond && (
        <UnusedIngredients eventId={event.id} initialItems={unusedItems as any} />
      )}

      {/* Contingency Plans */}
      {event.status !== 'cancelled' && (
        <Card className="p-6">
          <ContingencyPanel
            eventId={event.id}
            initialNotes={contingencyNotes as any}
            emergencyContacts={emergencyContacts as any}
          />
        </Card>
      )}

      {/* AI Contingency Suggestions */}
      {event.status !== 'cancelled' && <ContingencyAIPanel eventId={event.id} />}

      {/* Travel Ingredients - shows ingredients by travel leg/stop */}
      {event.status !== 'cancelled' && <TravelIngredientsPanel eventId={event.id} />}

      {/* Printed Documents (8 Sheets) + Business Documents */}
      <DocumentSection eventId={event.id} readiness={docReadiness} businessDocs={businessDocs} />

      {/* Emergency Allergy Card (standalone landscape PDF for kitchen) */}
      <AllergyCardButton eventId={event.id} hasAllergyData={hasAllergyData} />

      {/* Readiness Gate Panel â€” shown for events approaching their next transition */}
      {eventReadiness && eventReadiness.gates.length > 0 && (
        <ReadinessGatePanel
          eventId={event.id}
          readiness={eventReadiness}
          targetLabel={
            event.status === 'paid'
              ? 'Confirm Event'
              : event.status === 'confirmed'
                ? 'Start Service'
                : event.status === 'in_progress'
                  ? 'Complete Service'
                  : 'Next Step'
          }
        />
      )}

      {/* Event Transitions (Actions) */}
      <EventTransitions event={event} readiness={eventReadiness} />

      {/* Closure Status â€” for completed events */}
      {event.status === 'completed' && closureStatus && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">Post-Event Closure</h2>
            {closureStatus.allComplete && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-800">
                All Complete
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.aarFiled ? 'bg-green-900 text-emerald-600' : 'bg-red-900 text-red-600'}`}
              >
                {closureStatus.aarFiled ? '\u2713' : '\u2717'}
              </span>
              <span className="text-sm text-stone-300">AAR Filed</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.resetComplete ? 'bg-green-900 text-emerald-600' : 'bg-red-900 text-red-600'}`}
              >
                {closureStatus.resetComplete ? '\u2713' : '\u2717'}
              </span>
              <span className="text-sm text-stone-300">Reset Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.followUpSent ? 'bg-green-900 text-emerald-600' : 'bg-red-900 text-red-600'}`}
              >
                {closureStatus.followUpSent ? '\u2713' : '\u2717'}
              </span>
              <span className="text-sm text-stone-300">Follow-Up Sent</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.financiallyClosed ? 'bg-green-900 text-emerald-600' : 'bg-red-900 text-red-600'}`}
              >
                {closureStatus.financiallyClosed ? '\u2713' : '\u2717'}
              </span>
              <span className="text-sm text-stone-300">Financially Closed</span>
            </div>
          </div>

          {/* Action buttons for incomplete items */}
          <div className="flex flex-wrap gap-2">
            {!closureStatus.aarFiled && (
              <Link href={`/events/${event.id}/aar`}>
                <Button size="sm">File Event Review</Button>
              </Link>
            )}
            <EventClosureActions
              eventId={event.id}
              resetComplete={closureStatus.resetComplete}
              followUpSent={closureStatus.followUpSent}
            />
            <Link href={`/events/${event.id}/financial`}>
              <Button size="sm" variant={closureStatus.financiallyClosed ? 'ghost' : 'secondary'}>
                {closureStatus.financiallyClosed
                  ? 'View Financial Summary'
                  : 'Open Financial Summary'}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* AAR Summary â€” if filed */}
      {aar && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">Event Review</h2>
            <div className="flex gap-2">
              <Link href={`/events/${event.id}/aar`}>
                <Button variant="ghost" size="sm">
                  Edit Review
                </Button>
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <dt className="text-sm font-medium text-stone-500">Calm Rating</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                {aar.calm_rating}/5
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Preparation Rating</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                {aar.preparation_rating}/5
              </dd>
            </div>
            {aar.forgotten_items && aar.forgotten_items.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Forgotten Items</dt>
                <dd className="mt-1">
                  <div className="flex flex-wrap gap-1">
                    {aar.forgotten_items.map((item: string) => (
                      <span
                        key={item}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-800"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
          </dl>

          {(aar.what_went_well || aar.what_went_wrong) && (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-800">
              {aar.what_went_well && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">What went well</dt>
                  <dd className="text-sm text-stone-100 mt-1 whitespace-pre-wrap">
                    {aar.what_went_well}
                  </dd>
                </div>
              )}
              {aar.what_went_wrong && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">What went wrong</dt>
                  <dd className="text-sm text-stone-100 mt-1 whitespace-pre-wrap">
                    {aar.what_went_wrong}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </Card>
      )}

      {/* Dinner Photos â€” upload and manage dish photos after the event */}
      {isCompletedOrBeyond && <EventPhotoGallery eventId={event.id} initialPhotos={eventPhotos} />}

      {/* Recipe Capture â€” for completed/in_progress events with menus */}
      {isCompletedOrBeyond && eventMenus && (
        <RecipeCapturePrompt
          eventId={event.id}
          unrecordedComponents={unrecordedComponents}
          aiConfigured={aiConfigured}
        />
      )}
    </EventDetailSection>
  )
}
