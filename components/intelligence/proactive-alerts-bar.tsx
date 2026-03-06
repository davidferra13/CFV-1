import { getProactiveAlerts } from '@/lib/intelligence/proactive-alerts'

export async function ProactiveAlertsBar() {
  const result = await getProactiveAlerts().catch(() => null)

  if (!result || result.alerts.length === 0) return null

  const criticals = result.alerts.filter((a) => a.severity === 'critical')
  const warnings = result.alerts.filter((a) => a.severity === 'warning')
  const opportunities = result.alerts.filter((a) => a.severity === 'opportunity')

  return (
    <div className="space-y-2">
      {criticals.map((alert) => (
        <div
          key={alert.id}
          className="flex items-start gap-2 rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2"
        >
          <span className="text-sm mt-0.5">{alert.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-300">{alert.title}</p>
            <p className="text-xs text-red-400/70">{alert.detail}</p>
          </div>
          {alert.link && (
            <a href={alert.link} className="text-xs text-red-300 hover:underline shrink-0">
              {alert.action}
            </a>
          )}
        </div>
      ))}

      {warnings.map((alert) => (
        <div
          key={alert.id}
          className="flex items-start gap-2 rounded-lg border border-amber-800/40 bg-amber-950/30 px-3 py-2"
        >
          <span className="text-sm mt-0.5">{alert.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">{alert.title}</p>
            <p className="text-xs text-amber-400/70">{alert.detail}</p>
          </div>
          {alert.link && (
            <a href={alert.link} className="text-xs text-amber-300 hover:underline shrink-0">
              {alert.action}
            </a>
          )}
        </div>
      ))}

      {opportunities.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {opportunities.slice(0, 4).map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-2 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2"
            >
              <span className="text-sm mt-0.5">{alert.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-300">{alert.title}</p>
                <p className="text-xs text-emerald-400/70">{alert.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
