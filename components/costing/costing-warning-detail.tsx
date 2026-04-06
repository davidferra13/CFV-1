'use client'

// Warning explanation component for costing warnings.
// Renders an expandable detail section below a warning badge.
// All content is static (from knowledge.ts). No server calls.

import { useState } from 'react'
import { AlertTriangle, Info } from '@/components/ui/icons'
import { WARNING_EXPLANATIONS, type CostingWarning } from '@/lib/costing/knowledge'

interface CostingWarningDetailProps {
  warning: CostingWarning
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; icon: string; badge: string }> =
  {
    info: {
      border: 'border-stone-600',
      bg: 'bg-stone-800/50',
      icon: 'text-stone-400',
      badge: 'bg-stone-700 text-stone-300',
    },
    amber: {
      border: 'border-amber-700/50',
      bg: 'bg-amber-950/20',
      icon: 'text-amber-400',
      badge: 'bg-amber-900/40 text-amber-300',
    },
    red: {
      border: 'border-red-700/50',
      bg: 'bg-red-950/20',
      icon: 'text-red-400',
      badge: 'bg-red-900/40 text-red-300',
    },
  }

export function CostingWarningDetail({ warning }: CostingWarningDetailProps) {
  const [expanded, setExpanded] = useState(false)

  const explanation = WARNING_EXPLANATIONS[warning.type]
  if (!explanation) return null

  const styles = SEVERITY_STYLES[warning.severity] || SEVERITY_STYLES.info
  const Icon = warning.severity === 'info' ? Info : AlertTriangle

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg}`}>
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm"
        aria-expanded={expanded}
      >
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${styles.icon}`} />
        <span className="text-stone-300 flex-1">{warning.message}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${styles.badge}`}>{warning.severity}</span>
        <svg
          className={`h-3.5 w-3.5 text-stone-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-stone-700/50 space-y-2">
          <div>
            <p className="text-xs font-medium text-stone-400 mb-0.5">What this means</p>
            <p className="text-xs text-stone-500">{explanation.description}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-stone-400 mb-0.5">Why it happens</p>
            <p className="text-xs text-stone-500">{explanation.cause}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-stone-400 mb-0.5">What to do</p>
            <p className="text-xs text-stone-500">{explanation.action}</p>
          </div>
          <a
            href={`/help/food-costing#${explanation.guideSection}`}
            className="block text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            Read full guide section →
          </a>
        </div>
      )}
    </div>
  )
}

/**
 * Renders a list of costing warnings with expandable details.
 */
export function CostingWarningList({ warnings }: { warnings: CostingWarning[] }) {
  if (!warnings.length) return null

  // Sort: red first, then amber, then info
  const sorted = [...warnings].sort((a, b) => {
    const order = { red: 0, amber: 1, info: 2 }
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
  })

  return (
    <div className="space-y-1.5">
      {sorted.map((warning, i) => (
        <CostingWarningDetail
          key={`${warning.type}-${warning.ingredientId ?? i}`}
          warning={warning}
        />
      ))}
    </div>
  )
}
