// Client hub group detail - wraps existing HubGroupView in client layout

import { notFound } from 'next/navigation'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getOrCreateClientHubProfile } from '@/lib/hub/client-hub-actions'
import {
  getGroupByToken,
  getGroupMembers,
  getGroupEvents,
  joinHubGroup,
} from '@/lib/hub/group-actions'
import { getGroupNotes } from '@/lib/hub/message-actions'
import { getGroupMedia } from '@/lib/hub/media-actions'
import { getGroupAvailability } from '@/lib/hub/availability-actions'
import { getMealBoard } from '@/lib/hub/meal-board-actions'
import { HubGroupView } from '@/app/(public)/hub/g/[groupToken]/hub-group-view'
import { HubBridgeView } from '@/components/hub/hub-bridge-view'

interface Props {
  params: Promise<{ groupToken: string }>
}

export async function generateMetadata({ params }: Props) {
  const { groupToken } = await params
  const group = await getGroupByToken(groupToken)
  return { title: group ? `${group.name} - My Hub` : 'Hub Group' }
}

export default async function ClientHubGroupPage({ params }: Props) {
  await requireClient()
  const { groupToken } = await params
  const profile = await getOrCreateClientHubProfile()

  const group = await getGroupByToken(groupToken)
  if (!group || !group.is_active) notFound()

  // Only auto-join if already a member (idempotent refresh).
  // New visitors see the guest join prompt in HubGroupView instead.
  const db = createServerClient({ admin: true })
  const { data: existingMembership } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('profile_id', profile.id)
    .maybeSingle()
  if (existingMembership) {
    await joinHubGroup({ groupToken, profileId: profile.id })
  }

  const [members, notes, media, availability, groupEvents, mealBoardEntries] = await Promise.all([
    getGroupMembers(group.id),
    getGroupNotes(group.id),
    getGroupMedia({ groupId: group.id }),
    getGroupAvailability(group.id),
    getGroupEvents(group.id),
    getMealBoard({ groupId: group.id }),
  ])

  // Bridge groups get the slim intro view
  if (group.group_type === 'bridge') {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <HubBridgeView
          group={group}
          members={members}
          profileToken={profile.profile_token}
          currentProfileId={profile.id}
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

  // Pass profileToken as a prop - the HubGroupView will set the cookie client-side
  return (
    <div className="mx-auto max-w-4xl">
      <HubGroupView
        group={group}
        members={members}
        notes={notes}
        media={media}
        availability={availability}
        groupEvents={groupEvents}
        mealBoardEntries={mealBoardEntries}
        profileToken={profile.profile_token}
      />
    </div>
  )
}

export const dynamic = 'force-dynamic'
