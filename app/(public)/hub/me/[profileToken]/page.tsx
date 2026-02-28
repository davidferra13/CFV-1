import { notFound } from 'next/navigation'
import {
  getProfileByToken,
  getProfileEventHistory,
  getProfileGroups,
} from '@/lib/hub/profile-actions'
import { getGroupById } from '@/lib/hub/group-actions'
import { ProfileView } from './profile-view'

interface Props {
  params: Promise<{ profileToken: string }>
}

export default async function HubProfilePage({ params }: Props) {
  const { profileToken } = await params
  const profile = await getProfileByToken(profileToken)

  if (!profile) {
    notFound()
  }

  const [eventHistory, groupMemberships] = await Promise.all([
    getProfileEventHistory(profileToken),
    getProfileGroups(profileToken),
  ])

  // Load group details
  const groups = await Promise.all(
    groupMemberships.map(async (m) => {
      const group = await getGroupById(m.group_id)
      return group ? { ...group, memberRole: m.role } : null
    })
  ).then((results) => results.filter(Boolean))

  return (
    <ProfileView
      profile={profile}
      eventHistory={eventHistory}
      groups={groups as (NonNullable<(typeof groups)[number]> & { memberRole: string })[]}
    />
  )
}

export const dynamic = 'force-dynamic'
