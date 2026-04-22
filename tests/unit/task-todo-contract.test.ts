import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { findTodoMatch } from '../../lib/todos/match'

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

test('findTodoMatch returns exact and fuzzy reminder matches', () => {
  const todos = [
    { id: 'todo-1', text: 'Whole Foods shopping', completed: false },
    { id: 'todo-2', text: 'Send deposit invoice to the Smith dinner client', completed: false },
  ]

  assert.equal(findTodoMatch(todos, 'whole foods')?.id, 'todo-1')
  assert.equal(findTodoMatch(todos, 'smith invoice')?.id, 'todo-2')
})

test('findTodoMatch fails closed when no reminder matches', () => {
  const todos = [{ id: 'todo-1', text: 'Whole Foods shopping', completed: false }]

  assert.equal(findTodoMatch(todos, 'unrelated reminder search'), null)
  assert.equal(findTodoMatch([], 'anything'), null)
})

test('workflow reminder completion stays on the lightweight todo contract', () => {
  const source = readSource('lib/ai/agent-actions/workflow-actions.ts')

  assert.match(source, /findTodoMatch/)
  assert.match(source, /getTodos/)
  assert.match(source, /toggleTodo/)
  assert.match(source, /No open reminders match that description\./)
  assert.doesNotMatch(source, /select\('id, title, completed'\)/)
})

test('Remy task readers use the structured tasks contract', () => {
  const remyContext = readSource('lib/ai/remy-context.ts')
  const proactiveActions = readSource('lib/ai/agent-actions/proactive-actions.ts')
  const briefingActions = readSource('lib/ai/agent-actions/briefing-actions.ts')
  const remyIntelligence = readSource('lib/ai/remy-intelligence-actions.ts')
  const promptUtils = readSource('app/api/remy/stream/route-prompt-utils.ts')

  assert.match(remyContext, /\.from\('tasks'\)/)
  assert.match(remyContext, /\.select\('title, due_date, priority, status'\)/)
  assert.match(remyContext, /\.eq\('chef_id', tenantId\)/)
  assert.match(remyContext, /\.in\('status', \['pending', 'in_progress'\]\)/)
  assert.doesNotMatch(remyContext, /\.from\('chef_todos'\)/)

  assert.match(proactiveActions, /\.from\('tasks'\)/)
  assert.match(proactiveActions, /\.eq\('chef_id', ctx\.tenantId\)/)
  assert.doesNotMatch(proactiveActions, /\.from\('chef_todos'\)/)

  assert.match(briefingActions, /Overdue Tasks/)
  assert.match(briefingActions, /\.eq\('chef_id', ctx\.tenantId\)/)

  assert.match(remyIntelligence, /\.eq\('chef_id', tenantId\)/)
  assert.doesNotMatch(
    remyIntelligence,
    /\.eq\('tenant_id', tenantId\)\s*\.eq\('completed', false\)/
  )

  assert.match(promptUtils, /TASK LIST/)
})
