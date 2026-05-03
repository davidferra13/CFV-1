'use client'

import { useState } from 'react'

type Props = {
  digest: string
  className?: string
}

/**
 * Displays an error digest ID with click-to-copy.
 * Users can reference this ID when reporting issues.
 */
export function CopyableErrorId({ digest, className }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(digest)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Click to copy error ID"
      className={`group inline-flex items-center gap-1.5 text-xs transition-colors ${className ?? 'text-red-600 hover:text-red-400'}`}
    >
      <span>Error ID: {digest}</span>
      {copied ? (
        <svg
          className="w-3.5 h-3.5 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  )
}
