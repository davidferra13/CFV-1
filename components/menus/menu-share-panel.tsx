'use client'

import { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  createMenuSelectionToken,
  getMenuSelectionTokens,
  getTokenMenuSelections,
  deactivateMenuSelectionToken,
  type MenuSelectionToken,
  type TokenMenuSelection,
} from '@/lib/menus/menu-share-actions'

type Props = {
  eventId: string
  hasMenu: boolean
}

export function MenuSharePanel({ eventId, hasMenu }: Props) {
  const [tokens, setTokens] = useState<MenuSelectionToken[]>([])
  const [selections, setSelections] = useState<TokenMenuSelection[]>([])
  const [label, setLabel] = useState('')
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [t, s] = await Promise.all([
          getMenuSelectionTokens(eventId),
          getTokenMenuSelections(eventId),
        ])
        if (mounted) {
          setTokens(t)
          setSelections(s)
        }
      } catch {
        // silent, panel is supplementary
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [eventId])

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      try {
        const result = await createMenuSelectionToken(eventId, label.trim() || undefined)
        setLabel('')
        // Copy to clipboard
        await navigator.clipboard.writeText(result.url)
        setCopiedUrl(result.url)
        setTimeout(() => setCopiedUrl(null), 3000)
        // Refresh lists
        const [t, s] = await Promise.all([
          getMenuSelectionTokens(eventId),
          getTokenMenuSelections(eventId),
        ])
        setTokens(t)
        setSelections(s)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create link')
      }
    })
  }

  const handleDeactivate = (tokenId: string) => {
    startTransition(async () => {
      try {
        await deactivateMenuSelectionToken(tokenId)
        setTokens((prev) => prev.map((t) => (t.id === tokenId ? { ...t, isActive: false } : t)))
      } catch {
        // silent
      }
    })
  }

  const copyUrl = async (token: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
    const url = `${baseUrl}/menu-pick/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 3000)
  }

  if (!hasMenu) return null

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-2">Menu Selection Sharing</h2>
      <p className="text-sm text-stone-500 mb-4">
        Generate a link so guests or coordinators can pick their dishes without an account.
      </p>

      {/* Create new token */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Sarah, bride's sister)"
          className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button variant="primary" onClick={handleCreate} disabled={isPending}>
          {isPending ? 'Creating...' : 'Create Link'}
        </Button>
      </div>

      {copiedUrl && <p className="text-xs text-emerald-400 mb-3">Link copied to clipboard!</p>}
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Active tokens */}
      {tokens.length > 0 && (
        <div className="space-y-2 mb-4">
          <h3 className="text-sm font-medium text-stone-400">Share Links</h3>
          {tokens.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded-lg border p-2 text-sm ${
                t.isActive
                  ? 'border-stone-700 bg-stone-900'
                  : 'border-stone-800 bg-stone-950 opacity-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="text-stone-200">{t.label || 'Unnamed'}</span>
                {!t.isActive && <span className="ml-2 text-xs text-stone-500">(deactivated)</span>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {t.isActive && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => copyUrl(t.token)}>
                      Copy
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(t.id)}>
                      Disable
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Received selections */}
      {selections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-stone-400">Received Picks</h3>
          {selections.map((s) => (
            <div key={s.id} className="rounded-lg border border-stone-700 bg-stone-900 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-100">
                  {s.submitterName || 'Anonymous'}
                </span>
                <span className="text-xs text-stone-500">
                  {new Date(s.submittedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {s.tokenLabel && <p className="text-xs text-stone-500 mt-0.5">via: {s.tokenLabel}</p>}
              {s.specialRequests && (
                <p className="text-xs text-stone-400 mt-1">{s.specialRequests}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
