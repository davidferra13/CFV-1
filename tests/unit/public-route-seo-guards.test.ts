import test from 'node:test'
import assert from 'node:assert/strict'
import {
  type PublicRouteSeoExpectation,
  type PublicRouteSeoSnapshot,
  validatePublicRouteSeoSnapshot,
} from '../helpers/public-route-seo'

function validate(
  snapshot: Partial<PublicRouteSeoSnapshot>,
  expectation: Partial<PublicRouteSeoExpectation> = {}
) {
  return validatePublicRouteSeoSnapshot(
    {
      bodyText: '',
      canonicalHref: 'https://cheflowhq.com/test-route',
      openGraphImages: ['https://cheflowhq.com/social/default.png'],
      robotsContent: 'index, follow',
      title: 'Test Route | ChefFlow',
      twitterImages: ['https://cheflowhq.com/social/default.png'],
      ...snapshot,
    },
    {
      label: 'Test Route',
      path: '/test-route',
      ...expectation,
    }
  )
}

test('flags missing canonical tags', () => {
  const issues = validate({ canonicalHref: null })

  assert.ok(issues.includes('Missing canonical tag'))
})

test('flags missing social image tags', () => {
  const issues = validate({ openGraphImages: [], twitterImages: [] })

  assert.ok(issues.includes('Missing og:image tag'))
  assert.ok(issues.includes('Missing twitter:image tag'))
})

test('flags duplicate ChefFlow title suffixes', () => {
  const issues = validate({ title: 'Partner Signup | ChefFlow | ChefFlow' })

  assert.ok(issues.some((issue) => issue.includes('Duplicate brand suffix')))
})

test('flags raw taxonomy labels leaking into visible UI', () => {
  const issues = validate({
    bodyText: 'Browse chefs by cuisine, including farm_to_table options in your city.',
  })

  assert.ok(issues.some((issue) => issue.includes('Raw taxonomy label leaked into visible UI')))
})

test('flags public routes that should be noindex but are indexable', () => {
  const issues = validate(
    { robotsContent: 'index, follow' },
    { expectedIndexable: false, label: 'Partner Signup', path: '/partner-signup' }
  )

  assert.ok(issues.includes('Route should render noindex'))
})
