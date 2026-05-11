'use client'

import { PackItemRow } from './pack-item-row'
import type { PackChecklistItem, PackCategory } from '@/lib/mobile/pack-checklist'

export function PackCategoryGroup({
  label,
  category,
  items,
  onToggle,
}: {
  label: string
  category: PackCategory
  items: PackChecklistItem[]
  onToggle: (id: string, checked: boolean) => void
}) {
  const checkedCount = items.filter((i) => i.checked).length
  const allChecked = checkedCount === items.length

  return (
    <div className="space-y-2">
      {/* Category header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">
          {label}
        </h3>
        <span className={`text-xs font-medium ${allChecked ? 'text-green-400' : 'text-stone-600'}`}>
          {checkedCount}/{items.length}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => (
          <PackItemRow
            key={item.id}
            id={item.id}
            label={item.label}
            checked={item.checked}
            isEventSpecific={category === 'event_specific'}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
