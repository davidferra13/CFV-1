'use client'

import { useTransition } from 'react'
import { toggleRemovalTask, completeRemovalRequest } from '@/lib/protection/removal-request-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Task = { id: string; label: string; completed: boolean; completed_at?: string }

type RemovalRequest = {
  id: string
  reason: string | null
  status: string
  tasks: Task[]
  client_name?: string
  request_date: string
}

export function RemovalTaskTracker({ request }: { request: RemovalRequest }) {
  const [isPending, startTransition] = useTransition()
  const allComplete = request.tasks.every((t) => t.completed)

  function handleToggle(taskId: string, completed: boolean) {
    startTransition(async () => {
      try {
        await toggleRemovalTask(request.id, taskId)
      } catch (err) {
        toast.error('Failed to toggle removal task')
      }
    })
  }

  function handleComplete() {
    startTransition(async () => {
      try {
        await completeRemovalRequest(request.id)
      } catch (err) {
        toast.error('Failed to complete removal request')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Removal Tasks {request.client_name && `- ${request.client_name}`}
          </CardTitle>
          <Badge
            variant={
              request.status === 'completed'
                ? 'success'
                : request.status === 'in_progress'
                  ? 'warning'
                  : 'default'
            }
          >
            {request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {request.reason && <p className="text-sm text-stone-400 mb-3">{request.reason}</p>}

        <div className="space-y-2">
          {request.tasks.map((task) => (
            <label key={task.id} className="flex items-center gap-3 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={task.completed}
                disabled={isPending || request.status === 'completed'}
                onChange={(e) => handleToggle(task.id, e.target.checked)}
                className="w-4 h-4 rounded border-stone-600"
              />
              <span
                className={`text-sm ${task.completed ? 'text-stone-400 line-through' : 'text-stone-300'}`}
              >
                {task.label}
              </span>
            </label>
          ))}
        </div>

        {allComplete && request.status !== 'completed' && (
          <div className="mt-4 pt-3 border-t border-stone-700">
            <Button onClick={handleComplete} disabled={isPending}>
              {isPending ? 'Completing...' : 'Mark Request Complete'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
