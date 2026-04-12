'use client'

// PaymentSuccessRefresher
// After a Stripe payment, the webhook that records the ledger entry fires async.
// The client navigates back before the webhook runs, so the financial summary may
// still show the old balance. This component auto-refreshes the page after a short
// delay so the server re-renders with the updated ledger data.

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function PaymentSuccessRefresher() {
  const router = useRouter()

  useEffect(() => {
    // Give the Stripe webhook 3 seconds to land and revalidate the page cache,
    // then force a fresh server render so the balance reflects the payment.
    const timer = setTimeout(() => {
      router.refresh()
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return null
}
