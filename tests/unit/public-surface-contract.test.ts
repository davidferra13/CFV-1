import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  PUBLIC_DIRECTORY_HELPER,
  PUBLIC_OPERATOR_ENTRY,
  PUBLIC_PRIMARY_CONSUMER_CTA,
  PUBLIC_ROUTE_ROLE,
  PUBLIC_SECONDARY_CONSUMER_CTA,
  PUBLIC_SUPPORTING_DIRECTORY_ENTRY,
} from '../../lib/public/public-surface-config'
import { PUBLIC_SECONDARY_ENTRY_CONFIG } from '../../lib/public/public-secondary-entry-config'
import { FOOTER_SECTIONS, PUBLIC_NAV, isGroup } from '../../components/navigation/public-nav-config'
import { SERVICE_INTENT_PAGES } from '../../app/(public)/services/_intent-pages'

describe('Public Surface Contract', () => {
  it('keeps one canonical buyer CTA hierarchy', () => {
    assert.deepEqual(PUBLIC_PRIMARY_CONSUMER_CTA, { href: '/book', label: 'Book Now' })
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
    assert.equal(PUBLIC_ROUTE_ROLE['/for-operators/walkthrough'], 'operator_software')
  })

  it('keeps global navigation consumer-first while leaving operator entry visible', () => {
    const hireAChefEntry = PUBLIC_NAV[0]
    assert.ok(isGroup(hireAChefEntry))
    assert.equal(hireAChefEntry.label, 'Hire a Chef')
    assert.equal(hireAChefEntry.items.length, 7)
    assert.deepEqual(
      hireAChefEntry.items.map((item) => item.href),
      ['/book', '/chefs', '/services', '/gift-cards', '/how-it-works', '/trust', '/nearby']
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
      [
        'Book Now',
        'Browse Chefs',
        'Services',
        'Gift Cards',
        'How It Works',
        'Trust Center',
        'FAQ',
        'Food Directory',
        'Dinner Circles',
      ]
    )
    assert.equal(FOOTER_SECTIONS.forOperators.links[0]?.href, '/for-operators')
  })

  it('keeps operator alternate links on operator-specific routes', () => {
    assert.deepEqual(
      PUBLIC_SECONDARY_ENTRY_CONFIG.for_operators.map((link) => link.href),
      ['/for-operators/walkthrough', '/compare', '/marketplace-chefs']
    )
  })

  it('maps high-intent service searches to real service landing routes', () => {
    assert.deepEqual(
      SERVICE_INTENT_PAGES.map((page) => page.slug),
      [
        'private-chef',
        'dinner-party-chef',
        'catering',
        'meal-prep',
        'cooking-classes',
        'wedding-chef',
        'corporate-dining',
      ]
    )

    for (const page of SERVICE_INTENT_PAGES) {
      assert.match(page.h1, /chef|catering|cooking/i)
      assert.ok(page.metaDescription.length > 80)
      assert.ok(page.queryExamples.length >= 3)
    }
  })

  it('includes service-intent routes in the sitemap contract', () => {
    const sitemapSource = readFileSync(path.join(process.cwd(), 'app/sitemap.ts'), 'utf8')

    for (const page of SERVICE_INTENT_PAGES) {
      assert.match(sitemapSource, new RegExp(`'${page.slug}'`))
    }
  })
})
