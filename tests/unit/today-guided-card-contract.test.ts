import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

test('Today primary card completes serve time inline with an honest result', () => {
  const source = read('components/dashboard/today-primary-action.tsx')

  assert.match(source, /type="time"/)
  assert.match(source, /Save serve time/)
  assert.match(source, /await setTodayServeTime\(/)
  assert.match(source, /if \(!result\.ok\)/)
  assert.match(source, /role="alert"/)
  assert.match(source, /toast\.success\(result\.message\)/)
})

test('Today keeps one primary action and sends other work straight to Continue', () => {
  const source = read('components/dashboard/today-primary-action.tsx')
  const page = read('app/(chef)/dashboard/page.tsx')

  assert.match(source, />\s*Continue\s*</)
  assert.doesNotMatch(source, />\s*Start\s*</)
  assert.doesNotMatch(page, /function PrimaryAction/)
  assert.match(page, /<TodayPrimaryAction item=\{primary\} \/>/)
})

test('the full Queue honors the same serve-time inline action', () => {
  const panel = read('components/queue/queue-item-inline-action.tsx')
  const row = read('components/queue/queue-item-row.tsx')

  assert.match(panel, /case 'set_serve_time'/)
  assert.match(panel, /const result = await setTodayServeTime\(/)
  assert.match(panel, /action\.type === 'set_serve_time'/)
  assert.match(row, /set_serve_time: 'Set Serve Time'/)
})
