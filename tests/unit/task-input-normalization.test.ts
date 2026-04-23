import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeCreateTaskInput,
  normalizeUpdateTaskInput,
} from '../../lib/tasks/input-normalization'

test('normalizeCreateTaskInput parses the task form payload', () => {
  const formData = new FormData()
  formData.set('title', '  Fire prep list  ')
  formData.set('description', '  Pull proteins  ')
  formData.set('assigned_to', '')
  formData.set('station_id', 'station-123')
  formData.set('due_date', '2030-01-15')
  formData.set('due_time', '')
  formData.set('priority', 'high')
  formData.set('notes', '  Check cooler temp  ')
  formData.set(
    'recurring_rule',
    JSON.stringify({ frequency: 'weekly', days_of_week: [1, '3'], end_date: '2030-02-01' })
  )

  assert.deepEqual(normalizeCreateTaskInput(formData), {
    title: 'Fire prep list',
    description: 'Pull proteins',
    assigned_to: null,
    station_id: 'station-123',
    due_date: '2030-01-15',
    due_time: null,
    priority: 'high',
    notes: 'Check cooler temp',
    recurring_rule: {
      frequency: 'weekly',
      days_of_week: [1, 3],
      end_date: '2030-02-01',
    },
  })
})

test('normalizeUpdateTaskInput keeps empty optional fields as explicit nulls', () => {
  const formData = new FormData()
  formData.set('title', '  Expo line reset ')
  formData.set('description', '')
  formData.set('assigned_to', '')
  formData.set('station_id', '')
  formData.set('due_date', '2030-01-16')
  formData.set('due_time', '')
  formData.set('priority', 'medium')
  formData.set('notes', '')
  formData.set('recurring_rule', '')

  assert.deepEqual(normalizeUpdateTaskInput(formData), {
    title: 'Expo line reset',
    description: null,
    assigned_to: null,
    station_id: null,
    due_date: '2030-01-16',
    due_time: null,
    priority: 'medium',
    status: undefined,
    notes: null,
    recurring_rule: null,
  })
})
