import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const ROOT = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

test('communication automation create_todo action creates a durable chef todo', () => {
  const source = readProjectFile('lib/communication/automation-actions.ts')

  assert.match(source, /import \{ createTodo \} from '@\/lib\/todos\/actions'/)
  assert.doesNotMatch(source, /Would create a chef todo/)
  assert.match(source, /case 'create_todo': \{[\s\S]*const result = await createTodo\(\{/)
  assert.match(source, /text,\s*\n\s*due_date: dueDate,\s*\n\s*due_time: dueTime,/)
  assert.match(source, /category,\s*\n\s*reminder_at: reminderAt,/)
  assert.match(source, /event_id: eventId,\s*\n\s*client_id: clientId,/)
  assert.match(source, /Communication event: \$\{context\.communication_event_id\}/)
  assert.match(source, /console\.warn\('\[executeRule\] create_todo action failed:', result\.error\)/)
})
