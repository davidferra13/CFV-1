import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeEventDetailTab } from '../../components/events/event-detail-tabs'

const ROOT = join(__dirname, '..', '..')

describe('event detail tab params', () => {
  it('falls back to overview for missing, stale, or malformed tabs', () => {
    assert.equal(normalizeEventDetailTab(undefined), 'overview')
    assert.equal(normalizeEventDetailTab('bad'), 'overview')
    assert.equal(normalizeEventDetailTab(['money']), 'overview')
  })

  it('keeps known event detail tabs linkable', () => {
    assert.equal(normalizeEventDetailTab('overview'), 'overview')
    assert.equal(normalizeEventDetailTab('money'), 'money')
    assert.equal(normalizeEventDetailTab('wrap'), 'wrap')
  })

  it('uses the shared normalizer on both server and mobile surfaces', () => {
    const page = readFileSync(join(ROOT, 'app/(chef)/events/[id]/page.tsx'), 'utf8')
    const mobileNav = readFileSync(
      join(ROOT, 'components/events/event-detail-mobile-nav.tsx'),
      'utf8'
    )

    assert.match(page, /normalizeEventDetailTab\(searchParams\?\.tab\)/)
    assert.match(mobileNav, /normalizeEventDetailTab\(searchParams\?\.get\('tab'\)\)/)
  })
})
