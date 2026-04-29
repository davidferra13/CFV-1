import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const actionsSource = readFileSync(
  resolve(process.cwd(), 'lib/admin/owner-moderation-actions.ts'),
  'utf-8'
)
const formSource = readFileSync(
  resolve(process.cwd(), 'components/admin/owner-moderation-form.tsx'),
  'utf-8'
)
const hubTranscriptSource = readFileSync(
  resolve(process.cwd(), 'app/(admin)/admin/hub/groups/[groupId]/page.tsx'),
  'utf-8'
)
const auditSource = readFileSync(resolve(process.cwd(), 'lib/admin/audit.ts'), 'utf-8')

test('hub transcript messages have a connected owner moderation path', () => {
  assert.match(actionsSource, /adminSoftDeleteHubMessage/)
  assert.match(actionsSource, /from\('hub_messages'\)/)
  assert.match(actionsSource, /admin_moderated_hub_message/)
  assert.match(formSource, /hub_message/)
  assert.match(hubTranscriptSource, /kind="hub_message"/)
})

test('sensitive hub transcript reads and hub message moderation are audit typed', () => {
  assert.match(auditSource, /admin_viewed_hub_transcript/)
  assert.match(auditSource, /admin_moderated_hub_message/)
  assert.match(hubTranscriptSource, /admin_viewed_hub_transcript/)
})
