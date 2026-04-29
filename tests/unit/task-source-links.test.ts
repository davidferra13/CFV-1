import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const actionsSource = readFileSync('lib/tasks/actions.ts', 'utf8')
const boardSource = readFileSync('components/tasks/task-board.tsx', 'utf8')

test('task records expose event source context to task cards', () => {
  assert.match(actionsSource, /event_id: string \| null/)
  assert.match(boardSource, /task\.event_id/)
  assert.match(boardSource, /`\/events\/\$\{task\.event_id\}`/)
  assert.match(boardSource, /Open event/)
})

test('task cards expose station source context when present', () => {
  assert.match(boardSource, /task\.station_id/)
  assert.match(boardSource, /`\/stations\/\$\{task\.station_id\}`/)
  assert.match(boardSource, /Open station/)
})
