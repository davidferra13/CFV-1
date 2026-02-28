'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { INTEGRATION_PROVIDER_META } from '@/lib/integrations/core/providers'
import type { IntegrationProvider } from '@/lib/integrations/core/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ConnectedAccount = {
  id: string
  provider: IntegrationProvider
  providerLabel: string
  category: string
  status: 'connected' | 'disconnected' | 'error' | 'reauth_required'
  authType: 'oauth2' | 'api_key' | 'pat' | 'none'
  externalAccountName: string | null
  externalAccountId: string | null
  lastSyncAt: string | null
  connectedAt: string
}

export function ConnectedAccounts({ initialAccounts }: { initialAccounts: ConnectedAccount[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [provider, setProvider] = useState<IntegrationProvider>('square')
  const [externalAccountName, setExternalAccountName] = useState('')
  const [externalAccountId, setExternalAccountId] = useState('')
  const [apiKey, setApiKey] = useState('')

  const providerMeta = useMemo(
    () => INTEGRATION_PROVIDER_META.find((item) => item.provider === provider),
    [provider]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, ConnectedAccount[]>()
    for (const account of initialAccounts) {
      const key = account.category || 'custom'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(account)
    }
    return [...map.entries()]
  }, [initialAccounts])

  const handleConnect = () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/integrations/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'connect',
            provider,
            externalAccountId: externalAccountId || undefined,
            externalAccountName: externalAccountName || undefined,
            apiKey: apiKey || undefined,
          }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to connect integration')
        }

        toast.success(`Connected ${providerMeta?.label || provider}`)
        setExternalAccountName('')
        setExternalAccountId('')
        setApiKey('')
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Connection failed')
      }
    })
  }

  const handleDisconnect = (connectionId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/integrations/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'disconnect',
            connectionId,
          }),
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Failed to disconnect integration')
        }
        toast.success('Integration disconnected')
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Disconnect failed')
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect New Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-stone-300">
              Provider
              <select
                className="mt-1 h-10 w-full rounded-md border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100"
                value={provider}
                onChange={(event) => setProvider(event.target.value as IntegrationProvider)}
              >
                {INTEGRATION_PROVIDER_META.map((item) => (
                  <option key={item.provider} value={item.provider}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-stone-300">
              External account name
              <Input
                value={externalAccountName}
                onChange={(event) => setExternalAccountName(event.target.value)}
                placeholder="Optional display name"
                className="mt-1"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-stone-300">
              External account ID
              <Input
                value={externalAccountId}
                onChange={(event) => setExternalAccountId(event.target.value)}
                placeholder="Optional provider account ID"
                className="mt-1"
              />
            </label>

            <label className="text-sm text-stone-300">
              API key (optional)
              <Input
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                type="password"
                placeholder={providerMeta?.supportsOAuth ? 'Only for manual key auth' : 'API key'}
                className="mt-1"
              />
            </label>
          </div>

          <Button onClick={handleConnect} disabled={isPending}>
            {isPending ? 'Connecting...' : 'Connect account'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {grouped.length === 0 ? (
            <p className="text-sm text-stone-400">No connected accounts yet.</p>
          ) : (
            grouped.map(([category, accounts]) => (
              <div key={category} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-stone-400">{category}</p>
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-lg border border-stone-700 bg-stone-900 p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-stone-100">{account.providerLabel}</p>
                      <p className="text-xs text-stone-400">
                        {account.status}
                        {account.externalAccountName ? ` • ${account.externalAccountName}` : ''}
                        {account.lastSyncAt
                          ? ` • Last sync ${new Date(account.lastSyncAt).toLocaleString()}`
                          : ''}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={isPending}
                    >
                      Disconnect
                    </Button>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
