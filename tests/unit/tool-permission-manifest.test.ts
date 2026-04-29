import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAiToolPermission,
  getAiToolPermissionManifest,
  isAiToolControlledBy,
} from '@/lib/ai/tool-permission-manifest'

test('manifest declares sensitive read/write domains for draft tasks', () => {
  const permission = getAiToolPermission('draft.menu_proposal')

  assert.deepEqual(permission.reads, ['clients', 'events', 'menus', 'recipes', 'pricing'])
  assert.deepEqual(permission.writes, ['documents'])
  assert.equal(permission.requiresPrivateModel, true)
  assert.equal(permission.requiresApproval, true)
  assert.equal(permission.controlledBy.includes('allow_document_drafts'), true)
})

test('manifest keeps recipe search read-only', () => {
  const permission = getAiToolPermission('recipe.search')

  assert.deepEqual(permission.reads, ['recipes'])
  assert.deepEqual(permission.writes, [])
  assert.equal(permission.requiresPrivateModel, true)
  assert.equal(permission.requiresApproval, false)
})

test('manifest infers permissions for registered agent actions', () => {
  const permission = getAiToolPermission('agent.update_menu')

  assert.deepEqual(permission.reads, ['menus', 'recipes'])
  assert.deepEqual(permission.writes, ['menus'])
  assert.equal(permission.requiresPrivateModel, true)
  assert.equal(permission.requiresApproval, true)
})

test('document draft control is available through manifest helper', () => {
  assert.equal(isAiToolControlledBy('email.generic', 'allow_document_drafts'), true)
  assert.equal(isAiToolControlledBy('email.search', 'allow_document_drafts'), false)
})

test('manifest export exposes exact entries for UI and audit summaries', () => {
  const taskTypes = getAiToolPermissionManifest().map((permission) => permission.taskType)

  assert.equal(taskTypes.includes('email.generic'), true)
  assert.equal(taskTypes.includes('draft.menu_proposal'), true)
  assert.equal(taskTypes.includes('recipe.search'), true)
})
