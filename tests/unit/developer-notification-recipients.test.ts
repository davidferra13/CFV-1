import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_DEVELOPER_NOTIFICATION_EMAIL,
  FOUNDER_EMAIL,
  getDeveloperNotificationRecipients,
} from '@/lib/platform/owner-account'

test('developer notification recipients default to developer-only addresses', () => {
  const recipients = getDeveloperNotificationRecipients()
  assert.ok(recipients.includes(DEFAULT_DEVELOPER_NOTIFICATION_EMAIL))
  assert.ok(recipients.includes(FOUNDER_EMAIL))
  assert.ok(!recipients.includes('info@cheflowhq.com'))
})
