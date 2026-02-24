'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RemovalRequestForm } from './removal-request-form'
import { RemovalTaskTracker } from './removal-task-tracker'

type Request = {
  id: string
  client_id: string | null
  reason: string | null
  status: string
  tasks: any
  request_date: string
  completed_at: string | null
  clients?: { display_name: string } | null
}

export function RemovalRequestList({ requests }: { requests: Request[] }) {
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const open = requests.filter((r) => r.status !== 'completed')
  const completed = requests.filter((r) => r.status === 'completed')

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-stone-500">
          {open.length === 0
            ? 'No open removal requests.'
            : `${open.length} open request${open.length !== 1 ? 's' : ''}`}
        </p>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          New Request
        </Button>
      </div>

      {showForm && <RemovalRequestForm clients={[]} onClose={() => setShowForm(false)} />}

      {open.map((req) => (
        <div key={req.id}>
          <Card
            className="cursor-pointer hover:shadow-sm transition-shadow"
            onClick={() => setExpanded(expanded === req.id ? null : req.id)}
          >
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {(req.clients as any)?.display_name || 'General Request'}
                  </p>
                  <p className="text-xs text-stone-500">
                    {new Date(req.request_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={req.status === 'in_progress' ? 'warning' : 'default'}>
                  {req.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
          {expanded === req.id && (
            <div className="mt-2">
              <RemovalTaskTracker
                request={{
                  ...req,
                  tasks: Array.isArray(req.tasks) ? req.tasks : [],
                  client_name: (req.clients as any)?.display_name,
                }}
              />
            </div>
          )}
        </div>
      ))}

      {completed.length > 0 && (
        <details className="mt-6">
          <summary className="text-sm text-stone-400 cursor-pointer">
            {completed.length} completed request{completed.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-2">
            {completed.map((req) => (
              <Card key={req.id} className="opacity-60">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-stone-400">
                      {(req.clients as any)?.display_name || 'General Request'}
                    </p>
                    <Badge variant="success">completed</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
