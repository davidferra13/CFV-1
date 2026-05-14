import { NextRequest, NextResponse } from 'next/server'

import { loadCulinaryPreferenceProfile, requireDiscoveryApiUser } from '@/lib/discovery/api-access'
import { buildCulinaryProfileExportPayload } from '@/lib/discovery/profile-export-guardrails'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const access = await requireDiscoveryApiUser()
    if (!access.ok) return access.response

    const includePrivate = request.nextUrl.searchParams.get('includePrivate') === 'true'
    const profile = await loadCulinaryPreferenceProfile(access.userId)
    const payload = buildCulinaryProfileExportPayload({
      profile,
      mode: 'client_download',
      requesterId: access.userId,
      generatedAt: new Date().toISOString(),
      includePrivateProfileSignals: includePrivate,
    })

    return NextResponse.json({ ok: true, export: payload })
  } catch {
    return NextResponse.json({ ok: false, error: 'profile_export_unavailable' }, { status: 500 })
  }
}
