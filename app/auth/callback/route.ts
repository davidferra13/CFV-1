// OAuth callback handler
// Exchanges the auth code from Google for a Supabase session

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect to sign-in with error
  return NextResponse.redirect(`${origin}/auth/signin?error=Could not authenticate with Google`)
}
