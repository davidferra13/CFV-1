import { redirect } from 'next/navigation'
import { requireClient } from '@/lib/auth/get-user'
import { getClientProfileToken } from '@/lib/hub/client-hub-actions'

export default async function InviteFriendsPage() {
  await requireClient()
  const profileToken = await getClientProfileToken()

  redirect(`/my-hub/friends/invite/${profileToken}`)
}

export const dynamic = 'force-dynamic'
