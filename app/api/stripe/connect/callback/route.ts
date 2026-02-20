// Stripe Connect Express — Callback Handler
// After a chef completes (or abandons) the Stripe-hosted onboarding,
// Stripe redirects to this route. We refresh the account status from the
// Stripe API and redirect the chef back to either the wizard or settings.

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/get-user'
import { refreshConnectAccountStatus } from '@/lib/stripe/connect'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = request.nextUrl.origin
  const from = searchParams.get('from') // 'onboarding' | 'settings'

  // Verify the chef is authenticated
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'chef') {
    return NextResponse.redirect(`${origin}/auth/signin?portal=chef`)
  }

  // Sync status from Stripe (non-fatal — redirect regardless of result)
  try {
    await refreshConnectAccountStatus()
  } catch (err) {
    console.error('[StripeConnect callback] Status refresh failed:', err)
  }

  // Redirect back to source
  if (from === 'onboarding') {
    return NextResponse.redirect(`${origin}/onboarding?step=4&stripe_return=true`)
  }

  return NextResponse.redirect(`${origin}/settings/stripe-connect?connected=true`)
}
