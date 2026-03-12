// Auto-Fill Badge
// Small indicator next to form fields that were pre-filled from client history.
'use client'

export function AutoFillBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-400 bg-brand-950 border border-brand-800 rounded px-1.5 py-0.5 ml-1.5">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
        <path
          d="M2 5.5L4 7.5L8 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label || 'from history'}
    </span>
  )
}
