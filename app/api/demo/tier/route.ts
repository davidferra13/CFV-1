// Demo support-state endpoint.
// Only active when DEMO_MODE_ENABLED=true.

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { revalidateTag } from 'next/cache'
import { createServerClient } from '@/lib/db/server'
import { SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS } from '@/lib/monetization/offers'

function isMissingSupportColumnError(error: any): boolean {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    error?.code === '42703' ||
    message.includes('supporter_since') ||
    message.includes('monthly_support_amount_cents')
  )
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden - demo endpoints are not available in production', {
      status: 403,
    })
  }
  if (process.env.DEMO_MODE_ENABLED !== 'true') {
    return new NextResponse('Forbidden - DEMO_MODE_ENABLED is not set', { status: 403 })
  }

  let supporting: boolean
  try {
    const body = await req.json()
    supporting =
      typeof body.supporting === 'boolean'
        ? body.supporting
        : body.supportState === 'supporting' || body.tier === 'pro'
  } catch {
    return new NextResponse('Bad Request - expected { supporting: boolean }', { status: 400 })
  }

  let demoChef: { chefId: string }
  try {
    demoChef = JSON.parse(readFileSync('.auth/demo-chef.json', 'utf-8'))
  } catch {
    return new NextResponse('Demo credentials not found. Run: npm run demo:setup', { status: 500 })
  }

  const db = createServerClient({ admin: true })
  const now = new Date().toISOString()
  const legacyPatch = {
    subscription_status: supporting ? 'active' : 'canceled',
  }
  const supportPatch = supporting
    ? {
        supporter_since: now,
        monthly_support_amount_cents: SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS,
        last_support_amount_cents: SUPPORT_DEFAULT_MONTHLY_AMOUNT_CENTS,
        last_supported_at: now,
      }
    : {
        supporter_since: null,
        monthly_support_amount_cents: null,
      }

  let { error } = await db
    .from('chefs')
    .update({ ...legacyPatch, ...supportPatch } as any)
    .eq('id', demoChef.chefId)

  if (error && isMissingSupportColumnError(error)) {
    const retry = await db
      .from('chefs')
      .update(legacyPatch as any)
      .eq('id', demoChef.chefId)
    error = retry.error
  }

  if (error) {
    console.error('[demo/support] Database error:', error)
    return NextResponse.json({ error: 'Failed to update demo support state.' }, { status: 500 })
  }

  revalidateTag(`chef-layout-${demoChef.chefId}`)

  return NextResponse.json({
    ok: true,
    supporting,
    subscription_status: legacyPatch.subscription_status,
    message: supporting
      ? 'Demo chef is now shown as supporting ChefFlow.'
      : 'Demo chef is now shown without monthly support.',
  })
}
