import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { detectSoftCloseIntent } from '../../lib/inquiries/soft-close.js'

describe('detectSoftCloseIntent', () => {
  it('detects a soft close with future interest', () => {
    const result = detectSoftCloseIntent(`
      Unfortunately, we'll have to skip this experience for this trip as our plans have changed slightly.
      However, I would really love to include this special dining experience on a future visit.
    `)

    assert.ok(result)
    assert.equal(result?.futureInterest, true)
    assert.ok(result?.matchedSignals.includes('plans changed'))
    assert.ok(result?.matchedSignals.includes('future visit'))
  })

  it('detects a soft close without future interest', () => {
    const result = detectSoftCloseIntent(`
      Thank you for the information. We are going to pass for now and will not be moving forward.
    `)

    assert.ok(result)
    assert.equal(result?.futureInterest, false)
  })

  it('does not classify an active planning reply as a soft close', () => {
    const result = detectSoftCloseIntent(`
      This sounds perfect. Our plans changed slightly, but we are still interested.
      Can we move dinner from Friday to Saturday instead?
    `)

    assert.equal(result, null)
  })
})
