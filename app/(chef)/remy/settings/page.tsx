import { Settings } from '@/components/ui/icons'
import { RemySettingsPage } from '@/components/ai/remy-settings-page'
import { RemyRoutineControlPanel } from '@/components/remy/remy-routine-control-panel'
import { requireChef } from '@/lib/auth/get-user'
import { getAiPreferences, getAiDataSummary } from '@/lib/ai/privacy-actions'
import {
  listRemyRoutineExecutionAudit,
  listRemyRoutineMatchAudit,
  listRemyRoutines,
} from '@/lib/ai/remy-routines-actions'

export const metadata = {
  title: 'Remy Settings',
  description: 'Configure your AI concierge',
}

export default async function RemySettingsRoute() {
  await requireChef()

  const [preferences, dataSummary, routines, matchAudit, executionAudit] = await Promise.all([
    getAiPreferences(),
    getAiDataSummary(),
    listRemyRoutines({ limit: 100 }).catch(() => []),
    listRemyRoutineMatchAudit({ limit: 40 }).catch(() => []),
    listRemyRoutineExecutionAudit({ limit: 40 }).catch(() => []),
  ])

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-900">
          <Settings className="h-5 w-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Remy Settings</h1>
          <p className="text-sm text-stone-400">
            Configure how Remy communicates, what it monitors, and when it reaches out.
          </p>
        </div>
      </div>

      <RemySettingsPage preferences={preferences} dataSummary={dataSummary} />
      <RemyRoutineControlPanel
        routines={routines}
        matchAudit={matchAudit}
        executionAudit={executionAudit}
      />
    </div>
  )
}
