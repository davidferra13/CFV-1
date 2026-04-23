import test from 'node:test'
import assert from 'node:assert/strict'
import { getPlatformObservabilityCoverageFindings } from '@/lib/platform-observability/coverage'

test('primary observability emitters are wired to the platform event stream', () => {
  const findings = getPlatformObservabilityCoverageFindings()

  assert.deepEqual(
    findings,
    [],
    findings
      .map((finding) => `${finding.file} is missing /${finding.pattern}/`)
      .join('\n')
  )
})
