import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

// ---------------------------------------------------------------------------
// Unified OpenClaw Sync Cron
// Handles sync requests from ANY OpenClaw cartridge.
// Cartridge is specified via ?cartridge= query param (defaults to 'price-intel').
//
// Called by each cartridge's sync-to-chefflow.mjs nightly script:
//   POST /api/cron/openclaw-sync?cartridge=price-intel
//   POST /api/cron/openclaw-sync?cartridge=market-intel
//   etc.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const url = new URL(request.url)
  const cartridge = url.searchParams.get('cartridge') || 'price-intel'

  try {
    // Dynamic import to avoid loading openclaw module at build time
    const { syncCartridgeInternal } = await import('@/lib/openclaw/sync-receiver')

    const result = await syncCartridgeInternal(cartridge)

    if (!result.success) {
      return NextResponse.json(
        {
          ...result,
          timestamp: new Date().toISOString(),
        },
        { status: result.errorDetails?.[0]?.includes('Unknown cartridge') ? 400 : 500 }
      )
    }

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[openclaw-sync cron] Error for cartridge '${cartridge}':`, message)
    return NextResponse.json(
      {
        success: false,
        cartridge,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support GET for backwards compat (price-intel's sync script may use GET)
export async function GET(request: Request) {
  return POST(request)
}
