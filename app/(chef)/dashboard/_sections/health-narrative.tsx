// Health Narrative Section - AI-generated business health summary
// Server component that calls health narrative actions and renders sections + alerts.

import {
  generateHealthNarrative,
  getHealthAlerts,
} from '@/lib/intelligence/health-narrative-actions'
import type {
  NarrativeSentiment,
  NarrativeSection,
  HealthAlert,
} from '@/lib/intelligence/health-narrative-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const SENTIMENT_STYLES: Record<NarrativeSentiment, { dot: string; border: string }> = {
  positive: { dot: 'bg-emerald-400', border: 'border-emerald-800/30' },
  neutral: { dot: 'bg-stone-400', border: 'border-stone-700/40' },
  warning: { dot: 'bg-amber-400', border: 'border-amber-800/30' },
  critical: { dot: 'bg-red-400', border: 'border-red-800/30' },
}

const ALERT_SEVERITY_STYLES: Record<
  string,
  { bg: string; border: string; text: string; badge: string }
> = {
  critical: {
    bg: 'bg-red-950/30',
    border: 'border-red-800/40',
    text: 'text-red-300',
    badge: 'bg-red-900/60 text-red-300 border-red-700/50',
  },
  warning: {
    bg: 'bg-amber-950/30',
    border: 'border-amber-800/40',
    text: 'text-amber-300',
    badge: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
  },
  info: {
    bg: 'bg-blue-950/30',
    border: 'border-blue-800/40',
    text: 'text-blue-300',
    badge: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
  },
}

function SectionCard({ section }: { section: NarrativeSection }) {
  const style = SENTIMENT_STYLES[section.sentiment]
  return (
    <div className={`rounded-lg border ${style.border} bg-stone-900/40 p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-2 w-2 rounded-full ${style.dot} shrink-0`} />
        <h3 className="text-sm font-medium text-stone-200">{section.title}</h3>
      </div>
      <p className="text-sm text-stone-400 mb-3">{section.content}</p>
      {section.metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {section.metrics.map((m) => (
            <div key={m.label} className="flex justify-between text-xs">
              <span className="text-stone-500">{m.label}</span>
              <span className="text-stone-300 font-medium">{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertItem({ alert }: { alert: HealthAlert }) {
  const style = ALERT_SEVERITY_STYLES[alert.severity] ?? ALERT_SEVERITY_STYLES.info
  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3`}>
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${style.badge}`}
        >
          {alert.severity}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${style.text}`}>{alert.title}</p>
          <p className="text-xs text-stone-400 mt-0.5">{alert.detail}</p>
        </div>
        <span className="text-xs text-stone-500 shrink-0 tabular-nums">{alert.currentValue}</span>
      </div>
    </div>
  )
}

export async function HealthNarrativeSection() {
  try {
    const [narrativeResult, alertsResult] = await Promise.all([
      generateHealthNarrative(),
      getHealthAlerts(),
    ])

    // If both fail, render nothing
    if (!narrativeResult.success && !alertsResult.success) {
      return null
    }

    const narrative = narrativeResult.success ? narrativeResult.data : null
    const alerts = alertsResult.success ? (alertsResult.data ?? []) : []

    // No data at all
    if (!narrative && alerts.length === 0) {
      return null
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle as="h2">Business Health</CardTitle>
            {narrative && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-stone-500">
                  {narrative.source === 'ollama' ? 'AI Generated' : 'Template'}
                </span>
                {narrative.confidence < 0.5 && (
                  <span className="text-[10px] text-amber-500">Limited data</span>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Alerts first when present */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          )}

          {/* AI narrative summary */}
          {narrative?.generatedText && (
            <div className="rounded-lg bg-stone-900/60 border border-stone-800/50 p-4">
              <p className="text-sm text-stone-300 leading-relaxed whitespace-pre-line">
                {narrative.generatedText}
              </p>
            </div>
          )}

          {/* Metric sections grid */}
          {narrative?.sections && narrative.sections.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {narrative.sections.map((section) => (
                <SectionCard key={section.title} section={section} />
              ))}
            </div>
          )}

          {/* Footer metadata */}
          {narrative && (
            <p className="text-[10px] text-stone-600 text-right">
              Last updated: {new Date(narrative.generatedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    )
  } catch (err) {
    console.error('[Dashboard/HealthNarrativeSection] failed:', err)
    return null
  }
}
