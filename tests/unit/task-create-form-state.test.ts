import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildTaskCreateDraftFromFormData,
  buildTaskCreateHref,
  parseTaskCreateRecurringRule,
  readTaskCreateDraftFromSearchParams,
  readTaskCreateErrorFromSearchParams,
} from '../../lib/tasks/create-form-state'

test('buildTaskCreateDraftFromFormData preserves the submitted create draft', () => {
  const formData = new FormData()
  formData.set('title', '  Banquet reset  ')
  formData.set('description', '  Pull linens  ')
  formData.set('assigned_to', 'not-a-uuid')
  formData.set('station_id', '')
  formData.set('due_date', '2030-01-15')
  formData.set('due_time', '')
  formData.set('priority', 'urgent')
  formData.set('notes', '  Leave by door  ')
  formData.set(
    'recurring_rule',
    JSON.stringify({ frequency: 'weekly', days_of_week: [2, 4], end_date: '2030-02-01' })
  )

  assert.deepEqual(buildTaskCreateDraftFromFormData(formData, '2030-01-01'), {
    title: 'Banquet reset',
    description: 'Pull linens',
    assigned_to: 'not-a-uuid',
    station_id: '',
    due_date: '2030-01-15',
    due_time: '',
    priority: 'urgent',
    notes: 'Leave by door',
    recurring_rule: '{"frequency":"weekly","days_of_week":[2,4],"end_date":"2030-02-01"}',
  })
})

test('task create draft and error round-trip through the /tasks query string', () => {
  const href = buildTaskCreateHref({
    date: '2030-01-16',
    error: 'Invalid uuid',
    draft: {
      title: 'Sauce prep',
      description: 'Keep chilled',
      assigned_to: 'not-a-uuid',
      station_id: '',
      due_date: '',
      due_time: '09:30',
      priority: 'high',
      notes: 'Ask expo',
      recurring_rule: '{"frequency":"daily"}',
    },
  })

  const params = new URL(href, 'http://localhost').searchParams

  assert.deepEqual(readTaskCreateDraftFromSearchParams(params, '2030-01-16'), {
    title: 'Sauce prep',
    description: 'Keep chilled',
    assigned_to: 'not-a-uuid',
    station_id: '',
    due_date: '',
    due_time: '09:30',
    priority: 'high',
    notes: 'Ask expo',
    recurring_rule: '{"frequency":"daily"}',
  })
  assert.equal(readTaskCreateErrorFromSearchParams(params), 'Invalid uuid')
})

test('parseTaskCreateRecurringRule fails closed on invalid JSON', () => {
  assert.equal(parseTaskCreateRecurringRule(''), null)
  assert.equal(parseTaskCreateRecurringRule('{'), null)
  assert.deepEqual(parseTaskCreateRecurringRule('{"frequency":"monthly","day_of_month":3}'), {
    frequency: 'monthly',
    day_of_month: 3,
  })
})
