'use server'

// Thin server-action wrappers for the billing settings page.
// These acquire the authenticated chef ID, delegate to lib/stripe/subscription.ts,
// then redirect to the Stripe-hosted URL.  Client components import these
// directly and invoke them from <form action={...}>.

import { requireChef } from '@/lib/auth/get-user'
import { createCheckoutSession, createBillingPortalSession } from '@/lib/stripe/subscription'
import { redirect } from 'next/navigation'

export async function redirectToCheckout(): Promise<void> {
  const user = await requireChef()
  const url = await createCheckoutSession(user.entityId)
  redirect(url)
}

export async function redirectToBillingPortal(): Promise<void> {
  const user = await requireChef()
  const url = await createBillingPortalSession(user.entityId)
  redirect(url)
}
