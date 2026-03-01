// Client hub group detail — wraps existing HubGroupView in client layout

import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireClient } from '@/lib/auth/get-user'
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
import { HubGroupView } from '@/app/(public)/hub/g/[groupToken]/hub-group-view'

interface Props {
  params: Promise<{ groupToken: string }>
}

export async function generateMetadata({ params }: Props) {
  const { groupToken } = await params
  const group = await getGroupByToken(groupToken)
  return { title: group ? `${group.name} - My Hub - ChefFlow` : 'Hub Group - ChefFlow' }
}

export default async function ClientHubGroupPage({ params }: Props) {
  await requireClient()
  const { groupToken } = await params
  const profile = await getOrCreateClientHubProfile()

  const group = await getGroupByToken(groupToken)
  if (!group || !group.is_active) notFound()

  // Auto-join if not already a member
  await joinHubGroup({ groupToken, profileId: profile.id })

  // Set the profile token cookie so existing hub components work
  const cookieStore = await cookies()
  cookieStore.set('hub_profile_token', profile.profile_token, {
    path: '/',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  const [members, notes, media, availability, groupEvents] = await Promise.all([
    getGroupMembers(group.id),
    getGroupNotes(group.id),
    getGroupMedia({ groupId: group.id }),
    getGroupAvailability(group.id),
    getGroupEvents(group.id),
  ])

  return (
    <div className="mx-auto max-w-4xl">
      <HubGroupView
        group={group}
        members={members}
        notes={notes}
        media={media}
        availability={availability}
        groupEvents={groupEvents}
      />
    </div>
  )
}

export const dynamic = 'force-dynamic'
