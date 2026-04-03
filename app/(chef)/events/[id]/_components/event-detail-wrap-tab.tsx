import Link from 'next/link'
import { format } from 'date-fns'
import type { EventDetailTab } from '@/components/events/event-detail-mobile-nav'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import { AARGeneratorPanel } from '@/components/ai/aar-generator-panel'
import { ReviewRequestPanel } from '@/components/ai/review-request-panel'
import { GratuityPanel } from '@/components/ai/gratuity-panel'
import { SocialCaptionsPanel } from '@/components/ai/social-captions-panel'
import { EntityActivityTimeline } from '@/components/activity/entity-activity-timeline'
import { PostEventTrustPanel } from '@/components/events/post-event-trust-panel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type EventTransition = {
  id: string
  from_status?: string | null
  to_status: string
  transitioned_at: string
  metadata?: unknown
}

type EventDetailWrapTabProps = {
  activeTab: EventDetailTab
  eventId: string
  eventStatus: string
  eventClientId: string | null
  followUpSent: boolean
  followUpSentAt: string | null
  debriefCompletedAt: string | null
  hasAAR: boolean
  hasClosureStatus: boolean
  transitions: EventTransition[]
  timelineEntries: any[]
}

export function EventDetailWrapTab({
  activeTab,
  eventId,
  eventStatus,
  eventClientId,
  followUpSent,
  followUpSentAt,
  debriefCompletedAt,
  hasAAR,
  hasClosureStatus,
  transitions,
  timelineEntries,
}: EventDetailWrapTabProps) {
  return (
    <EventDetailSection tab="wrap" activeTab={activeTab}>
      {/* File AAR button - prominent, for completed events without AAR */}
      {eventStatus === 'completed' && !hasAAR && !hasClosureStatus && (
        <Card className="p-6 border-brand-700 bg-brand-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-brand-200">Ready to review this dinner?</h2>
              <p className="text-sm text-brand-400 mt-1">
                File your Event Review to track what went well and what to improve.
              </p>
            </div>
            <Link href={`/events/${eventId}/aar`}>
              <Button>File Event Review</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Post-Event Debrief CTA - capture what you learned while it's fresh */}
      {eventStatus === 'completed' && !debriefCompletedAt && (
        <Card className="p-6 border-amber-200 bg-amber-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-amber-900">Capture what you learned tonight</h2>
              <p className="text-sm text-amber-700 mt-1">
                Client insights, recipe notes, dish photos &#8212; while it&#39;s still fresh.
              </p>
            </div>
            <Link href={`/events/${eventId}/debrief`}>
              <Button>Start Debrief</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Debrief complete indicator */}
      {eventStatus === 'completed' && debriefCompletedAt && (
        <Card className="p-4 border-green-200 bg-green-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-medium">&#10003;</span>
              <span className="text-sm font-medium text-green-900">Debrief complete</span>
              <span className="text-xs text-emerald-600">
                {format(new Date(debriefCompletedAt), 'MMM d')}
              </span>
            </div>
            <Link href={`/events/${eventId}/debrief`}>
              <Button variant="ghost" size="sm">
                View / Edit
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <PostEventTrustPanel
        eventId={eventId}
        eventStatus={eventStatus}
        hasClient={Boolean(eventClientId)}
        followUpSent={followUpSent}
        followUpSentAt={followUpSentAt}
      />

      {/* AI AAR Generator - for completed events without a filed review */}
      {eventStatus === 'completed' && !hasAAR && <AARGeneratorPanel eventId={eventId} />}

      {/* AI Review Request Drafter */}
      {eventStatus === 'completed' && <ReviewRequestPanel eventId={eventId} />}

      {/* AI Gratuity Framing */}
      {eventStatus === 'completed' && <GratuityPanel eventId={eventId} />}

      {/* AI Social Media Captions */}
      {eventStatus === 'completed' && <SocialCaptionsPanel eventId={eventId} />}

      {/* Transition History */}
      {transitions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Status History</h2>
          <div className="space-y-3">
            {transitions.map((transition) => (
              <div key={transition.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-brand-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {transition.from_status && (
                      <>
                        <span className="text-sm font-medium text-stone-100 capitalize">
                          {transition.from_status}
                        </span>
                        <span className="text-stone-300">&rarr;</span>
                      </>
                    )}
                    <span className="text-sm font-medium text-stone-100 capitalize">
                      {transition.to_status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {format(new Date(transition.transitioned_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  {typeof transition.metadata === 'object' &&
                    transition.metadata !== null &&
                    'reason' in transition.metadata && (
                      <p className="text-sm text-stone-300 mt-1">
                        Reason: {String((transition.metadata as Record<string, unknown>).reason)}
                      </p>
                    )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <EntityActivityTimeline entityType="event" entityId={eventId} entries={timelineEntries} />
    </EventDetailSection>
  )
}
