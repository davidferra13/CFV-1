import test from 'node:test'
import assert from 'node:assert/strict'

import { createDiscoveryUndoStack, pushDiscoveryUndo } from '@/lib/discovery/undo-stack'
import { parseRemyUndoCommand, proposeUndoOrBranchRestore } from '@/lib/remy/undo-branch-contracts'

type RailState = {
  filters: Record<string, string>
  selectedIds: string[]
  durableSaveIds: string[]
}

test('Remy undo command steps back without touching durable saves', () => {
  const initial: RailState = {
    filters: {},
    selectedIds: [],
    durableSaveIds: ['saved-1'],
  }
  let stack = createDiscoveryUndoStack(initial)
  stack = pushDiscoveryUndo(stack, {
    id: 'korean',
    category: 'filter_change',
    label: 'Korean craving',
    after: { ...initial, filters: { cuisine: 'Korean' } },
  })
  stack = pushDiscoveryUndo(stack, {
    id: 'thai',
    category: 'filter_change',
    label: 'Thai craving',
    after: { ...initial, filters: { cuisine: 'Thai' } },
  })

  const command = parseRemyUndoCommand('go back two steps')
  assert.deepEqual(command, { type: 'undo', steps: 2 })

  const proposal = proposeUndoOrBranchRestore(stack, command!)
  assert.deepEqual(proposal.result.stack.current.filters, {})
  assert.deepEqual(proposal.result.stack.current.durableSaveIds, ['saved-1'])
  assert.equal(proposal.durableStatePreserved, true)
})

test('Remy restore creates a branch from a matching earlier snapshot', () => {
  const initial: RailState = { filters: {}, selectedIds: [], durableSaveIds: [] }
  let stack = createDiscoveryUndoStack(initial)
  stack = pushDiscoveryUndo(stack, {
    id: 'before-korean',
    category: 'filter_change',
    label: 'Before I said Korean',
    after: { ...initial, filters: { cuisine: 'Korean' } },
  })
  stack = pushDiscoveryUndo(stack, {
    id: 'after-budget',
    category: 'filter_change',
    label: 'Budget under 150',
    after: { ...initial, filters: { cuisine: 'Korean', budget: '150' } },
  })

  const command = parseRemyUndoCommand('restore the list from before I said Korean')
  const proposal = proposeUndoOrBranchRestore(stack, command!)

  assert.equal(proposal.branchCreated, true)
  assert.equal(proposal.result.restored?.id, 'before-korean')
  assert.equal(proposal.result.stack.past.at(-1)?.category, 'branch_restore')
})
