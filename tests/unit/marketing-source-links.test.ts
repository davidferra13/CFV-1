import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import {
  buildMarketingSourceHref,
  readMarketingSourceFromSearchParams,
} from '@/lib/marketing/source-links'
import { buildOperatorWalkthroughHref } from '@/lib/marketing/walkthrough-links'

test('buildMarketingSourceHref returns a plain pathname when no source context exists', () => {
  assert.equal(buildMarketingSourceHref({ pathname: '/for-operators' }), '/for-operators')
})

test('buildMarketingSourceHref stamps source_page and source_cta when provided', () => {
  const href = buildMarketingSourceHref({
    pathname: '/compare',
    sourcePage: 'home',
    sourceCta: 'operator_compare',
  })

  assert.deepEqual(href, {
    pathname: '/compare',
    query: {
      source_page: 'home',
      source_cta: 'operator_compare',
    },
  })
})

test('signup and walkthrough builders reuse the shared marketing source contract', () => {
  assert.deepEqual(
    buildMarketingSignupHref({ sourcePage: 'for_operators', sourceCta: 'hero_operator_signup' }),
    {
      pathname: '/auth/signup',
      query: {
        source_page: 'for_operators',
        source_cta: 'hero_operator_signup',
      },
    }
  )

  assert.deepEqual(
    buildOperatorWalkthroughHref({
      sourcePage: 'for_operators',
      sourceCta: 'hero_walkthrough',
    }),
    {
      pathname: '/for-operators/walkthrough',
      query: {
        source_page: 'for_operators',
        source_cta: 'hero_walkthrough',
      },
    }
  )
})

test('readMarketingSourceFromSearchParams reads canonical source params from objects and URLSearchParams', () => {
  assert.deepEqual(
    readMarketingSourceFromSearchParams({
      source_page: 'homepage',
      source_cta: ['operator_band', 'ignored'],
    }),
    {
      sourcePage: 'homepage',
      sourceCta: 'operator_band',
    }
  )

  assert.deepEqual(
    readMarketingSourceFromSearchParams(
      new URLSearchParams({
        source_page: 'compare_hub',
        source_cta: 'hero_walkthrough',
      })
    ),
    {
      sourcePage: 'compare_hub',
      sourceCta: 'hero_walkthrough',
    }
  )
})
