import { NextRequest, NextResponse } from 'next/server'

import { loadCulinaryPreferenceProfile, requireDiscoveryApiUser } from '@/lib/discovery/api-access'
import { buildChefFacingCulinaryProfileReport } from '@/lib/discovery/profile-sharing-report'
import type { CulinaryProfileShareCategory } from '@/lib/discovery/profile-sharing-contracts'

export const dynamic = 'force-dynamic'

const SHARE_CATEGORIES: readonly CulinaryProfileShareCategory[] = [
  'cuisines',
  'ingredients',
  'dietary',
  'dislikes',
  'restaurants',
  'dishes',
  'budget',
  'cravings',
  'fatigue',
  'service_style',
]

export async function GET(request: NextRequest) {
  try {
    const access = await requireDiscoveryApiUser()
    if (!access.ok) return access.response

    const chefId = request.nextUrl.searchParams.get('chefId') || access.userId
    const relationshipId = request.nextUrl.searchParams.get('relationshipId')
    const profile = await loadCulinaryPreferenceProfile(access.userId)
    const generatedAt = new Date().toISOString()
    const report = buildChefFacingCulinaryProfileReport({
      profile,
      grants: [
        {
          id: 'self-report',
          ownerId: access.userId,
          scope: 'chef',
          granteeChefId: chefId,
          categories: [...SHARE_CATEGORIES],
          grantedAt: generatedAt,
        },
      ],
      access: {
        ownerId: access.userId,
        requestingChefId: chefId,
        relationshipId,
        now: generatedAt,
      },
      generatedAt,
    })

    return NextResponse.json({ ok: true, report })
  } catch {
    return NextResponse.json({ ok: false, error: 'profile_report_unavailable' }, { status: 500 })
  }
}
