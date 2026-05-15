'use client'

import { useState, useTransition } from 'react'
import {
  getSmsBridgeStatus,
  setupSmsBridge,
  regenerateSmsBridgeToken,
  toggleSmsBridge,
  addPersonalContact,
  removePersonalContact,
} from '@/lib/sms-bridge/actions'
import { toast } from 'sonner'

type BridgeState = Awaited<ReturnType<typeof getSmsBridgeStatus>>

export function SmsBridgePanel({ initial }: { initial: BridgeState }) {
  const [state, setState] = useState(initial)
  const [token, setToken] = useState<string | null>(null)
  const [newPhone, setNewPhone] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSetup() {
    startTransition(async () => {
      const result = await setupSmsBridge()
      if (result.success && result.token) {
        setToken(result.token)
        const updated = await getSmsBridgeStatus()
        setState(updated)
        toast.success('SMS Bridge activated')
      } else {
        toast.error(result.error || 'Setup failed')
      }
    })
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateSmsBridgeToken()
      if (result.success && result.token) {
        setToken(result.token)
        toast.success('New token generated')
      } else {
        toast.error(result.error || 'Failed to regenerate')
      }
    })
  }

  function handleToggle() {
    if (!state.config) return
    startTransition(async () => {
      const next = !state.config!.enabled
      const result = await toggleSmsBridge(next)
      if (result.success) {
        setState((prev) => ({
          ...prev,
          config: prev.config ? { ...prev.config, enabled: next } : null,
        }))
        toast.success(next ? 'Bridge enabled' : 'Bridge paused')
      } else {
        toast.error(result.error || 'Toggle failed')
      }
    })
  }

  function handleAddContact() {
    const phone = newPhone.trim()
    if (!phone) return
    startTransition(async () => {
      const result = await addPersonalContact(phone)
      if (result.success) {
        setNewPhone('')
        const updated = await getSmsBridgeStatus()
        setState(updated)
        toast.success('Contact blocked')
      } else {
        toast.error(result.error || 'Failed to add')
      }
    })
  }

  function handleRemoveContact(phone: string) {
    startTransition(async () => {
      await removePersonalContact(phone)
      const updated = await getSmsBridgeStatus()
      setState(updated)
      toast.success('Contact unblocked')
    })
  }

  // Not configured yet
  if (!state.configured || !state.config) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-stone-400">
          Forward text messages from your personal phone into ChefFlow. Known clients get routed to
          their conversation thread automatically. Unknown numbers become new leads in your triage
          queue.
        </p>
        <button
          onClick={handleSetup}
          disabled={isPending}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
        >
          {isPending ? 'Setting up...' : 'Activate SMS Bridge'}
        </button>
      </div>
    )
  }

  const { config } = state
  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://app.cheflowhq.com'

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-2.5 w-2.5 rounded-full ${config.enabled ? 'bg-emerald-500' : 'bg-stone-500'}`}
          />
          <span className="text-sm text-stone-300">{config.enabled ? 'Active' : 'Paused'}</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="rounded-md border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-50"
        >
          {config.enabled ? 'Pause' : 'Enable'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-stone-800 p-3">
          <p className="text-xs text-stone-500">Messages forwarded</p>
          <p className="text-lg font-semibold text-stone-100">{config.messagesForwarded}</p>
        </div>
        <div className="rounded-lg border border-stone-800 p-3">
          <p className="text-xs text-stone-500">Personal blocked</p>
          <p className="text-lg font-semibold text-stone-100">{config.messagesBlocked}</p>
        </div>
      </div>

      {/* Token */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Bridge Token</p>
        {token ? (
          <div className="space-y-2">
            <div className="rounded-md bg-stone-900 border border-stone-700 p-3">
              <code className="text-xs text-amber-400 break-all select-all">{token}</code>
            </div>
            <p className="text-xs text-amber-500">Copy this token now. It won't be shown again.</p>
          </div>
        ) : (
          <p className="text-xs text-stone-500">
            Token is stored securely. Only a new token can be generated.
          </p>
        )}
        <button
          onClick={handleRegenerate}
          disabled={isPending}
          className="rounded-md border border-stone-700 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-800 disabled:opacity-50"
        >
          {isPending ? 'Generating...' : 'Regenerate Token'}
        </button>
      </div>

      {/* Endpoint info */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">Endpoint</p>
        <div className="rounded-md bg-stone-900 border border-stone-700 p-3">
          <code className="text-xs text-stone-300 break-all select-all">
            POST {siteUrl}/api/sms-bridge/ingest
          </code>
        </div>
        <p className="text-xs text-stone-500">
          Send a JSON body with{' '}
          <code className="text-stone-400">{`{ "from": "+15551234567", "body": "message text" }`}</code>
        </p>
      </div>

      {/* Personal Contacts Blocklist */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          Personal Contacts (Blocked)
        </p>
        <p className="text-xs text-stone-500">
          Numbers here are silently ignored when forwarded. Add family, friends, anyone who isn't a
          client.
        </p>

        {config.personalBlocklist.length > 0 && (
          <div className="space-y-1">
            {config.personalBlocklist.map((phone) => (
              <div
                key={phone}
                className="flex items-center justify-between rounded-md border border-stone-800 px-3 py-2"
              >
                <span className="text-sm text-stone-300 font-mono">{phone}</span>
                <button
                  onClick={() => handleRemoveContact(phone)}
                  disabled={isPending}
                  className="text-xs text-stone-500 hover:text-red-400 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+1 555 123 4567"
            className="flex-1 rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={handleAddContact}
            disabled={isPending || !newPhone.trim()}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700 disabled:opacity-50"
          >
            Block
          </button>
        </div>
      </div>
    </div>
  )
}
