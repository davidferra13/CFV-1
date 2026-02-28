// Share Event Button - Client-facing component to create and copy share link
// Creates a share link on first click, then shows copy-to-clipboard UI

'use client'

import { useState } from 'react'
import {
  createEventShare,
  createViewerInviteForEvent,
  revokeEventShare,
} from '@/lib/sharing/actions'

interface ShareEventButtonProps {
  eventId: string
  existingShare?: {
    id: string
    token: string
    is_active: boolean
  } | null
}

export function ShareEventButton({ eventId, existingShare }: ShareEventButtonProps) {
  const [shareUrl, setShareUrl] = useState(
    existingShare?.is_active
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${existingShare.token}`
      : ''
  )
  const [shareId, setShareId] = useState(existingShare?.id || '')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerCopied, setViewerCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleCreateShare() {
    setLoading(true)
    setError('')
    try {
      const result = await createEventShare(eventId)
      setShareUrl(result.shareUrl)
      setShareId(result.share.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleRevoke() {
    if (!shareId) return
    setLoading(true)
    try {
      await revokeEventShare(shareId)
      setShareUrl('')
      setShareId('')
      setViewerUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateViewerLink() {
    setLoading(true)
    setError('')
    try {
      const result = await createViewerInviteForEvent({ eventId })
      setViewerUrl(result.viewerUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create viewer invite')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyViewer() {
    if (!viewerUrl) return
    await navigator.clipboard.writeText(viewerUrl)
    setViewerCopied(true)
    setTimeout(() => setViewerCopied(false), 2000)
  }

  if (error) {
    return (
      <div className="bg-red-950 text-red-700 px-4 py-3 rounded-lg text-sm">
        {error}
        <button onClick={() => setError('')} className="ml-2 underline">
          Try again
        </button>
      </div>
    )
  }

  if (!shareUrl) {
    return (
      <button
        onClick={handleCreateShare}
        disabled={loading}
        className="flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {loading ? 'Creating link...' : 'Share with Guests'}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={shareUrl}
          className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-sm text-stone-300 truncate"
        />
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            copied
              ? 'bg-emerald-900 text-emerald-700'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="flex items-center gap-3 text-xs text-stone-500">
        <span>Send this link to your guests so they can RSVP</span>
        <button
          onClick={handleRevoke}
          disabled={loading}
          className="text-red-500 hover:text-red-600 underline"
        >
          Revoke link
        </button>
      </div>
      <div className="pt-2 border-t border-stone-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Optional: generate a viewer link for non-party prospects
          </span>
          <button
            onClick={handleCreateViewerLink}
            disabled={loading}
            className="text-xs text-brand-600 hover:text-brand-400 underline"
          >
            {loading ? 'Generating...' : 'Create viewer link'}
          </button>
        </div>
        {viewerUrl && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={viewerUrl}
              className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-300 truncate"
            />
            <button
              onClick={handleCopyViewer}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                viewerCopied
                  ? 'bg-emerald-900 text-emerald-700'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {viewerCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
