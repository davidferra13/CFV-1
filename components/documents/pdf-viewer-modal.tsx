// PDF Viewer Modal — embeds a document API URL inside a full-height iframe
// Uses the browser's native PDF renderer. Auth cookies pass automatically.
// No external PDF library needed — the API already returns Content-Disposition: inline
'use client'

import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

type PdfViewerModalProps = {
  src: string
  title: string
  isOpen: boolean
  onClose: () => void
}

export function PdfViewerModal({ src, title, isOpen, onClose }: PdfViewerModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Lock body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function handlePrint() {
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-stone-900 rounded-lg shadow-xl w-full max-w-4xl flex flex-col h-[calc(100vh-2rem)]">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
          <h2 className="text-base font-semibold text-stone-100 truncate pr-4">{title}</h2>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              Print
            </Button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-stone-200 text-sm"
              title="Open in new tab"
            >
              ↗ New tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-400 text-xl leading-none ml-1"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* PDF iframe */}
        <iframe
          ref={iframeRef}
          src={src}
          className="w-full flex-1 border-0 rounded-b-lg"
          title={title}
        />
      </div>
    </div>
  )
}
