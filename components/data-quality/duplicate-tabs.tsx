// Data Quality Tabs
// Client-side tab navigation for switching between entity types.

'use client'

import { useState, type ReactNode } from 'react'

interface Tab {
  key: string
  label: string
  count: number
  content: ReactNode
}

export function DuplicateTabs({ tabs }: { tabs: Tab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || '')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-stone-700 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-stone-100'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-950 border border-amber-800 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                {tab.count}
              </span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tabs.map((tab) => (
        <div key={tab.key} className={activeTab === tab.key ? 'block' : 'hidden'}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}
