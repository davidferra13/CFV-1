import { notFound } from 'next/navigation'
import { getGroupByToken } from '@/lib/hub/group-actions'
import { getGroupMembers } from '@/lib/hub/group-actions'
import { getGroupNotes } from '@/lib/hub/message-actions'
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

  const [members, notes] = await Promise.all([getGroupMembers(group.id), getGroupNotes(group.id)])

  return <HubGroupView group={group} members={members} notes={notes} />
}

export const dynamic = 'force-dynamic'
