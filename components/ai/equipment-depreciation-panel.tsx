'use client'

import { useState } from 'react'
import { Wrench, Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  explainEquipmentDepreciation,
  type EquipmentDepreciationReport,
} from '@/lib/ai/equipment-depreciation-explainer'
import { toast } from 'sonner'

export function EquipmentDepreciationPanel() {
  const [result, setResult] = useState<EquipmentDepreciationReport | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await explainEquipmentDepreciation()
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Explanation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-700">Equipment Depreciation Guide</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Explaining...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Explain My Equipment
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Plain-English explanation of each item's depreciation schedule and annual deduction.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-700">Equipment Depreciation</span>
          <Badge variant="info">${result.totalAnnualDeductionDollars.toFixed(0)}/yr total</Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <p className="text-xs text-stone-600">{result.currentYearSummary}</p>

      <div className="space-y-2">
        {result.items.map((item, i) => (
          <div key={i} className="border border-stone-100 rounded p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-700">{item.itemName}</span>
              <span className="text-xs text-green-700 font-medium">
                ${item.annualDeductionDollars.toFixed(0)}/yr
              </span>
            </div>
            <div className="text-[11px] text-stone-500">
              {item.depreciationMethod} · Year {item.yearInSchedule} · Fully depreciated:{' '}
              {item.fullyDepreciatedDate} · Remaining value: $
              {item.remainingValueDollars.toFixed(0)}
            </div>
            <p className="text-xs text-stone-600">{item.plainEnglishExplanation}</p>
            {item.bonusDepreciationNote && (
              <p className="text-xs text-brand-700">{item.bonusDepreciationNote}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-stone-600 bg-stone-50 border border-stone-200 rounded p-2">
        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
        {result.disclaimer}
      </div>
    </div>
  )
}
