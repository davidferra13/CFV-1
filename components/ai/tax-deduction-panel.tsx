'use client'

import { useState } from 'react'
import { Receipt, Loader2, Bot, AlertTriangle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  identifyMissedDeductions,
  type TaxDeductionResult,
} from '@/lib/ai/tax-deduction-identifier'
import { toast } from 'sonner'

function formatDollars(cents: number) {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export function TaxDeductionPanel() {
  const [result, setResult] = useState<TaxDeductionResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await identifyMissedDeductions()
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tax analysis failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Missed Deduction Scanner</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Bot className="w-3 h-3 mr-1" />
                Scan Deductions
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Scans this year's expenses for potentially missed or miscategorized deductions.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Missed Deductions</span>
          <Badge variant={result.flags.length > 0 ? 'warning' : 'success'}>
            {result.flags.length} flags
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {result.totalEstimatedMissedCents > 0 && (
            <span className="text-xs font-medium text-amber-700">
              {formatDollars(result.totalEstimatedMissedCents)} potentially missed
            </span>
          )}
          <Button variant="ghost" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Re-scan'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-stone-400">{result.summary}</p>

      {result.flags.length > 0 && (
        <div className="space-y-2">
          {result.flags.map((flag, i) => (
            <div
              key={i}
              className={`border rounded p-2 ${flag.priority === 'high' ? 'border-red-200 bg-red-950' : flag.priority === 'medium' ? 'border-amber-200 bg-amber-950' : 'border-stone-700 bg-stone-800'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle
                  className={`w-3 h-3 flex-shrink-0 ${flag.priority === 'high' ? 'text-red-500' : 'text-amber-500'}`}
                />
                <span className="text-xs font-medium text-stone-300">{flag.category}</span>
                {flag.estimatedAnnualValueCents && (
                  <span className="text-[11px] text-stone-500 ml-auto">
                    {formatDollars(flag.estimatedAnnualValueCents)}/yr
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">{flag.description}</p>
              <p className="text-xs text-brand-400 mt-0.5">→ {flag.action}</p>
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] text-stone-400 border-t border-stone-800 pt-2">
        {result.disclaimer}
      </div>
    </div>
  )
}
