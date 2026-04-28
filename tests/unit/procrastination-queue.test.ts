import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveDashboardNextTask } from '../../lib/interface/action-layer'
import { buildTaskQueueItem } from '../../lib/queue/providers/task'
import type { PriorityQueue } from '../../lib/queue/types'

test('overdue operational tasks become critical queue items', () => {
  const now = new Date('2030-01-15T12:00:00')
  const item = buildTaskQueueItem(
    {
      id: 'task-1',
      title: 'Confirm rentals',
      description: null,
      due_date: '2030-01-14',
      due_time: '09:00',
      priority: 'high',
      status: 'pending',
      created_at: '2030-01-10T09:00:00',
      updated_at: '2030-01-10T09:00:00',
      staff_member: null,
    },
    now
  )

  assert.equal(item.domain, 'task')
  assert.equal(item.urgency, 'critical')
  assert.equal(item.blocks, "Today's plan")
  assert.equal(item.href, '/tasks?date=2030-01-14')
  assert.match(item.title, /^Start: Confirm rentals/)
})

test('dashboard interrupt collapses the queue to one critical action', () => {
  const now = new Date('2030-01-15T12:00:00')
  const criticalTask = buildTaskQueueItem(
    {
      id: 'task-2',
      title: 'Send the run sheet',
      description: null,
      due_date: '2030-01-15',
      due_time: '08:00',
      priority: 'urgent',
      status: 'in_progress',
      created_at: '2030-01-12T08:00:00',
      updated_at: '2030-01-14T08:00:00',
      staff_member: { name: 'Maya', role: 'Sous chef' },
    },
    now
  )

  const queue: PriorityQueue = {
    items: [criticalTask],
    nextAction: criticalTask,
    summary: {
      totalItems: 1,
      byDomain: {
        inquiry: 0,
        message: 0,
        quote: 0,
        event: 0,
        task: 1,
        financial: 0,
        post_event: 0,
        client: 0,
        culinary: 0,
        network: 0,
      },
      byUrgency: { critical: 1, high: 0, normal: 0, low: 0 },
      allCaughtUp: false,
    },
    computedAt: now.toISOString(),
  }

  const task = resolveDashboardNextTask({
    priorityQueue: queue,
    onboardingProgress: null,
    profileGated: false,
  })

  assert.equal(task.badge, 'Focus lock')
  assert.equal(task.ctaLabel, 'Do This Now')
  assert.equal(task.remainingCount, 0)
  assert.match(task.title, /^Do this now: Finish: Send the run sheet/)
  assert.match(task.description, /^This blocks lower-priority work\./)
})
