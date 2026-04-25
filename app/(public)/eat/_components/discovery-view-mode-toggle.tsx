'use client'

import { ImageIcon } from 'lucide-react'

export function DiscoveryViewModeToggle({
  visualMode,
  setParam,
}: {
  visualMode: boolean
  setParam: (key: string, value: string | null) => void
}) {
  return (
    <button
      type="button"
      onClick={() => setParam('visual', visualMode ? null : '1')}
      className={[
        'inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors',
        visualMode
          ? 'border-brand-500 bg-brand-500/20 text-brand-100'
          : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500 hover:text-stone-100',
      ].join(' ')}
      aria-pressed={visualMode}
      title="Toggle picture-first browsing"
    >
      <ImageIcon className="h-4 w-4" />
      Visual
    </button>
  )
}
