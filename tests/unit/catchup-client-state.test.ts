import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveCatchupCreateState } from '@/app/(chef)/inquiries/catchup/catchup-client'

describe('resolveCatchupCreateState', () => {
  it('keeps zero-create failures out of the done state', () => {
    const state = resolveCatchupCreateState({
      created: 0,
      createdInquiries: [],
      errors: ['Avery Stone: Missing client name'],
    })

    assert.equal(state.shouldShowDone, false)
    assert.deepEqual(state.errors, ['Avery Stone: Missing client name'])
  })

  it('allows partial success to show done with remaining errors', () => {
    const state = resolveCatchupCreateState({
      created: 1,
      createdInquiries: [
        {
          id: 'inq_123',
          clientName: 'Avery Stone',
          occasion: 'Birthday dinner',
          href: '/inquiries/inq_123',
        },
      ],
      errors: ['Morgan Lee: Failed to create inquiry'],
    })

    assert.equal(state.shouldShowDone, true)
    assert.deepEqual(state.errors, ['Morgan Lee: Failed to create inquiry'])
  })

  it('uses a retryable error when nothing was created and no error was returned', () => {
    const state = resolveCatchupCreateState({
      created: 0,
      createdInquiries: [],
      errors: [],
    })

    assert.equal(state.shouldShowDone, false)
    assert.deepEqual(state.errors, ['No inquiries were created. Review the entries and try again.'])
  })
})
