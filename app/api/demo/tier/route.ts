// Demo Tier Toggle Endpoint
// Switches the demo chef's subscription_status between Pro and Free.
// Only active when DEMO_MODE_ENABLED=true.

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  if (process.env.DEMO_MODE_ENABLED !== 'true') {
    return new NextResponse('Forbidden — DEMO_MODE_ENABLED is not set', { status: 403 })
  }

  let tier: 'pro' | 'free'
  try {
    const body = await req.json()
    tier = body.tier
    if (tier !== 'pro' && tier !== 'free') throw new Error('Invalid tier')
  } catch {
    return new NextResponse('Bad Request — expected { tier: "pro" | "free" }', { status: 400 })
  }

  let demoChef: { chefId: string }
  try {
    demoChef = JSON.parse(readFileSync('.auth/demo-chef.json', 'utf-8'))
  } catch {
    return new NextResponse('Demo credentials not found. Run: npm run demo:setup', { status: 500 })
  }

  const supabase = createServerClient({ admin: true })
  const status = tier === 'pro' ? 'active' : 'canceled'

  const { error } = await supabase
    .from('chefs')
    .update({ subscription_status: status })
    .eq('id', demoChef.chefId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    tier,
    subscription_status: status,
    message: `Demo chef switched to ${tier.toUpperCase()} tier (subscription_status: ${status})`,
  })
}
