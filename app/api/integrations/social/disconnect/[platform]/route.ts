// POST /api/integrations/social/disconnect/[platform]
// Marks the credential as inactive (soft-delete). Called from the
// SocialConnectionsManager "Disconnect" button.

import { NextResponse, type NextRequest } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { disconnectCredential } from '@/lib/social/oauth/token-store'
import { SOCIAL_PLATFORMS } from '@/lib/social/oauth/config'

export async function POST(
  _request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { platform } = params

  if (!SOCIAL_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 404 })
  }

  let user
  try {
    user = await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!user.tenantId) {
    return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  }

  try {
    await disconnectCredential(user.tenantId, platform)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[social-disconnect]', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
