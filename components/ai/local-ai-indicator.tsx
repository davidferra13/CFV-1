'use client'

export type LocalAiMode = 'local' | 'cloud' | 'fallback'

export function LocalAiIndicator({ mode }: { mode: LocalAiMode }) {
  if (mode === 'cloud') return null

  const config = {
    local: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Local AI' },
    fallback: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Cloud (local unavailable)' },
  }[mode]

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
