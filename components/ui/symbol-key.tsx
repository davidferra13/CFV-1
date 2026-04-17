'use client'

import { useState } from 'react'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { SYMBOL_REGISTRY } from '@/lib/ui/symbol-registry'
import {
  Snowflake,
  Flame,
  Leaf,
  AlertTriangle,
  Clock,
  Thermometer,
  Home,
  Circle,
  Key,
} from '@/components/ui/icons'

// Map icon names to actual components
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Snowflake,
  Flame,
  Leaf,
  AlertTriangle,
  Clock,
  Thermometer,
  Home,
  Circle,
  Key,
}

function SymbolIcon({ iconName, color }: { iconName: string; color?: string }) {
  const Icon = ICON_MAP[iconName]
  if (!Icon) return null
  return <Icon className={`h-4 w-4 ${color ?? 'text-stone-400'}`} />
}

// Trigger button (small key icon for placing in header/layout)
export function SymbolKeyTrigger() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors rounded-md hover:bg-stone-800"
        title="Symbol Key"
      >
        <Key className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Key</span>
      </button>

      <AccessibleDialog
        open={open}
        onClose={() => setOpen(false)}
        title="ChefFlow Symbol Key"
        closeOnBackdrop
        widthClassName="max-w-sm"
      >
        <div className="space-y-5">
          {SYMBOL_REGISTRY.map((category) => (
            <div key={category.name}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                {category.name}
              </h4>
              <div className="space-y-1.5">
                {category.symbols.map((symbol) => (
                  <div key={symbol.id} className="flex items-center gap-2.5 text-sm">
                    <SymbolIcon iconName={symbol.icon} color={symbol.color} />
                    <span className="text-stone-300">{symbol.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AccessibleDialog>
    </>
  )
}
