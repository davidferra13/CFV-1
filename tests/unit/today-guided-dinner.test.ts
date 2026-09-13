import test from 'node:test'
import assert from 'node:assert/strict'

import { convertWorkItemsToQueueItems } from '@/lib/queue/providers/event'
import type { WorkItem, WorkStage } from '@/lib/workflow/types'

function workItem(
  stage: WorkStage,
  stageNumber: number,
  actionKey: string,
  overrides: Partial<WorkItem> = {}
): WorkItem {
  return {
    id: `event-1:${stage}:${actionKey}`,
    eventId: 'event-1',
    eventOccasion: 'Anniversary Dinner',
    eventDate: '2030-10-20',
    clientName: 'Maya Chen',
    stage,
    stageNumber,
    stageLabel: stage,
    category: 'preparable',
    urgency: 'normal',
    title: 'Continue dinner setup',
    description: 'This unlocks the next dinner step.',
    ...overrides,
  }
}

test('serve time is completable from Today without leaving the priority card', () => {
  const [item] = convertWorkItemsToQueueItems([
    workItem('qualification', 2, 'set_serve_time', {
      title: 'Set serve time',
    }),
  ])

  assert.equal(item.href, '/events/event-1/edit')
  assert.deepEqual(item.workflowStep, { label: 'Details' })
  assert.deepEqual(item.inlineAction, {
    type: 'set_serve_time',
    prefill: { eventId: 'event-1' },
  })
})

test('dinner work continues at the exact operational tool', () => {
  const routes: Array<[WorkStage, number, string, string, string]> = [
    ['grocery_list', 6, 'grocery_phase_a', 'grocery-run', 'Prepare'],
    ['prep_list', 7, 'draft_prep_plan', 'prep-plan', 'Prepare'],
    ['equipment_planning', 8, 'equipment_level_1', 'gear', 'Prepare'],
    ['packing', 9, 'build_packing_list', 'pack', 'Prepare'],
    ['packing', 9, 'pack_and_load', 'pack', 'Prepare'],
    ['timeline', 10, 'draft_timeline', 'schedule', 'Prepare'],
    ['travel_arrival', 11, 'model_travel', 'travel', 'Prepare'],
    ['execution', 12, 'start_event', 'service', 'Service'],
  ]

  for (const [stage, stageNumber, actionKey, route, label] of routes) {
    const [item] = convertWorkItemsToQueueItems([workItem(stage, stageNumber, actionKey)])
    assert.equal(item.href, `/events/event-1/${route}`, actionKey)
    assert.deepEqual(item.workflowStep, { label }, actionKey)
    assert.equal(item.inlineAction, undefined, actionKey)
  }
})
