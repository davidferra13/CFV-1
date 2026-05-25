'use client'

import { useState } from 'react'
import { QuickCaptureWidget } from './quick-capture-widget'

type Props = {
  prefillClientId?: string | null
  prefillClientName?: string | null
  prefillEventId?: string | null
}

/**
 * Quick Capture trigger: FAB on mobile, toolbar button on desktop.
 * Opens the Quick Capture Widget modal/sheet.
 */
export function QuickCaptureTrigger({ prefillClientId, prefillClientName, prefillEventId }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Desktop: inline toolbar button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden md:inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-800 px-3 py-1.5 text-sm font-medium text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
        title="Log a call, text, or conversation"
      >
        <span className="text-base leading-none">+</span>
        Log Communication
      </button>

      {/* Mobile: floating action button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-500 active:bg-brand-700 transition-colors"
        aria-label="Log communication"
        title="Log a call, text, or conversation"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <line x1="12" y1="8" x2="12" y2="14" />
          <line x1="9" y1="11" x2="15" y2="11" />
        </svg>
      </button>

      <QuickCaptureWidget
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        prefillClientId={prefillClientId}
        prefillClientName={prefillClientName}
        prefillEventId={prefillEventId}
      />
    </>
  )
}
