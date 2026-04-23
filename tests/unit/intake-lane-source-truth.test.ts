import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('public intake writers stamp canonical submission_source values through the shared lane config', () => {
  const expectations: Array<[string, RegExp]> = [
    ['app/api/book/route.ts', /withSubmissionSource\(\s*PUBLIC_INTAKE_LANE_KEYS\.open_booking,/],
    [
      'lib/inquiries/public-actions.ts',
      /withSubmissionSource\(\s*PUBLIC_INTAKE_LANE_KEYS\.public_profile_inquiry,/,
    ],
    [
      'app/api/embed/inquiry/route.ts',
      /withSubmissionSource\(\s*PUBLIC_INTAKE_LANE_KEYS\.embed_inquiry,/,
    ],
    [
      'app/api/kiosk/inquiry/route.ts',
      /withSubmissionSource\(\s*PUBLIC_INTAKE_LANE_KEYS\.kiosk_inquiry,/,
    ],
    [
      'lib/booking/instant-book-actions.ts',
      /withSubmissionSource\(\s*PUBLIC_INTAKE_LANE_KEYS\.instant_book,/,
    ],
    ['lib/wix/process.ts', /withSubmissionSource\(\s*PUBLIC_INTAKE_LANE_KEYS\.wix_form,/],
  ]

  for (const [file, pattern] of expectations) {
    assert.match(read(file), pattern, `${file} should stamp the canonical submission source`)
  }
})

test('admin intake readers classify website traffic through shared provenance, not raw channel heuristics', () => {
  const activityFeed = read('lib/admin/activity-feed.ts')
  const inquiryAdmin = read('lib/admin/inquiry-admin-actions.ts')

  assert.match(activityFeed, /deriveProvenance\(/)
  assert.match(inquiryAdmin, /deriveProvenance\(/)
  assert.doesNotMatch(activityFeed, /row\.channel === 'website'/)
  assert.doesNotMatch(inquiryAdmin, /row\.channel === 'website'/)
  assert.doesNotMatch(activityFeed, /\.eq\('channel', 'website'\)/)
})
