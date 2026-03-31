// VA Tasks
// Tasks flagged for or assigned to a virtual assistant.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'VA Tasks' }

export default async function VATasksPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const { data: tasks } = await db
    .from('tasks')
    .select('id, title, description, status, due_date, created_at')
    .eq('tenant_id', chef.tenantId!)
    .eq('assignee_type', 'va')
    .order('due_date', { ascending: true })

  const taskList = tasks ?? []
  const open = taskList.filter((t: any) => t.status !== 'completed')
  const done = taskList.filter((t: any) => t.status === 'completed')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">VA Tasks</h1>
          <p className="mt-1 text-sm text-stone-500">
            Tasks assigned to your virtual assistant. These are delegated, administrative, or
            repeatable tasks your VA handles on your behalf.
          </p>
        </div>
        <Link href="/tasks">
          <Button variant="secondary" size="sm">
            All Tasks
          </Button>
        </Link>
      </div>

      {taskList.length === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No VA tasks yet</h3>
          <p className="text-sm text-stone-500 mb-4 max-w-sm mx-auto">
            Create tasks in the main task board and assign them to your VA. They will appear here.
          </p>
          <Link href="/tasks">
            <Button variant="primary">Go to Tasks</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {open.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Open ({open.length})
              </h2>
              <div className="space-y-2">
                {open.map((task: any) => (
                  <div
                    key={task.id}
                    className="bg-stone-800 rounded-xl p-4 border border-stone-700"
                  >
                    <p className="font-medium text-stone-100">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-stone-500 mt-1 line-clamp-2">{task.description}</p>
                    )}
                    {task.due_date && (
                      <p className="text-xs text-stone-400 mt-2">
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Completed ({done.length})
              </h2>
              <div className="space-y-2">
                {done.map((task: any) => (
                  <div
                    key={task.id}
                    className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50 opacity-60"
                  >
                    <p className="font-medium text-stone-300 line-through">{task.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
