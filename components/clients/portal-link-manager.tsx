'use client'

// Portal Link Manager — lets the chef generate and share a client portal magic link
// Shown on the client detail page under the header.

import { useState } from 'react'
import { generateClientPortalToken, revokeClientPortalToken } from '@/lib/client-portal/actions'
import { Link2, RefreshCw, Trash2, Copy, Check } from 'lucide-react'

interface Props {
  clientId: string
  initialToken: string | null
  initialCreatedAt: string | null
}

export function PortalLinkManager({ clientId, initialToken, initialCreatedAt }: Props) {
  const [token, setToken] = useState(initialToken)
  const [createdAt, setCreatedAt] = useState(initialCreatedAt)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const portalUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/client/${token}`
    : null

  async function handleGenerate() {
    setLoading(true)
    try {
      const newToken = await generateClientPortalToken(clientId)
      setToken(newToken)
      setCreatedAt(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke() {
    if (!confirm('Revoke this portal link? The client will no longer be able to access their portal with the current link.')) return
    setLoading(true)
    try {
      await revokeClientPortalToken(clientId)
      setToken(null)
      setCreatedAt(null)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!token) {
    return (
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-stone-400 shrink-0" />
        <span className="text-xs text-stone-500">No portal link generated.</span>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate portal link'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-xs font-medium text-stone-700">Client Portal Active</span>
        {createdAt && (
          <span className="text-[10px] text-stone-400">
            Generated {new Date(createdAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-md px-3 py-1.5">
        <span className="text-xs text-stone-500 truncate flex-1 min-w-0">{portalUrl}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 text-stone-400 hover:text-stone-700 transition-colors"
          title="Copy link"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="shrink-0 text-stone-400 hover:text-brand-600 transition-colors disabled:opacity-50"
          title="Rotate link (invalidates current)"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="shrink-0 text-stone-400 hover:text-red-500 transition-colors disabled:opacity-50"
          title="Revoke portal access"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
