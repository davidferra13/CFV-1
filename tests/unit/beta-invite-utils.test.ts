import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { buildBetaInviteUrl, resolveBetaInviteBaseUrl } from '@/lib/beta/invite-utils'

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
