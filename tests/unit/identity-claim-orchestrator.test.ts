import assert from 'node:assert/strict'
import test from 'node:test'
import { HANDLE_FALLBACK_CHAIN, PLATFORM_JOBS } from '../../scripts/identity/platforms'
import { formatHumanAction, renderReport, type ClaimRecord } from '../../scripts/identity/state'

test('identity fallback chain matches the strict global order', () => {
  assert.deepEqual(HANDLE_FALLBACK_CHAIN, [
    'ChefFlow',
    'ChefFlowHQ',
    'ChefFlowApp',
    'ChefFlowOfficial',
    'ChefFlowCo',
    'GetChefFlow',
    'UseChefFlow',
    'JoinChefFlow',
    'ChefFlowAI',
    'ChefFlowSystem',
  ])
})

test('identity registry includes every required platform exactly once', () => {
  const expected = [
    'Instagram',
    'TikTok',
    'YouTube',
    'X (Twitter)',
    'Discord (server + account)',
    'WhatsApp Business',
    'Google (Account + Brand + YouTube base)',
    'Cloudflare',
    'Stripe',
    'Twilio',
    'GitHub Organization',
    'Threads',
    'Bluesky',
    'Mastodon',
    'Facebook Page',
    'LinkedIn',
    'Reddit',
    'Pinterest',
    'Snapchat',
    'Twitch',
    'Telegram',
    'Signal',
    'Product Hunt',
    'Indie Hackers',
    'Hacker News (presence only)',
    'Crunchbase',
    'AngelList / Wellfound',
    'Medium',
    'Substack',
    'Beehiiv',
    'Slack',
    'Notion',
    'Linear',
    'Sentry',
    'PostHog',
    'Plausible',
    'UptimeRobot',
    'Better Stack',
    'PayPal Business',
    'Square',
    'SendGrid',
    'Mailchimp',
    'ConvertKit',
    'Zapier',
    'Make',
    'IFTTT',
    'Typeform',
    'Tally',
    'Calendly',
    'Cal.com',
    'Zoom',
    'Loom',
    'Canva',
    'Figma',
    'Framer',
    'Webflow',
    'Wix',
    'Shopify',
    'Etsy',
    'Gumroad',
    'Lemon Squeezy',
    'Patreon',
    'Ko-fi',
    'Yelp Business',
    'Tripadvisor',
    'Trustpilot',
    'G2',
    'Capterra',
    'Glassdoor',
    'Indeed Employer',
    'ZipRecruiter',
    'Handshake',
    'AWS',
    'GCP',
    'Azure',
    'DigitalOcean',
    'Hetzner',
    'Fly.io',
    'Render',
    'Railway',
    'Docker Hub',
    'npm',
    'Hugging Face',
    'OpenAI Platform',
    'Anthropic Console',
    'Google AI Studio',
    'ChefFlow main system account',
    'ChefFlow admin account',
    'ChefFlow support account',
    'ChefFlow bot/service account',
    'ChefFlow monitoring account',
    'ChefFlow billing account',
    'ChefFlow test chef account',
    'ChefFlow test client account',
    'ChefFlow demo/public account',
  ]

  assert.deepEqual(
    PLATFORM_JOBS.map((job) => job.name),
    expected
  )
  assert.equal(new Set(PLATFORM_JOBS.map((job) => job.id)).size, PLATFORM_JOBS.length)
  assert.equal(PLATFORM_JOBS.filter((job) => job.classification === 'CLAIM_NOW').length, 11)
  assert.equal(
    PLATFORM_JOBS.filter((job) => job.classification === 'CHEFFLOW_INTERNAL_REQUIRED').length,
    9
  )
})

test('human intervention output is exact and single step oriented', () => {
  const output = formatHumanAction({
    platform: 'TikTok',
    selectedUsername: 'ChefFlowHQ',
    currentStatus: 'Awaiting human verification',
    exactRequiredAction: 'Complete CAPTCHA and SMS verification',
    directUrl: 'https://www.tiktok.com/signup',
    resumeInstruction:
      'Then run: npx tsx scripts/identity/claim-orchestrator.ts resume --platform tiktok',
  })

  assert.match(output, /Platform: TikTok/)
  assert.match(output, /Username: ChefFlowHQ/)
  assert.match(output, /Action: Complete CAPTCHA and SMS verification/)
  assert.match(output, /URL: https:\/\/www.tiktok.com\/signup/)
  assert.match(output, /Then run:/)
})

test('report contains required output table columns', () => {
  const record: ClaimRecord = {
    platformName: 'Instagram',
    platformId: 'instagram',
    classification: 'CLAIM_NOW',
    finalHandle: 'ChefFlow',
    status: 'partial',
    verificationStatus: 'pending',
    credentialsStored: true,
    notes: 'Paused at verification.',
    directUrl: 'https://www.instagram.com/accounts/emailsignup/',
    updatedAt: new Date().toISOString(),
  }

  const report = renderReport([record])
  assert.match(report, /Platform name/)
  assert.match(report, /Classification/)
  assert.match(report, /Final handle/)
  assert.match(report, /Verification status/)
  assert.match(report, /Credentials stored/)
})
