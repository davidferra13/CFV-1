'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Link2, Unlink, Loader2, ExternalLink } from 'lucide-react'

type OAuthProvider = 'quickbooks' | 'docusign' | 'square'

type ConnectionStatus = {
  connected: boolean
  status?: string
  accountName?: string | null
  connectedAt?: string | null
  lastError?: string | null
}

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  quickbooks: 'QuickBooks',
  docusign: 'DocuSign',
  square: 'Square',
}

export function IntegrationConnectButtons({
  provider,
  initialStatus,
}: {
  provider: OAuthProvider
  initialStatus: ConnectionStatus
}) {
  const [status, setStatus] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()

  const label = PROVIDER_LABELS[provider]

  function handleConnect() {
    startTransition(async () => {
      try {
        let redirectUrl: string

        if (provider === 'quickbooks') {
          const { initiateQuickBooksConnect } =
            await import('@/lib/integrations/quickbooks/quickbooks-client')
          const result = await initiateQuickBooksConnect()
          redirectUrl = result.redirectUrl
        } else if (provider === 'docusign') {
          const { initiateDocuSignConnect } =
            await import('@/lib/integrations/docusign/docusign-client')
          const result = await initiateDocuSignConnect()
          redirectUrl = result.redirectUrl
        } else {
          const { initiateSquareConnect } = await import('@/lib/integrations/square/square-client')
          const result = await initiateSquareConnect()
          redirectUrl = result.redirectUrl
        }

        window.location.href = redirectUrl
      } catch (err) {
        toast.error(
          `Failed to connect ${label}: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    })
  }

  function handleDisconnect() {
    const prev = status
    setStatus({ connected: false })

    startTransition(async () => {
      try {
        if (provider === 'quickbooks') {
          const { disconnectQuickBooks } =
            await import('@/lib/integrations/quickbooks/quickbooks-client')
          await disconnectQuickBooks()
        } else if (provider === 'docusign') {
          const { disconnectDocuSign } = await import('@/lib/integrations/docusign/docusign-client')
          await disconnectDocuSign()
        } else {
          const { disconnectSquare } = await import('@/lib/integrations/square/square-client')
          await disconnectSquare()
        }
        toast.success(`${label} disconnected`)
      } catch (err) {
        setStatus(prev)
        toast.error(`Failed to disconnect ${label}`)
      }
    })
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="success">Connected</Badge>
          {status.accountName && (
            <span className="text-xs text-stone-400">{status.accountName}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          disabled={isPending}
          className="text-stone-500 hover:text-red-400"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Unlink className="h-3.5 w-3.5" />
          )}
          <span className="ml-1">Disconnect</span>
        </Button>
      </div>
    )
  }

  if (status.status === 'reauth_required') {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="warning">Reauth Required</Badge>
        {status.lastError && <span className="text-xs text-red-400">{status.lastError}</span>}
        <Button variant="primary" size="sm" onClick={handleConnect} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
          )}
          Reconnect
        </Button>
      </div>
    )
  }

  return (
    <Button variant="primary" size="sm" onClick={handleConnect} disabled={isPending}>
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
      ) : (
        <Link2 className="h-3.5 w-3.5 mr-1" />
      )}
      Connect {label}
    </Button>
  )
}
