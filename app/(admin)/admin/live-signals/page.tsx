import { requireAdmin } from '@/lib/auth/admin'
import { LiveSignalSimulator } from '@/components/activity/live-signal-simulator'

export default async function AdminLiveSignalsPage() {
  await requireAdmin()

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-100">Live Signal Simulator</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
          Verify live activity, privacy suppression, alert copy, follow-up language, and confidence
          labels without creating activity events or sending notifications.
        </p>
      </div>

      <LiveSignalSimulator />
    </main>
  )
}
