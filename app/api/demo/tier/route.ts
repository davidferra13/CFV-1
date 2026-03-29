// Demo Tier Toggle Endpoint
// Switches the demo chef's subscription_status between Pro and Free.
// Only active when DEMO_MODE_ENABLED=true.

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { revalidateTag } from 'next/cache'
import { createServerClient } from '@/lib/db/server'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden - demo endpoints are not available in production', {
      status: 403,
    })
  }
  if (process.env.DEMO_MODE_ENABLED !== 'true') {
    return new NextResponse('Forbidden - DEMO_MODE_ENABLED is not set', { status: 403 })
  }

  let tier: 'pro' | 'free'
  try {
    const body = await req.json()
    tier = body.tier
    if (tier !== 'pro' && tier !== 'free') throw new Error('Invalid tier')
  } catch {
    return new NextResponse('Bad Request - expected { tier: "pro" | "free" }', { status: 400 })
  }

  let demoChef: { chefId: string }
  try {
    demoChef = JSON.parse(readFileSync('.auth/demo-chef.json', 'utf-8'))
  } catch {
    return new NextResponse('Demo credentials not found. Run: npm run demo:setup', { status: 500 })
  }

  const db = createServerClient({ admin: true })
  const status = tier === 'pro' ? 'active' : 'canceled'

  const { error } = await db
    .from('chefs')
    .update({ subscription_status: status })
    .eq('id', demoChef.chefId)

  if (error) {
    console.error('[demo/tier] Database error:', error)
    return NextResponse.json({ error: 'Failed to update demo tier.' }, { status: 500 })
  }

  revalidateTag(`chef-layout-${demoChef.chefId}`)

  return NextResponse.json({
    ok: true,
    tier,
    subscription_status: status,
    message: `Demo chef switched to ${tier.toUpperCase()} tier (subscription_status: ${status})`,
  })
}
