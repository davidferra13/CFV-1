'use client'

import { useState } from 'react'
import { Shield, Loader2, Bot, AlertTriangle } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateContingencyPlans, type ContingencyAIResult } from '@/lib/ai/contingency-ai'
import { toast } from 'sonner'

const RISK_COLORS: Record<string, string> = {
  critical: 'border-red-200 bg-red-950',
  high: 'border-amber-200 bg-amber-950',
  medium: 'border-stone-700 bg-stone-800',
}

export function ContingencyAIPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<ContingencyAIResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await generateContingencyPlans(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Contingency generation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Contingency Plans</span>
            <Badge variant="info">Auto</Badge>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Planning...
              </>
            ) : (
              <>
                <Bot className="w-3 h-3 mr-1" />
                Generate Plans
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Generates "if X fails, do Y" plans based on this event's specific risk profile.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Contingency Plans</span>
          <Badge variant="warning">Draft</Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Regenerate'}
        </Button>
      </div>

      {result.topRisk && (
        <div className="flex items-start gap-2 bg-amber-950 border border-amber-200 rounded p-2 text-xs text-amber-200">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            <span className="font-medium">Top risk:</span> {result.topRisk}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {result.plans.map((plan, i) => (
          <div key={i} className={`border rounded p-3 space-y-1.5 ${RISK_COLORS[plan.riskLevel]}`}>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${plan.riskLevel === 'critical' ? 'bg-red-200 text-red-200' : plan.riskLevel === 'high' ? 'bg-amber-200 text-amber-200' : 'bg-stone-700 text-stone-300'}`}
              >
                {plan.riskLevel}
              </span>
              <span className="text-xs font-medium text-stone-300">{plan.scenarioLabel}</span>
              {plan.timeImpact && (
                <span className="text-[11px] text-stone-500 ml-auto">{plan.timeImpact}</span>
              )}
            </div>
            <p className="text-xs text-stone-300">{plan.mitigationNotes}</p>
            <p className="text-[11px] text-stone-500">
              <span className="font-medium">Prevention:</span> {plan.preventionTip}
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-stone-400">
        Draft · Add these to the Contingency Panel above to save them to this event
      </p>
    </div>
  )
}
