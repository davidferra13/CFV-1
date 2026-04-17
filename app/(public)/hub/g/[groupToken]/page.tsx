import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rateLimit'
import { getGroupByToken, getGroupMembers, getGroupEvents } from '@/lib/hub/group-actions'
import { getGroupNotes } from '@/lib/hub/message-actions'
import { getGroupMedia } from '@/lib/hub/media-actions'
import { getGroupAvailability } from '@/lib/hub/availability-actions'
import { getMealBoard } from '@/lib/hub/meal-board-actions'
import { getCriticalPathForGuest } from '@/lib/lifecycle/critical-path'
import { getLifecycleProgressForClient } from '@/lib/lifecycle/actions'
import { HubGroupView } from './hub-group-view'
import { HubBridgeView } from '@/components/hub/hub-bridge-view'
import { CircleArchiveView } from '@/components/hub/circle-archive-view'

interface Props {
  params: Promise<{ groupToken: string }>
}

export default async function HubGroupPage({ params }: Props) {
  const { groupToken } = await params
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  try {
    await checkRateLimit(`hub-group:${ip}`, 60, 15 * 60 * 1000)
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-400">
        Too many requests. Please try again later.
      </div>
    )
  }

  const group = await getGroupByToken(groupToken)

  if (!group) {
    notFound()
  }

  // Circle was archived (event completed or manually closed): show archive timeline
  if (!group.is_active) {
    const archiveEvents = await getGroupEvents(group.id).catch(() => [])
    const archiveEvent = archiveEvents[0] as any | undefined

    return (
      <div className="min-h-screen bg-stone-950 p-6 space-y-6">
        <div className="max-w-2xl mx-auto">
          {archiveEvent ? (
            <CircleArchiveView
              groupId={group.id}
              eventId={archiveEvent.event_id}
              eventStatus={archiveEvent.status ?? 'completed'}
              eventDate={archiveEvent.event_date ?? null}
              occasion={archiveEvent.occasion ?? null}
              location={archiveEvent.location ?? null}
              guestCount={archiveEvent.guest_count ?? null}
              chefName={null}
              profileToken={groupToken}
            />
          ) : (
            <div className="text-center py-12">
              <h1 className="text-xl font-semibold text-stone-200 mb-2">This circle has ended</h1>
              <p className="text-stone-400 text-sm">Thanks for being part of it.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const [
    members,
    notes,
    media,
    availability,
    groupEvents,
    mealBoardEntries,
    guestStatus,
    lifecycleClient,
  ] = await Promise.all([
    getGroupMembers(group.id).catch(() => []),
    getGroupNotes(group.id).catch(() => []),
    getGroupMedia({ groupId: group.id }).catch(() => []),
    getGroupAvailability(group.id).catch(() => []),
    getGroupEvents(group.id).catch(() => []),
    getMealBoard({ groupId: group.id }).catch(() => []),
    // Skip event lifecycle queries for community circles (no event, no tenant)
    group.group_type === 'community'
      ? Promise.resolve(null)
      : getCriticalPathForGuest(groupToken).catch(() => null),
    group.group_type === 'community'
      ? Promise.resolve(null)
      : getLifecycleProgressForClient(groupToken).catch(() => null),
  ])

  // Branch: bridge groups get the slim intro view, not the full Dinner Circle
  if (group.group_type === 'bridge') {
    return (
      <div className="min-h-screen bg-stone-950 p-4">
        <HubBridgeView
          group={group}
          members={members}
          profileToken={null}
          currentProfileId={null}
          bridgeId={null}
          introMode={null}
          bridgeStatus={null}
          isSourceChef={false}
          isTargetChef={false}
          targetCircleToken={null}
          clientDisplayName={group.name?.replace('Introduction: ', '') ?? null}
        />
      </div>
    )
  }

  return (
    <HubGroupView
      group={group}
      members={members}
      notes={notes}
      media={media}
      availability={availability}
      groupEvents={groupEvents}
      mealBoardEntries={mealBoardEntries}
      guestStatus={guestStatus}
      lifecycleStages={lifecycleClient?.stages || []}
      linkedEventId={groupEvents[0]?.event_id ?? null}
    />
  )
}

// L4 fix: Private dinner circle data must never be indexed by search engines
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'
