'use client'

import { useState } from 'react'
import { GroceryItemRow } from './grocery-item-row'
import type { GroceryRunSection } from '@/lib/mobile/grocery-run'

interface GrocerySectionProps {
  section: GroceryRunSection
  onToggleItem: (ingredientId: string, checked: boolean) => void
}

const SECTION_ICONS: Record<string, string> = {
  Produce: '\u{1F966}',
  Bakery: '\u{1F35E}',
  Deli: '\u{1F969}',
  'Meat/Seafood': '\u{1F357}',
  Dairy: '\u{1F95B}',
  Frozen: '\u{2744}\u{FE0F}',
  Pantry: '\u{1F3E0}',
  Other: '\u{1F4E6}',
}

export function GrocerySection({ section, onToggleItem }: GrocerySectionProps) {
  const [collapsed, setCollapsed] = useState(false)
  const allChecked = section.checkedCount === section.items.length
  const icon = SECTION_ICONS[section.section] ?? '\u{1F4E6}'

  return (
    <div className="border-b border-stone-800">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-4 py-3 bg-stone-850 active:bg-stone-700 transition-colors"
        style={{ backgroundColor: allChecked ? 'rgb(6, 78, 59)' : 'rgb(28, 25, 23)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span
            className={`text-sm font-semibold uppercase tracking-wide ${
              allChecked ? 'text-emerald-300' : 'text-stone-200'
            }`}
          >
            {section.section}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">
            {section.checkedCount}/{section.items.length}
          </span>
          <svg
            className={`w-4 h-4 text-stone-500 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="divide-y divide-stone-800/50">
          {section.items.map((item) => (
            <GroceryItemRow key={item.id} item={item} onToggle={onToggleItem} />
          ))}
        </div>
      )}
    </div>
  )
}
