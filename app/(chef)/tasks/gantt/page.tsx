import { requireChef } from '@/lib/auth/get-user'
import { GanttView } from '@/components/tasks/gantt-view'
import Link from 'next/link'

export default async function GanttPage() {
  await requireChef()

  // Get today's date for default filter
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/tasks"
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
          >
            ← Tasks
          </Link>
          <h1 className="text-2xl font-bold text-stone-100 mt-2">Task Timeline</h1>
          <p className="text-sm text-stone-400 mt-1">
            Visual timeline showing task dependencies and critical path. Tasks with zero slack are
            on the critical path (shown in red).
          </p>
        </div>
      </div>

      {/* Today's tasks */}
      <section>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">Today</h2>
        <GanttView dateFilter={today} />
      </section>

      {/* All incomplete tasks */}
      <section>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">All Open Tasks</h2>
        <GanttView />
      </section>
    </div>
  )
}
