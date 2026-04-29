import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { captureActivityLoad, getFailedActivitySections } from '@/lib/activity/activity-load-state'

describe('activity load state', () => {
  it('returns loaded data without a failure marker', async () => {
    const result = await captureActivityLoad(
      'resumeItems',
      'Resume suggestions',
      async () => ['resume-1'],
      []
    )

    assert.deepEqual(result.data, ['resume-1'])
    assert.equal(result.failure, null)
  })

  it('returns fallback data and section metadata when a load fails', async () => {
    const originalConsoleError = console.error
    console.error = () => {}

    try {
      const result = await captureActivityLoad(
        'breadcrumbs',
        'Retrace history',
        async () => {
          throw new Error('database unavailable')
        },
        { sessions: [], nextCursor: null }
      )
      const failures = getFailedActivitySections([result])

      assert.deepEqual(result.data, { sessions: [], nextCursor: null })
      assert.deepEqual(failures, [{ section: 'breadcrumbs', label: 'Retrace history' }])
    } finally {
      console.error = originalConsoleError
    }
  })
})
