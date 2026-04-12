import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PUBLIC_DIRECTORY_HELPER,
  PUBLIC_OPERATOR_ENTRY,
  PUBLIC_PRIMARY_CONSUMER_CTA,
  PUBLIC_ROUTE_ROLE,
  PUBLIC_SECONDARY_CONSUMER_CTA,
  PUBLIC_SUPPORTING_DIRECTORY_ENTRY,
} from '../../lib/public/public-surface-config'
import { FOOTER_SECTIONS, PUBLIC_NAV, isGroup } from '../../components/navigation/public-nav-config'

describe('Public Surface Contract', () => {
  it('keeps one canonical buyer CTA hierarchy', () => {
    assert.deepEqual(PUBLIC_PRIMARY_CONSUMER_CTA, { href: '/book', label: 'Book a Chef' })
    assert.deepEqual(PUBLIC_SECONDARY_CONSUMER_CTA, { href: '/chefs', label: 'Browse Chefs' })
    assert.deepEqual(PUBLIC_SUPPORTING_DIRECTORY_ENTRY, {
      href: '/nearby',
      label: 'Food Directory',
    })
    assert.deepEqual(PUBLIC_OPERATOR_ENTRY, {
      href: '/for-operators',
      label: 'For Operators',
    })
    assert.match(PUBLIC_DIRECTORY_HELPER, /restaurants|caterers|food trucks/i)
  })

  it('classifies the public routes by role', () => {
    assert.equal(PUBLIC_ROUTE_ROLE['/book'], 'consumer_booking')
    assert.equal(PUBLIC_ROUTE_ROLE['/chefs'], 'consumer_browse')
    assert.equal(PUBLIC_ROUTE_ROLE['/nearby'], 'consumer_directory')
    assert.equal(PUBLIC_ROUTE_ROLE['/for-operators'], 'operator_software')
  })

  it('keeps global navigation consumer-first while leaving operator entry visible', () => {
    const hireAChefEntry = PUBLIC_NAV[0]
    assert.ok(isGroup(hireAChefEntry))
    assert.equal(hireAChefEntry.label, 'Hire a Chef')
    assert.deepEqual(
      hireAChefEntry.items.map((item) => item.href),
      ['/book', '/chefs', '/services', '/how-it-works', '/nearby']
    )

    const operatorEntry = PUBLIC_NAV[1]
    assert.ok(!isGroup(operatorEntry))
    if (isGroup(operatorEntry)) {
      throw new Error('Expected For Operators to remain a single nav item')
    }
    assert.equal(operatorEntry.href, '/for-operators')
  })

  it('keeps footer hierarchy aligned to the same public story', () => {
    assert.equal(FOOTER_SECTIONS.discover.heading, 'Hire a Chef')
    assert.deepEqual(
      FOOTER_SECTIONS.discover.links.map((link) => link.label),
      ['Book a Chef', 'Browse Chefs', 'Services', 'How It Works', 'Food Directory']
    )
    assert.equal(FOOTER_SECTIONS.forOperators.links[0]?.href, '/for-operators')
  })
})
