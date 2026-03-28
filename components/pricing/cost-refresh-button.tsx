'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { refreshIngredientCostsAction } from '@/lib/pricing/cost-refresh-actions'

export function CostRefreshButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)

  function handleRefresh() {
    setResult(null)
    startTransition(async () => {
      try {
        const res = await refreshIngredientCostsAction()
        if (res.skipped) {
          setResult('A refresh is already running.')
        } else {
          const parts: string[] = []
          if (res.refreshed > 0) parts.push(`Updated ${res.refreshed} prices`)
          if (res.unmatched > 0) parts.push(`${res.unmatched} need matching`)
          if (res.errors.length > 0) parts.push(`${res.errors.length} errors`)
          setResult(parts.join('. ') || 'No ingredients to refresh.')
        }
      } catch {
        setResult('Failed to refresh prices. Try again.')
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button size="sm" variant="secondary" onClick={handleRefresh} disabled={isPending}>
        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Refreshing...' : 'Refresh All Prices'}
      </Button>
      {result && <span className="text-xs text-stone-400">{result}</span>}
    </div>
  )
}
