// Lead Likelihood Toggle
// One-click manual Hot/Warm/Cold tag for lead qualification.
// Overrides computed booking score for display — click again to unset (revert to auto).
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setInquiryLikelihood } from '@/lib/inquiries/likelihood-actions'

type Likelihood = 'hot' | 'warm' | 'cold'

interface LikelihoodToggleProps {
  inquiryId: string
  currentLikelihood: Likelihood | null
}

const TAGS: {
  value: Likelihood
  label: string
  tooltip: string
  color: string
  activeColor: string
}[] = [
  {
    value: 'hot',
    label: 'Hot',
    tooltip: 'Likely to book — strong interest, good fit',
    color: 'text-red-500 border-red-200 hover:bg-red-50',
    activeColor: 'bg-red-500 text-white border-red-500',
  },
  {
    value: 'warm',
    label: 'Warm',
    tooltip: 'Might book — interested but undecided',
    color: 'text-amber-500 border-amber-200 hover:bg-amber-50',
    activeColor: 'bg-amber-500 text-white border-amber-500',
  },
  {
    value: 'cold',
    label: 'Cold',
    tooltip: "Probably won't book — shopping around or poor fit",
    color: 'text-blue-500 border-blue-200 hover:bg-blue-50',
    activeColor: 'bg-blue-500 text-white border-blue-500',
  },
]

export function LikelihoodToggle({ inquiryId, currentLikelihood }: LikelihoodToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState<Likelihood | null>(currentLikelihood)

  const handleClick = (value: Likelihood) => {
    const newValue = optimistic === value ? null : value
    setOptimistic(newValue)
    startTransition(async () => {
      try {
        await setInquiryLikelihood(inquiryId, newValue)
        router.refresh()
      } catch (err) {
        // Revert on error
        setOptimistic(currentLikelihood)
        console.error('[LikelihoodToggle] Failed:', err)
      }
    })
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-stone-400 mr-0.5">Your gut feel:</span>
      {TAGS.map((tag) => {
        const isActive = optimistic === tag.value
        return (
          <button
            key={tag.value}
            type="button"
            title={tag.tooltip}
            disabled={isPending}
            onClick={() => handleClick(tag.value)}
            className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
              isActive ? tag.activeColor : tag.color
            } ${isPending ? 'opacity-50' : ''}`}
          >
            {tag.label}
          </button>
        )
      })}
    </div>
  )
}
