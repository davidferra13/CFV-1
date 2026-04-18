'use client'

import { useState, useEffect } from 'react'
import { Copy, Check } from '@/components/ui/icons'

interface CopyLinkButtonProps {
  path: string
}

export function CopyLinkButton({ path }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)
  const [fullUrl, setFullUrl] = useState(path)

  useEffect(() => {
    setFullUrl(`${window.location.origin}${path}`)
  }, [path])

  function handleCopy() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-stone-400 font-mono truncate select-all">
        {fullUrl}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 px-3 py-2 text-xs text-stone-300 transition-colors shrink-0"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy link
          </>
        )}
      </button>
    </div>
  )
}
