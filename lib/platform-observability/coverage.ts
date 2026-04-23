import fs from 'node:fs'
import path from 'node:path'

export type PlatformObservabilityEmitterExpectation = {
  file: string
  pattern: RegExp
}

export type PlatformObservabilityCoverageFinding = {
  file: string
  pattern: string
}

export const PLATFORM_OBSERVABILITY_EMITTER_EXPECTATIONS: PlatformObservabilityEmitterExpectation[] =
  [
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
    { file: 'lib/reports/daily-report-delivery.ts', pattern: /feature\.daily_report_delivered/ },
    {
      file: 'app/api/cron/platform-observability-digest/route.ts',
      pattern: /sendPlatformObservabilityDigest/,
    },
    { file: 'lib/cron/heartbeat.ts', pattern: /system\.cron_job_failed/ },
  ]

export function getPlatformObservabilityCoverageFindings(rootDir = process.cwd()) {
  const findings: PlatformObservabilityCoverageFinding[] = []

  for (const expectation of PLATFORM_OBSERVABILITY_EMITTER_EXPECTATIONS) {
    const source = fs.readFileSync(path.join(rootDir, expectation.file), 'utf8')
    if (!expectation.pattern.test(source)) {
      findings.push({
        file: expectation.file,
        pattern: expectation.pattern.source,
      })
    }
  }

  return findings
}
