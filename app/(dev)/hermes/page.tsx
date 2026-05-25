import { fetchHermesDashboard } from './actions'

export const dynamic = 'force-dynamic'

export default async function HermesDevPage() {
  const { status, actions, queueDepth, recentFeedback } = await fetchHermesDashboard()

  return (
    <div className="max-w-4xl mx-auto p-6 font-mono text-sm">
      <h1 className="text-xl font-bold mb-4">Hermes Dev Monitor</h1>

      <section className="mb-6 p-4 border rounded">
        <h2 className="font-bold mb-2">Status</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            Mode:{' '}
            <span className={status.alive ? 'text-green-600' : 'text-orange-600'}>
              {status.mode}
            </span>
          </div>
          <div>Alive: {status.alive ? 'YES' : 'NO'}</div>
          <div>Last Heartbeat: {status.lastHeartbeat ?? 'never'}</div>
          <div>Queue Depth: {queueDepth}</div>
          <div>Current Skill: {status.currentSkill ?? 'idle'}</div>
          <div>Errors: {status.errorCount}</div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-bold mb-2">Recent Actions ({actions.length})</h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-1">Time</th>
              <th className="text-left p-1">Skill</th>
              <th className="text-left p-1">Source</th>
              <th className="text-left p-1">Action</th>
              <th className="text-left p-1">Items</th>
              <th className="text-left p-1">Result</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a: any) => (
              <tr key={a.id} className="border-b">
                <td className="p-1">{new Date(a.timestamp).toLocaleTimeString()}</td>
                <td className="p-1">{a.skill}</td>
                <td className="p-1">{a.source}</td>
                <td className="p-1 max-w-xs truncate">{a.action}</td>
                <td className="p-1">{a.items_affected}</td>
                <td className="p-1">{a.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-bold mb-2">Recent Feedback</h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-1">Time</th>
              <th className="text-left p-1">Ingredient</th>
              <th className="text-left p-1">Resolved</th>
              <th className="text-left p-1">Actual</th>
              <th className="text-left p-1">Source</th>
              <th className="text-left p-1">Region</th>
            </tr>
          </thead>
          <tbody>
            {(recentFeedback as any[]).map((f: any) => (
              <tr key={f.id} className="border-b">
                <td className="p-1">{new Date(f.timestamp).toLocaleTimeString()}</td>
                <td className="p-1">{f.ingredient_id}</td>
                <td className="p-1">
                  {f.resolved_price ? `$${(f.resolved_price / 100).toFixed(2)}` : '-'}
                </td>
                <td className="p-1">
                  {f.actual_price ? `$${(f.actual_price / 100).toFixed(2)}` : '-'}
                </td>
                <td className="p-1">{f.source}</td>
                <td className="p-1">{f.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
