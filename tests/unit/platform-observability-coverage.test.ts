import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

test('primary observability emitters are wired to the platform event stream', () => {
  const expectations: Array<{ file: string; pattern: RegExp }> = [
    { file: 'lib/auth/actions.ts', pattern: /recordPlatformEvent\(/ },
    {
      file: 'lib/marketing/newsletter-actions.ts',
      pattern: /subscription\.stay_updated_subscribed/,
    },
    { file: 'lib/beta/actions.ts', pattern: /subscription\.beta_waitlist_joined/ },
    { file: 'lib/contact/actions.ts', pattern: /input\.contact_form_submitted/ },
    { file: 'lib/inquiries/public-actions.ts', pattern: /conversion\.public_inquiry_submitted/ },
    { file: 'app/api/activity/track/route.ts', pattern: /ACTIVITY_EVENT_TO_PLATFORM_EVENT/ },
    { file: 'app/api/monitoring/report-error/route.ts', pattern: /system\.client_error_reported/ },
    {
      file: 'app/api/cron/platform-observability-digest/route.ts',
      pattern: /sendPlatformObservabilityDigest/,
    },
    { file: 'lib/cron/heartbeat.ts', pattern: /system\.cron_job_failed/ },
  ]

  for (const expectation of expectations) {
    const source = read(expectation.file)
    assert.match(
      source,
      expectation.pattern,
      `${expectation.file} is missing ${expectation.pattern}`
    )
  }
})
