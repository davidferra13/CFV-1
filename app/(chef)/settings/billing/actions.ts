'use server'

// Thin server-action wrappers for the billing settings page.
// These acquire the authenticated chef ID, delegate to lib/stripe/subscription.ts,
// then redirect to the Stripe-hosted URL.  Client components import these
// directly and invoke them from <form action={...}>.

import { requireChef } from '@/lib/auth/get-user'
import { createCheckoutSession, createBillingPortalSession } from '@/lib/stripe/subscription'
import { redirect } from 'next/navigation'

export async function redirectToCheckout(): Promise<{ error: string } | void> {
  const user = await requireChef()
  try {
    const url = await createCheckoutSession(user.entityId)
    redirect(url)
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT') throw err
    const msg = err?.message ?? 'Checkout unavailable'
    if (msg.includes('not configured')) {
      return { error: 'Supporter checkout is not available yet. Check back soon.' }
    }
    return { error: msg }
  }
}

export async function redirectToBillingPortal(): Promise<{ error: string } | void> {
  const user = await requireChef()
  try {
    const url = await createBillingPortalSession(user.entityId)
    redirect(url)
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT') throw err
    return { error: err?.message ?? 'Billing portal unavailable' }
  }
}
