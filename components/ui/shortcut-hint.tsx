'use client'

interface ShortcutHintProps {
  keys: string[]
  className?: string
}

/**
 * Renders a small inline keyboard shortcut hint.
 *
 * Examples:
 *   <ShortcutHint keys={['G', 'D']} />   → "G then D" as kbd badges
 *   <ShortcutHint keys={['⌘', 'K']} />  → "⌘ K" as kbd badges
 */
export function ShortcutHint({ keys, className = '' }: ShortcutHintProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {keys.map((key, idx) => (
        <span key={idx} className="inline-flex items-center gap-1">
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-stone-600 bg-stone-800 text-xs font-mono text-stone-400 leading-none">
            {key}
          </kbd>
          {idx < keys.length - 1 && (
            <span className="text-xs text-stone-500 leading-none">then</span>
          )}
        </span>
      ))}
    </span>
  )
}
