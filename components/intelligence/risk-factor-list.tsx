'use client'

// Risk Factor List - breakdown of risk factors with severity indicators

import type { RiskFactor } from '@/lib/intelligence/client-risk'

const SEVERITY_STYLES = {
  critical: {
    border: 'border-red-800/40',
    bg: 'bg-red-950/30',
    text: 'text-red-300',
    sub: 'text-red-400/70',
    dot: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-800/40',
    bg: 'bg-amber-950/30',
    text: 'text-amber-300',
    sub: 'text-amber-400/70',
    dot: 'bg-amber-500',
  },
  info: {
    border: 'border-stone-700',
    bg: 'bg-stone-800/50',
    text: 'text-stone-300',
    sub: 'text-stone-400',
    dot: 'bg-stone-500',
  },
}

interface RiskFactorListProps {
  factors: RiskFactor[]
}

export function RiskFactorList({ factors }: RiskFactorListProps) {
  if (factors.length === 0) return null

  return (
    <div className="space-y-1.5">
      {factors.map((factor, i) => {
        const style = SEVERITY_STYLES[factor.severity]
        return (
          <div
            key={`${factor.type}-${i}`}
            className={`flex items-start gap-2.5 rounded-lg border ${style.border} ${style.bg} px-3 py-2`}
          >
            <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${style.text}`}>{factor.label}</p>
              <p className={`text-xs ${style.sub}`}>{factor.description}</p>
            </div>
            <span className="text-xs text-stone-500 shrink-0 mt-0.5">+{factor.weight}</span>
          </div>
        )
      })}
    </div>
  )
}
