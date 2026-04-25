'use client'

import { useState, useTransition } from 'react'
import type { SupportStatus } from '@/lib/monetization/status'
import { SupportSurface } from '@/components/monetization/support-surface'
import { redirectToBillingPortal, redirectToSupportCheckout } from './actions'

type Props = {
  status: SupportStatus
  thankYou: boolean
}

export function BillingClient({ status, thankYou }: Props) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [portalError, setPortalError] = useState<string | null>(null)
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null)
  const [isPendingCheckout, startCheckout] = useTransition()
  const [isPendingPortal, startPortal] = useTransition()

  function handleCheckout(offerId: string, customAmount: string) {
    setCheckoutError(null)
    setPendingOfferId(offerId)

    startCheckout(async () => {
      try {
        const formData = new FormData()
        formData.set('offerId', offerId)
        if (customAmount.trim()) formData.set('customAmount', customAmount.trim())

        const result = await redirectToSupportCheckout(formData)
        if (result?.error) setCheckoutError(result.error)
      } catch (err: any) {
        if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith?.('NEXT_REDIRECT')) {
          throw err
        }
        setCheckoutError(err?.message ?? 'Support checkout is unavailable.')
      } finally {
        setPendingOfferId(null)
      }
    })
  }

  function handleManage() {
    setPortalError(null)

    startPortal(async () => {
      try {
        const result = await redirectToBillingPortal()
        if (result?.error) setPortalError(result.error)
      } catch (err: any) {
        if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith?.('NEXT_REDIRECT')) {
          throw err
        }
        setPortalError(err?.message ?? 'Support management is unavailable.')
      }
    })
  }

  return (
    <SupportSurface
      status={status}
      thankYou={thankYou}
      pendingOfferId={isPendingCheckout ? pendingOfferId : null}
      pendingPortal={isPendingPortal}
      checkoutError={checkoutError}
      portalError={portalError}
      onCheckout={handleCheckout}
      onManage={handleManage}
    />
  )
}
