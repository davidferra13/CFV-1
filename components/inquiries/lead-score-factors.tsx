'use client'

interface LeadScoreFactorsProps {
  factors: string[]
}

export function LeadScoreFactors({ factors }: LeadScoreFactorsProps) {
  if (!factors.length) return null

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-stone-400">Score Factors</p>
      <div className="flex flex-wrap gap-1">
        {factors.map((factor, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-md bg-stone-800 px-2 py-0.5 text-xs text-stone-300"
          >
            {factor}
          </span>
        ))}
      </div>
    </div>
  )
}
