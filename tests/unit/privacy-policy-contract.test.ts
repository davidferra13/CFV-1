import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CORE_DATA_PROCESSORS,
  NO_DATA_SALE_BUILD_GUARDRAILS,
  OPTIONAL_PRIVACY_INTEGRATIONS,
  PRIVACY_COMMITMENTS,
} from '../../lib/compliance/privacy-policy'

const ROOT = join(__dirname, '..', '..')
const privacyPageSource = readFileSync(
  join(ROOT, 'app', '(public)', 'privacy', 'page.tsx'),
  'utf-8'
)
const nextConfigSource = readFileSync(join(ROOT, 'next.config.js'), 'utf-8')
const packageJsonSource = readFileSync(join(ROOT, 'package.json'), 'utf-8')
const posthogProviderSource = readFileSync(
  join(ROOT, 'components', 'analytics', 'posthog-provider.tsx'),
  'utf-8'
)
const sentryClientSource = readFileSync(join(ROOT, 'instrumentation-client.ts'), 'utf-8')

test('privacy baseline stays explicit about no sale and no ad-tech reuse', () => {
  assert.ok(
    PRIVACY_COMMITMENTS.some(
      (commitment) =>
        /sell/i.test(commitment.title) && /broker|advertiser|rent|license/i.test(commitment.detail)
    ),
    'privacy commitments must explicitly reject data sale and brokerage'
  )

  assert.ok(
    NO_DATA_SALE_BUILD_GUARDRAILS.some((rule) =>
      /ad networks|remarketing|data brokers/i.test(rule)
    ),
    'build guardrails must explicitly reject ad-tech and data broker flows'
  )
})

test('core processor inventory covers the runtime processors used by ChefFlow', () => {
  const coreIds = new Set(CORE_DATA_PROCESSORS.map((processor) => processor.id))

  assert.deepStrictEqual(Array.from(coreIds).sort(), [
    'cloudflare',
    'google-maps',
    'posthog',
    'resend',
    'sentry',
    'stripe',
  ])
})

test('optional integrations inventory covers connected-provider data flows', () => {
  const optionalIds = new Set(OPTIONAL_PRIVACY_INTEGRATIONS.map((processor) => processor.id))

  assert.ok(optionalIds.has('google'), 'optional integrations should disclose Google connections')
  assert.ok(optionalIds.has('twilio'), 'optional integrations should disclose Twilio flows')
})

test('public privacy page renders from the shared privacy contract', () => {
  assert.match(
    privacyPageSource,
    /from ['"]@\/lib\/compliance\/privacy-policy['"]/,
    'privacy page should import the shared privacy policy contract'
  )
  assert.match(privacyPageSource, /PRIVACY_COMMITMENTS/)
  assert.match(privacyPageSource, /CORE_DATA_PROCESSORS/)
  assert.match(privacyPageSource, /OPTIONAL_PRIVACY_INTEGRATIONS/)
})

test('runtime integrations have matching public processor disclosures', () => {
  if (packageJsonSource.includes('"stripe"') || nextConfigSource.includes('js.stripe.com')) {
    assert.ok(CORE_DATA_PROCESSORS.some((processor) => processor.id === 'stripe'))
  }

  if (packageJsonSource.includes('"resend"')) {
    assert.ok(CORE_DATA_PROCESSORS.some((processor) => processor.id === 'resend'))
  }

  if (nextConfigSource.includes('cloudflareinsights.com')) {
    assert.ok(CORE_DATA_PROCESSORS.some((processor) => processor.id === 'cloudflare'))
  }

  if (posthogProviderSource.includes('posthog.init')) {
    assert.ok(CORE_DATA_PROCESSORS.some((processor) => processor.id === 'posthog'))
  }

  if (sentryClientSource.includes('@sentry/nextjs')) {
    assert.ok(CORE_DATA_PROCESSORS.some((processor) => processor.id === 'sentry'))
  }

  if (
    packageJsonSource.includes('@react-google-maps/api') ||
    nextConfigSource.includes('maps.googleapis.com')
  ) {
    assert.ok(CORE_DATA_PROCESSORS.some((processor) => processor.id === 'google-maps'))
  }
})

test('analytics consent gating remains both documented and implemented', () => {
  const posthog = CORE_DATA_PROCESSORS.find((processor) => processor.id === 'posthog')

  assert.ok(posthog, 'PostHog disclosure missing')
  assert.strictEqual(posthog?.consentGate, 'cookie-consent')
  assert.match(posthogProviderSource, /consent !== 'accepted'/)
})

test('Sentry privacy hardening remains both documented and implemented', () => {
  const sentry = CORE_DATA_PROCESSORS.find((processor) => processor.id === 'sentry')

  assert.ok(sentry, 'Sentry disclosure missing')
  assert.match(sentryClientSource, /sendDefaultPii:\s*false/)
  assert.match(sentryClientSource, /maskAllText:\s*true/)
})
