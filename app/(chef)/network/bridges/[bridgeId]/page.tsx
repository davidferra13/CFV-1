import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getIntroductionBridgeForChef } from '@/lib/network/intro-bridge-actions'
import { getGroupByToken, getGroupMembers } from '@/lib/hub/group-actions'
import { HubBridgeView } from '@/components/hub/hub-bridge-view'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Introduction Bridge' }

interface Props {
  params: Promise<{ bridgeId: string }>
}

export default async function BridgePage({ params }: Props) {
  const { bridgeId } = await params
  const user = await requireChef()
  const currentChefId = user.entityId

  const detail = await getIntroductionBridgeForChef(bridgeId)
  if (!detail) notFound()

  const group = await getGroupByToken(detail.group_token)
  if (!group) notFound()

  const members = await getGroupMembers(group.id)

  const isSourceChef = detail.bridge.source_chef_id === currentChefId
  const isTargetChef = detail.bridge.target_chef_id === currentChefId

  // Find current chef's profile ID from the member list
  const currentMember = detail.members.find((m) => {
    // Match by checking if this member's profile has the chef_profile_token
    return (
      m.role === 'chef' &&
      ((isSourceChef && detail.bridge.source_chef_id === currentChefId) ||
        (isTargetChef && detail.bridge.target_chef_id === currentChefId))
    )
  })

  return (
    <div className="p-4">
      <HubBridgeView
        group={group}
        members={members}
        profileToken={detail.chef_profile_token}
        currentProfileId={currentMember?.profile_id ?? null}
        bridgeId={detail.bridge.id}
        introMode={detail.bridge.intro_mode}
        bridgeStatus={detail.bridge.status}
        isSourceChef={isSourceChef}
        isTargetChef={isTargetChef}
        targetCircleToken={detail.target_circle_token}
        clientDisplayName={detail.client_display_name}
      />
    </div>
  )
}

export const dynamic = 'force-dynamic'
