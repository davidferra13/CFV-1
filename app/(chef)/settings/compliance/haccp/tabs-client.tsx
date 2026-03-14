'use client'

import { useState } from 'react'

type Props = {
  referenceView: React.ReactNode
  wizardView: React.ReactNode
}

export function HACCPPageTabs({ referenceView, wizardView }: Props) {
  const [tab, setTab] = useState<'reference' | 'wizard'>('reference')

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-stone-800 rounded-lg p-1 w-fit print:hidden">
        <button
          onClick={() => setTab('reference')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'reference'
              ? 'bg-stone-700 text-stone-100'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Reference Document
        </button>
        <button
          onClick={() => setTab('wizard')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'wizard' ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Guided Review
        </button>
      </div>

      {/* Content */}
      {tab === 'reference' ? referenceView : wizardView}
    </div>
  )
}
