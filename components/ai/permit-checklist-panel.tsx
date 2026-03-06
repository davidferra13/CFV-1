'use client'

import { useState } from 'react'
import {
  ClipboardCheck,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  generatePermitRenewalChecklist,
  type PermitChecklistResult,
} from '@/lib/ai/permit-checklist'
import { toast } from 'sonner'

export function PermitChecklistPanel({ permitId }: { permitId?: string }) {
  const [result, setResult] = useState<PermitChecklistResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await generatePermitRenewalChecklist(permitId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checklist generation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Permit Renewal Checklist</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Checklist
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Step-by-step permit renewal checklist with lead times and estimated costs.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">{result.permitType}</span>
          {result.renewalStartDate && (
            <Badge variant="warning">Start by {result.renewalStartDate}</Badge>
          )}
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-center">
        <div className="bg-stone-800 rounded p-2">
          <div className="font-medium text-stone-300">{result.jurisdiction}</div>
          <div className="text-stone-400">Jurisdiction</div>
        </div>
        <div className="bg-stone-800 rounded p-2">
          <div className="font-medium text-stone-300">{result.expiryDate ?? 'Unknown'}</div>
          <div className="text-stone-400">Expiry Date</div>
        </div>
        <div className="bg-stone-800 rounded p-2">
          <div className="font-medium text-stone-300">{result.estimatedCostRange}</div>
          <div className="text-stone-400">Est. Cost</div>
        </div>
      </div>

      <div className="space-y-1.5">
        {result.checklist.map((item) => (
          <div
            key={item.step}
            className={`flex items-start gap-2 text-xs p-2 rounded ${item.isRequired ? 'bg-stone-800' : 'bg-stone-800 opacity-75'}`}
          >
            <div className="w-5 h-5 rounded-full bg-brand-900 text-brand-400 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">
              {item.step}
            </div>
            <div className="flex-1">
              <div className="text-stone-300 font-medium">{item.task}</div>
              <div className="text-stone-400 text-[11px]">
                {item.leadTimeDays} days before expiry{item.notes ? ' · ' + item.notes : ''}
              </div>
            </div>
            {!item.isRequired && (
              <span className="text-[10px] text-stone-400 flex-shrink-0">optional</span>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-stone-400 bg-stone-800 rounded p-2">{result.keyContacts}</div>

      <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-950 border border-amber-200 rounded p-2">
        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
        {result.disclaimer}
      </div>
    </div>
  )
}
