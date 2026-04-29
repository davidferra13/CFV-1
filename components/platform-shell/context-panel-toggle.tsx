'use client'

import { ChevronRight } from '@/components/ui/icons'

type ContextPanelToggleProps = {
  open: boolean
  onClick: () => void
  label?: string
}

export function ContextPanelToggle({ open, onClick, label = 'Context' }: ContextPanelToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm font-medium text-stone-200 shadow-sm transition-colors hover:bg-stone-800"
    >
      <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
      {label}
    </button>
  )
}
