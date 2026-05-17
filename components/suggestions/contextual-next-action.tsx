// Contextual Next Action suggestion banner
// Shows 1-2 inline suggestions based on entity state. Subtle, not a full card.
// Reusable across event, client, and inquiry detail pages.

import Link from 'next/link'
import { ArrowRight } from '@/components/ui/icons'

export interface ContextualSuggestion {
  label: string
  description: string
  href: string
  tone: 'amber' | 'emerald' | 'sky' | 'rose' | 'stone'
}

const TONE_CLASSES: Record<
  ContextualSuggestion['tone'],
  { bg: string; text: string; arrow: string }
> = {
  amber: {
    bg: 'border-amber-700/40 bg-amber-950/30',
    text: 'text-amber-200',
    arrow: 'text-amber-400 hover:text-amber-300',
  },
  emerald: {
    bg: 'border-emerald-700/40 bg-emerald-950/30',
    text: 'text-emerald-200',
    arrow: 'text-emerald-400 hover:text-emerald-300',
  },
  sky: {
    bg: 'border-sky-700/40 bg-sky-950/30',
    text: 'text-sky-200',
    arrow: 'text-sky-400 hover:text-sky-300',
  },
  rose: {
    bg: 'border-rose-700/40 bg-rose-950/30',
    text: 'text-rose-200',
    arrow: 'text-rose-400 hover:text-rose-300',
  },
  stone: {
    bg: 'border-stone-700/40 bg-stone-800/30',
    text: 'text-stone-200',
    arrow: 'text-stone-400 hover:text-stone-300',
  },
}

interface Props {
  suggestions: ContextualSuggestion[]
  /** Max suggestions to show (default 2) */
  max?: number
}

export function ContextualNextAction({ suggestions, max = 2 }: Props) {
  const visible = suggestions.slice(0, max)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {visible.map((suggestion) => {
        const tone = TONE_CLASSES[suggestion.tone]
        return (
          <Link
            key={suggestion.label}
            href={suggestion.href}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-opacity hover:opacity-80 ${tone.bg}`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${tone.text}`}>{suggestion.label}</p>
              <p className="text-xs text-stone-400 mt-0.5">{suggestion.description}</p>
            </div>
            <ArrowRight className={`h-4 w-4 shrink-0 ${tone.arrow}`} />
          </Link>
        )
      })}
    </div>
  )
}
