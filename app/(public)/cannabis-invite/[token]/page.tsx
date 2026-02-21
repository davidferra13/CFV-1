// Cannabis Invite Claim Page — The Dispensary Door
// Full-screen, atmospheric, exclusive feel.
// A direct link to this page from the approved invitation email.

import { getCannabisInviteByToken } from '@/lib/cannabis/invitation-actions'
import { CannabisClaimClient } from './cannabis-claim-client'

interface PageProps {
  params: { token: string }
}

export default async function CannabisInviteClaimPage({ params }: PageProps) {
  const invite = await getCannabisInviteByToken(params.token).catch(() => null)

  return <CannabisClaimClient invite={invite} token={params.token} />
}
