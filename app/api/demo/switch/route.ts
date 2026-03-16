// Demo Account Switch Endpoint
// Signs in as the demo chef or demo client account.
// Only active when DEMO_MODE_ENABLED=true.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { readFileSync } from 'fs'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden - demo endpoints are not available in production', {
      status: 403,
    })
  }
  if (process.env.DEMO_MODE_ENABLED !== 'true') {
    return new NextResponse('Forbidden - DEMO_MODE_ENABLED is not set', { status: 403 })
  }

  let target: 'chef' | 'client'
  try {
    const body = await req.json()
    target = body.target
    if (target !== 'chef' && target !== 'client') throw new Error('Invalid target')
  } catch {
    return new NextResponse('Bad Request - expected { target: "chef" | "client" }', { status: 400 })
  }

  // Read credentials from .auth files
  const credFile = target === 'chef' ? '.auth/demo-chef.json' : '.auth/demo-client.json'
  let creds: { email: string; password: string }
  try {
    creds = JSON.parse(readFileSync(credFile, 'utf-8'))
  } catch {
    return new NextResponse(`Demo credentials not found (${credFile}). Run: npm run demo:setup`, {
      status: 500,
    })
  }

  const supabase: any = createServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  return NextResponse.json({ ok: true, target })
}
