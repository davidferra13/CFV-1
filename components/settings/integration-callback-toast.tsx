'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

const PROVIDER_NAMES: Record<string, string> = {
  quickbooks: 'QuickBooks',
  docusign: 'DocuSign',
  square: 'Square',
}

export function IntegrationCallbackToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected) {
      const name = PROVIDER_NAMES[connected] || connected
      toast.success(`${name} connected successfully`)
      // Clean URL params without navigation
      router.replace('/settings/integrations', { scroll: false })
    }

    if (error) {
      // Error format: provider_errortype (e.g., quickbooks_exchange_failed)
      const provider = error.split('_')[0]
      const name = PROVIDER_NAMES[provider] || provider
      toast.error(`${name} connection failed. Please try again.`)
      router.replace('/settings/integrations', { scroll: false })
    }
  }, [searchParams, router])

  return null
}
