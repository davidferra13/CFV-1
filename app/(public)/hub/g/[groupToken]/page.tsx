import { notFound } from 'next/navigation'
import { getGroupByToken, getGroupMembers, getGroupEvents } from '@/lib/hub/group-actions'
import { getGroupNotes } from '@/lib/hub/message-actions'
import { getGroupMedia } from '@/lib/hub/media-actions'
import { getGroupAvailability } from '@/lib/hub/availability-actions'
import { HubGroupView } from './hub-group-view'

interface Props {
  params: Promise<{ groupToken: string }>
}

export default async function HubGroupPage({ params }: Props) {
  const { groupToken } = await params
  const group = await getGroupByToken(groupToken)

  if (!group || !group.is_active) {
    notFound()
  }

  const [members, notes, media, availability, groupEvents] = await Promise.all([
    getGroupMembers(group.id),
    getGroupNotes(group.id),
    getGroupMedia({ groupId: group.id }),
    getGroupAvailability(group.id),
    getGroupEvents(group.id),
  ])

  return (
    <HubGroupView
      group={group}
      members={members}
      notes={notes}
      media={media}
      availability={availability}
      groupEvents={groupEvents}
    />
  )
}

export const dynamic = 'force-dynamic'
