'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 30_000

export function InquiryStatusWatcher({ inquiryId }: { inquiryId: string }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(interval)
    }
  }, [inquiryId, router])

  return null
}
