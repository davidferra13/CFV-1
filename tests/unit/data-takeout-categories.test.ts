import test from 'node:test'
import assert from 'node:assert/strict'
import { TAKEOUT_CATEGORIES } from '../../lib/exports/takeout-categories'

test('data takeout includes user-visible operational activity records', () => {
  const activity = TAKEOUT_CATEGORIES.find((category) => category.id === 'activity')

  assert.ok(activity, 'activity takeout category missing')
  assert.deepStrictEqual(
    activity.tables.map((table) => table.name).sort(),
    ['activity_events', 'activity_events_archive', 'chef_breadcrumbs']
  )
  assert.ok(activity.formats.includes('json'))
  assert.ok(activity.formats.includes('csv'))
})
