import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/server'

/**
 * Recovery link handler - validates profile token, sets cookie, redirects to circle.
 * URL: /hub/recover/[groupToken]?t=[profileToken]
 *
 * Guests who cleared cookies use this to reclaim their circle access without re-joining.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupToken: string }> }
) {
  const { groupToken } = await params
  const profileToken = request.nextUrl.searchParams.get('t')

  if (!profileToken || !groupToken) {
    return NextResponse.redirect(new URL(`/hub/g/${groupToken}`, request.url))
  }

  const db: any = createServerClient({ admin: true })

  // Validate profile token exists
  const { data: profile } = await db
    .from('hub_guest_profiles')
    .select('id')
    .eq('profile_token', profileToken)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL(`/hub/join/${groupToken}`, request.url))
  }

  // Validate this profile is actually in this group
  const { data: group } = await db
    .from('hub_groups')
    .select('id')
    .eq('group_token', groupToken)
    .single()

  if (!group) {
    return NextResponse.redirect(new URL(`/hub/join/${groupToken}`, request.url))
  }

  const { data: membership } = await db
    .from('hub_group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('profile_id', profile.id)
    .maybeSingle()

  if (!membership) {
    // Profile exists but not in this group - send to join
    return NextResponse.redirect(new URL(`/hub/join/${groupToken}`, request.url))
  }

  // Valid: set cookie and redirect to circle
  const response = NextResponse.redirect(new URL(`/hub/g/${groupToken}`, request.url))
  response.cookies.set('hub_profile_token', profileToken, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false, // Must be readable by client-side JS in hub-group-view
  })

  return response
}
