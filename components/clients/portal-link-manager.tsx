'use client'

// Portal Link Manager - lets the chef generate and share a client portal magic link
// Shown on the client detail page under the header.

import { useState } from 'react'
import { generateClientPortalToken, revokeClientPortalToken } from '@/lib/client-portal/actions'
import { Link2, RefreshCw, Trash2, Copy, Check } from '@/components/ui/icons'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { toast } from 'sonner'

interface Props {
  clientId: string
  initialToken: string | null
  initialCreatedAt: string | null
  initialExpiresAt: string | null
  initialHasActiveLink: boolean
  initialLastUsedAt?: string | null
}

export function PortalLinkManager({
  clientId,
  initialToken,
  initialCreatedAt,
  initialExpiresAt,
  initialHasActiveLink,
  initialLastUsedAt = null,
}: Props) {
  const [token, setToken] = useState(initialToken)
  const [createdAt, setCreatedAt] = useState(initialCreatedAt)
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt)
  const [lastUsedAt, setLastUsedAt] = useState(initialLastUsedAt)
  const [hasActiveLink, setHasActiveLink] = useState(initialHasActiveLink || !!initialToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const portalUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/client/${token}`
    : null

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateClientPortalToken(clientId)
      setToken(result.token)
      setCreatedAt(new Date().toISOString())
      setExpiresAt(result.expiresAt)
      setLastUsedAt(null)
      setHasActiveLink(true)
    } catch {
      setError('Could not generate portal link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke() {
    setShowRevokeConfirm(true)
  }

  async function handleConfirmedRevoke() {
    setShowRevokeConfirm(false)
    setLoading(true)
    setError(null)
    try {
      await revokeClientPortalToken(clientId)
      setToken(null)
      setCreatedAt(null)
      setExpiresAt(null)
      setLastUsedAt(null)
      setHasActiveLink(false)
    } catch {
      setError('Could not revoke portal link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!portalUrl) return
    try {
      await navigator.clipboard.writeText(portalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy portal link')
    }
  }

  if (!hasActiveLink) {
    return (
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-stone-400 shrink-0" />
        <span className="text-xs text-stone-500">No portal link generated.</span>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs font-medium text-brand-500 hover:text-brand-400 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate portal link'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {error && (
        <div
          className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="text-xs font-medium text-stone-300">Client Portal Active</span>
        {createdAt && (
          <span className="text-[10px] text-stone-400">
            Generated {new Date(createdAt).toLocaleDateString()}
          </span>
        )}
        {expiresAt && (
          <span className="text-[10px] text-stone-400">
            Expires {new Date(expiresAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {token ? (
        <div className="flex items-center gap-2 bg-stone-800 border border-stone-700 rounded-md px-3 py-1.5">
          <span className="text-xs text-stone-500 truncate flex-1 min-w-0">{portalUrl}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 text-stone-400 hover:text-stone-300 transition-colors"
            title="Copy link"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
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
      ) : (
        <div className="rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-stone-400">
          <p>An active portal link exists, but the raw URL is no longer stored after generation.</p>
          <p className="mt-1">
            Generate a new link to reveal a fresh shareable URL, or revoke the current one.
          </p>
          {lastUsedAt && (
            <p className="mt-1 text-[11px] text-stone-500">
              Last used {new Date(lastUsedAt).toLocaleString()}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs font-medium text-brand-500 hover:text-brand-400 disabled:opacity-50"
            >
              Generate new portal link
            </button>
            <button
              onClick={handleRevoke}
              disabled={loading}
              className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
            >
              Revoke current link
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        open={showRevokeConfirm}
        title="Revoke portal link?"
        description="The client will no longer be able to access their portal with the current link."
        confirmLabel="Revoke"
        variant="danger"
        loading={loading}
        onConfirm={handleConfirmedRevoke}
        onCancel={() => setShowRevokeConfirm(false)}
      />
    </div>
  )
}
