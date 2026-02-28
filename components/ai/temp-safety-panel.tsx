'use client'

import { useState } from 'react'
import { Thermometer, Loader2, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { analyzeTempLog, type TempLogAnomalyResult } from '@/lib/ai/temp-log-anomaly'
import { toast } from 'sonner'
import { AiSourceBadge } from './ai-source-badge'

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-green-400',
  medium: 'text-amber-400',
  low: 'text-red-400',
}

export function TempSafetyPanel({ eventId }: { eventId: string }) {
  const [result, setResult] = useState<
    (TempLogAnomalyResult & { _aiSource?: 'formula' | 'ai' }) | null
  >(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await analyzeTempLog(eventId)
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Temp log analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const statusVariant =
    result?.overallStatus === 'clear'
      ? 'success'
      : result?.overallStatus === 'warnings'
        ? 'warning'
        : 'error'

  if (!result) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-stone-300">Temperature Safety Check</span>
          </div>
          <Button variant="secondary" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                Analyze Temp Log
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Checks temperature log entries against FDA Food Code standards.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-brand-600" />
          <span className="text-sm font-medium text-stone-300">Temperature Safety</span>
          <Badge variant={statusVariant as any}>
            {result.overallStatus === 'clear' ? 'All Clear' : result.overallStatus}
          </Badge>
        </div>
        <Button variant="ghost" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Re-check'}
        </Button>
      </div>

      <p className="text-xs text-stone-400">{result.summary}</p>

      {result.violations.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-950 rounded p-2">
          <CheckCircle className="w-3 h-3" />
          No food safety violations detected.
        </div>
      )}

      {result.violations.length > 0 && (
        <div className="space-y-2">
          {result.violations.map((v, i) => (
            <div
              key={i}
              className={`border rounded p-2 space-y-1 ${v.severity === 'critical' ? 'border-red-200 bg-red-950' : v.severity === 'warning' ? 'border-amber-200 bg-amber-950' : 'border-stone-700 bg-stone-800'}`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-3 h-3 flex-shrink-0 ${v.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`}
                />
                <span className="text-xs font-medium text-stone-300">
                  {v.item} — {v.tempF}°F at {v.loggedAt}
                </span>
              </div>
              <p className="text-xs text-stone-400">{v.issue}</p>
              <p className="text-[11px] text-stone-500">{v.regulatoryRef}</p>
              <p className="text-xs text-brand-400">→ {v.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-400">
        <AiSourceBadge source={result._aiSource} />
        {result._aiSource ? ' · ' : ''}
        Confidence:{' '}
        <span className={CONFIDENCE_COLORS[result.confidence] ?? 'text-stone-400'}>
          {result.confidence}
        </span>
        {' · '}Always apply your food safety training and judgment
      </p>
    </div>
  )
}
