'use client'

import { useState } from 'react'

type Props = {
  referenceView: React.ReactNode
  wizardView: React.ReactNode
  complianceView: React.ReactNode
}

const TABS = [
  { id: 'reference' as const, label: 'Reference Document' },
  { id: 'wizard' as const, label: 'Guided Review' },
  { id: 'compliance' as const, label: 'CCP Compliance' },
]

export function HACCPPageTabs({ referenceView, wizardView, complianceView }: Props) {
  const [tab, setTab] = useState<'reference' | 'wizard' | 'compliance'>('reference')

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-stone-800 rounded-lg p-1 w-fit print:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'reference' && referenceView}
      {tab === 'wizard' && wizardView}
      {tab === 'compliance' && complianceView}
    </div>
  )
}
