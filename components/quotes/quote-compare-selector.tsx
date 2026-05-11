'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuoteForCompare {
  id: string
  quote_name: string | null
  occasion: string | null
}

export function QuoteCompareSelector({ quotes }: { quotes: QuoteForCompare[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isCompareMode, setIsCompareMode] = useState(false)

  if (quotes.length < 2) return null

  function toggleQuote(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 4) {
        next.add(id)
      }
      return next
    })
  }

  function goToCompare() {
    if (selected.size < 2) return
    const ids = Array.from(selected).join(',')
    router.push(`/my-quotes/compare?ids=${ids}`)
  }

  if (!isCompareMode) {
    return (
      <button
        type="button"
        onClick={() => setIsCompareMode(true)}
        className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
      >
        Compare quotes
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">
          Select 2-4 quotes to compare ({selected.size} selected)
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsCompareMode(false)
              setSelected(new Set())
            }}
            className="text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={goToCompare}
            disabled={selected.size < 2}
            className="text-sm px-3 py-1.5 rounded-lg bg-brand-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-600 transition-colors"
          >
            Compare
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {quotes.map((quote) => (
          <label
            key={quote.id}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected.has(quote.id)
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-stone-800 hover:border-stone-600'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(quote.id)}
              onChange={() => toggleQuote(quote.id)}
              className="w-4 h-4 rounded border-stone-600 text-brand-500 focus:ring-brand-500 bg-stone-900"
            />
            <span className="text-sm text-stone-200">
              {quote.quote_name || quote.occasion || 'Quote'}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
