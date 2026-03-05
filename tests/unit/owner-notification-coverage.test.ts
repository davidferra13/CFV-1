import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('owner notification coverage', () => {
  it('uses createNotification in time reminders with stable metadata kinds', () => {
    const source = read('lib/events/time-reminders.ts')
    assert.match(source, /createNotification\(/)
    assert.match(source, /kind:\s*'time_tracking_running'/)
    assert.match(source, /kind:\s*'time_tracking_completion'/)
  })

  it('uses createNotification in recall check cron with recall metadata kind', () => {
    const source = read('app/api/cron/recall-check/route.ts')
    assert.match(source, /createNotification\(/)
    assert.match(source, /kind:\s*'fda_recall_match'/)
  })

  it('uses createNotification for social publish failures with stable metadata kind', () => {
    const source = read('lib/social/publishing/notify.ts')
    assert.match(source, /createNotification\(/)
    assert.match(source, /kind:\s*'social_publish_failed'/)
  })

  it('writes founder in-app beta signup alerts', () => {
    const source = read('lib/beta/actions.ts')
    assert.match(source, /createNotification\(/)
    assert.match(source, /kind:\s*'beta_signup_received'/)
  })
})
