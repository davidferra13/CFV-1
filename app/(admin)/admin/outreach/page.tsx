import { requireAdmin } from '@/lib/auth/admin'
import { getOutreachDashboardStats } from '@/lib/discover/outreach-campaign'

export default async function OutreachDashboardPage() {
  await requireAdmin()
  const stats = await getOutreachDashboardStats()

  const funnelStages = [
    { key: 'not_contacted_with_email', label: 'Pool (with email)', color: 'bg-zinc-600' },
    { key: 'contacted', label: 'Contacted', color: 'bg-blue-600' },
    { key: 'opened', label: 'Opened', color: 'bg-sky-500' },
    { key: 'replied', label: 'Replied', color: 'bg-amber-500' },
    { key: 'claimed_via_outreach', label: 'Claimed', color: 'bg-emerald-500' },
    { key: 'opted_out', label: 'Opted Out', color: 'bg-red-500' },
    { key: 'bounced', label: 'Bounced', color: 'bg-red-700' },
  ]

  const totalContacted = stats.funnel.contacted ?? 0
  const bounceRate = totalContacted > 0 ? ((stats.funnel.bounced ?? 0) / totalContacted) * 100 : 0

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Directory Outreach</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Invitation campaign funnel for discovered food operators.
        </p>
      </div>

      {/* Bounce rate warning */}
      {bounceRate > 5 && (
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-4 text-red-300 text-sm">
          Bounce rate is {bounceRate.toFixed(1)}% (above 5% threshold). Consider pausing outreach
          and cleaning the list.
        </div>
      )}

      {/* Funnel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {funnelStages.map((stage) => (
          <div
            key={stage.key}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-center"
          >
            <div className={`inline-block w-2 h-2 rounded-full ${stage.color} mb-2`} />
            <div className="text-2xl font-bold text-white">
              {(stats.funnel[stage.key] ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-zinc-400">{stage.label}</div>
            {stage.key !== 'not_contacted_with_email' && totalContacted > 0 && (
              <div className="text-xs text-zinc-500 mt-1">
                {(((stats.funnel[stage.key] ?? 0) / totalContacted) * 100).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Batch History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Batch History</h2>
        {stats.batches.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No batches yet. Run:{' '}
            <code className="text-zinc-400">node scripts/run-outreach-batch.mjs --dry-run</code>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-800">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-right py-2 px-3">Target</th>
                  <th className="text-right py-2 px-3">Sent</th>
                  <th className="text-right py-2 px-3">Bounced</th>
                  <th className="text-right py-2 px-3">Opened</th>
                  <th className="text-right py-2 px-3">Claimed</th>
                  <th className="text-left py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.batches.map((b: any) => (
                  <tr key={b.id} className="border-b border-zinc-800/50">
                    <td className="py-2 px-3 text-zinc-300">
                      {new Date(b.batch_date || b.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right py-2 px-3 text-zinc-400">{b.target_count}</td>
                    <td className="text-right py-2 px-3 text-white">{b.sent_count}</td>
                    <td className="text-right py-2 px-3 text-red-400">{b.bounced_count}</td>
                    <td className="text-right py-2 px-3 text-sky-400">{b.opened_count}</td>
                    <td className="text-right py-2 px-3 text-emerald-400">{b.claimed_count}</td>
                    <td className="py-2 px-3">
                      {b.completed_at ? (
                        <span className="text-emerald-400 text-xs">Complete</span>
                      ) : (
                        <span className="text-amber-400 text-xs">In Progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Opt-Outs */}
      {stats.recentOptOuts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Recent Opt-Outs</h2>
          <div className="space-y-1">
            {stats.recentOptOuts.map((email, i) => (
              <div key={i} className="text-sm text-zinc-400">
                {email}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <h3 className="text-sm font-semibold text-zinc-300 mb-2">Running a Batch</h3>
        <div className="space-y-1 text-xs text-zinc-500 font-mono">
          <p># Preview (no emails sent)</p>
          <p className="text-zinc-300">node scripts/run-outreach-batch.mjs --dry-run</p>
          <p className="mt-2"># Send 10 emails to high-quality leads</p>
          <p className="text-zinc-300">
            node scripts/run-outreach-batch.mjs --batch-size 10 --min-score 70
          </p>
          <p className="mt-2"># Default batch (25 emails)</p>
          <p className="text-zinc-300">node scripts/run-outreach-batch.mjs</p>
        </div>
      </div>
    </div>
  )
}
