import { NextResponse, type NextRequest } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { getProviderMeta } from '@/lib/integrations/core/providers'
import { captureIntegrationCallbackSnapshot } from '@/lib/context-snapshots/service'

export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  let user
  try {
    user = await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const meta = getProviderMeta(params.provider)
  if (!meta) {
    return NextResponse.json({ error: 'Unknown integration provider' }, { status: 404 })
  }

  const code = request.nextUrl.searchParams.get('code')
  const errorParam = request.nextUrl.searchParams.get('error')

  if (errorParam) {
    await captureIntegrationCallbackSnapshot({
      tenantId: user.tenantId!,
      provider: meta.provider,
      status: 'error',
      hasCode: Boolean(code),
      errorParam,
    })
    return NextResponse.json(
      {
        provider: meta.provider,
        connected: false,
        error: errorParam,
      },
      { status: 400 }
    )
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing OAuth code' }, { status: 400 })
  }

  await captureIntegrationCallbackSnapshot({
    tenantId: user.tenantId!,
    provider: meta.provider,
    status: 'received',
    hasCode: true,
  })

  return NextResponse.json({
    provider: meta.provider,
    connected: false,
    status: 'pending_oauth_exchange_implementation',
    message: 'OAuth callback received. Token exchange and connection persistence are next implementation step.',
  })
}
