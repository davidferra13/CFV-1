'use server'

import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import {
  createSupportBillingPortalSession,
  createSupportCheckoutSession,
} from '@/lib/stripe/subscription'
import {
  getSupportOffer,
  parseSupportAmountCents,
  type SupportOfferId,
} from '@/lib/monetization/offers'

type BillingActionResult = { error: string }

function isRedirectError(err: any): boolean {
  return err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith?.('NEXT_REDIRECT')
}

function getCheckoutErrorMessage(err: any): string {
  const message = String(err?.message ?? 'Support checkout is unavailable')
  if (message.includes('not configured')) {
    return 'Support checkout is not available yet. Check back soon.'
  }
  return message
}

export async function redirectToSupportCheckout(
  formData: FormData
): Promise<BillingActionResult | void> {
  const user = await requireChef()

  try {
    const offerId = String(formData.get('offerId') ?? '')
    const offer = getSupportOffer(offerId)
    if (!offer) return { error: 'Choose a support option.' }

    const customAmountCents =
      offer.amountCents == null ? parseSupportAmountCents(formData.get('customAmount')) : null

    if (offer.amountCents == null && !customAmountCents) {
      return { error: 'Enter a contribution between $1 and $500.' }
    }

    const url = await createSupportCheckoutSession({
      chefId: user.entityId,
      offerId: offer.id as SupportOfferId,
      customAmountCents,
    })
    redirect(url)
  } catch (err: any) {
    if (isRedirectError(err)) throw err
    return { error: getCheckoutErrorMessage(err) }
  }
}

export async function redirectToBillingPortal(): Promise<BillingActionResult | void> {
  const user = await requireChef()
  try {
    const url = await createSupportBillingPortalSession(user.entityId)
    redirect(url)
  } catch (err: any) {
    if (isRedirectError(err)) throw err
    return { error: err?.message ?? 'Support management is unavailable.' }
  }
}

export async function redirectToCheckout(): Promise<BillingActionResult | void> {
  await requireChef()

  const formData = new FormData()
  formData.set('offerId', 'support_12_monthly')
  return redirectToSupportCheckout(formData)
}
