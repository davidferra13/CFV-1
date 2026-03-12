import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  buildBetaDashboardUrl,
  buildBetaInviteUrl,
  buildBetaOnboardingUrl,
  buildBetaSignInUrl,
  resolveBetaInviteBaseUrl,
} from '@/lib/beta/invite-utils'

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
})

test('buildBetaInviteUrl uses configured public app url and normalizes email', () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://beta.cheflowhq.com/'

  assert.equal(
    buildBetaInviteUrl(' Chef@Example.com '),
    'https://beta.cheflowhq.com/auth/signup?ref=beta&email=chef%40example.com'
  )
})

test('resolveBetaInviteBaseUrl falls back to provided origin when env is missing', () => {
  delete process.env.NEXT_PUBLIC_SITE_URL
  delete process.env.NEXT_PUBLIC_APP_URL

  assert.equal(resolveBetaInviteBaseUrl('http://localhost:3100/'), 'http://localhost:3100')
})

test('beta auth and app urls reuse the same resolved base url', () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://beta.cheflowhq.com/'

  assert.equal(
    buildBetaSignInUrl('/onboarding/checklist'),
    'https://beta.cheflowhq.com/auth/signin?redirect=%2Fonboarding%2Fchecklist'
  )
  assert.equal(buildBetaOnboardingUrl(), 'https://beta.cheflowhq.com/onboarding')
  assert.equal(buildBetaDashboardUrl(), 'https://beta.cheflowhq.com/dashboard')
})
