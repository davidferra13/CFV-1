// Briefing Alerts Banner
// Shows only critical/high alerts from the morning briefing on the Daily Ops page.
// Chef sees urgent items without having to navigate to /briefing first.

import Link from 'next/link'
import { getMorningBriefing } from '@/lib/briefing/get-morning-briefing'
import { Badge } from '@/components/ui/badge'

function severityColor(severity: string): string {
  if (severity === 'critical') return 'bg-red-950/40 border-red-900/50'
  if (severity === 'high') return 'bg-amber-950/30 border-amber-900/40'
  return 'bg-stone-800/50 border-stone-700'
}

function severityBadge(severity: string): 'error' | 'warning' | 'default' {
  if (severity === 'critical') return 'error'
  if (severity === 'high') return 'warning'
  return 'default'
}

export async function BriefingAlertsBanner() {
  let briefing
  try {
    briefing = await getMorningBriefing()
  } catch {
    return null
  }

  const urgent = briefing.alerts.filter((a) => a.severity === 'critical' || a.severity === 'high')

  if (urgent.length === 0) return null

  return (
    <div className="space-y-2">
      {urgent.map((alert, idx) => (
        <Link key={idx} href={alert.href}>
          <div
            className={`rounded-lg border px-4 py-3 flex items-center justify-between transition-colors hover:brightness-110 ${severityColor(alert.severity)}`}
          >
            <div className="flex items-center gap-3">
              <Badge variant={severityBadge(alert.severity)} className="text-[10px] uppercase">
                {alert.severity}
              </Badge>
              <div>
                <p className="text-sm font-medium text-stone-100">{alert.title}</p>
                <p className="text-xs text-stone-400">{alert.detail}</p>
              </div>
            </div>
            <span className="text-xs text-stone-500 shrink-0 ml-3">View</span>
          </div>
        </Link>
      ))}
      {urgent.length > 0 && (
        <div className="text-right">
          <Link href="/briefing" className="text-xs text-stone-500 hover:text-stone-300">
            Full briefing ({briefing.alerts.length} alert{briefing.alerts.length !== 1 ? 's' : ''})
          </Link>
        </div>
      )}
    </div>
  )
}
