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

  if (!group || !group.is_active) {
    notFound()
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
    getGroupMembers(group.id),
    getGroupNotes(group.id),
    getGroupMedia({ groupId: group.id }),
    getGroupAvailability(group.id),
    getGroupEvents(group.id),
    getMealBoard({ groupId: group.id }),
    getCriticalPathForGuest(groupToken).catch(() => null),
    getLifecycleProgressForClient(groupToken).catch(() => null),
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
    />
  )
}

export const dynamic = 'force-dynamic'
