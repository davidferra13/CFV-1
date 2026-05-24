import { runDiagnosis, getSystemVitals } from '@/lib/admin/diagnosis-actions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'System Diagnosis',
}

function statusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600'
    case 'degraded':
      return 'text-yellow-600'
    case 'failing':
      return 'text-red-600'
    default:
      return 'text-gray-500'
  }
}

function statusDot(status: string): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500'
    case 'degraded':
      return 'bg-yellow-500'
    case 'failing':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

export default async function DiagnosisPage() {
  const [diagnosis, vitals] = await Promise.all([runDiagnosis(), getSystemVitals()])

  const healthColor =
    diagnosis.overallHealth >= 80
      ? 'text-green-600'
      : diagnosis.overallHealth >= 50
        ? 'text-yellow-600'
        : 'text-red-600'

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">System Diagnosis</h1>
        <p className="mt-1 text-sm text-muted-foreground">{diagnosis.summary}</p>
      </div>

      {/* Overall Health */}
      <div className="rounded-lg border bg-card p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">Overall Health</p>
        <p className={`mt-2 text-5xl font-bold ${healthColor}`}>{diagnosis.overallHealth}%</p>
      </div>

      {/* Checks Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Checks</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Message</th>
              <th className="px-4 py-2 text-right font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {diagnosis.checks.map((check, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-4 py-2">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${statusDot(check.status)}`}
                  />
                </td>
                <td className="px-4 py-2 capitalize text-muted-foreground">{check.category}</td>
                <td className={`px-4 py-2 font-medium ${statusColor(check.status)}`}>
                  {check.name}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{check.message}</td>
                <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                  {check.latencyMs !== undefined ? `${check.latencyMs}ms` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Vitals */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">System Vitals</h2>
        </div>
        <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Node Version</dt>
            <dd className="mt-1 text-sm font-mono">{vitals.nodeVersion}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Uptime</dt>
            <dd className="mt-1 text-sm font-mono">
              {Math.floor(vitals.uptime / 3600)}h {Math.floor((vitals.uptime % 3600) / 60)}m
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Environment</dt>
            <dd className="mt-1 text-sm font-mono">{vitals.env}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Platform</dt>
            <dd className="mt-1 text-sm font-mono">{vitals.platform}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Memory (RSS)</dt>
            <dd className="mt-1 text-sm font-mono">{vitals.memoryUsageMb} MB</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
