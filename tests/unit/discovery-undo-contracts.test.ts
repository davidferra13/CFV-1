import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createDiscoveryUndoStack,
  pushDiscoveryUndo,
  redoDiscoveryAction,
  restoreDiscoveryBranch,
  undoDiscoveryAction,
} from '@/lib/discovery/undo-stack'

type State = {
  selectedIds: string[]
  filters: Record<string, string>
}

test('undo stack restores hide, clear, and filter changes without mutating history', () => {
  const initial: State = { selectedIds: ['chef-1'], filters: { craving: 'Italian' } }
  let stack = createDiscoveryUndoStack(initial)
  stack = pushDiscoveryUndo(stack, {
    id: 'filter-1',
    category: 'filter_change',
    label: 'Change craving',
    after: { selectedIds: ['chef-1'], filters: { craving: 'Thai' } },
  })
  stack = pushDiscoveryUndo(stack, {
    id: 'clear-1',
    category: 'clear',
    label: 'Clear filters',
    after: { selectedIds: [], filters: {} },
  })

  const undone = undoDiscoveryAction(stack)
  assert.deepEqual(undone.stack.current.filters, { craving: 'Thai' })
  assert.equal(undone.restored?.id, 'clear-1')

  const redone = redoDiscoveryAction(undone.stack)
  assert.deepEqual(redone.stack.current, { selectedIds: [], filters: {} })
})

test('branch restore returns to the state before a chosen action', () => {
  const initial: State = { selectedIds: [], filters: {} }
  let stack = createDiscoveryUndoStack(initial)
  stack = pushDiscoveryUndo(stack, {
    id: 'select-1',
    category: 'filter_change',
    label: 'Select Italian',
    after: { selectedIds: ['italian'], filters: { craving: 'Italian' } },
  })
  stack = pushDiscoveryUndo(stack, {
    id: 'select-2',
    category: 'filter_change',
    label: 'Select Sushi',
    after: { selectedIds: ['italian', 'sushi'], filters: { craving: 'Sushi' } },
  })

  const restored = restoreDiscoveryBranch(stack, 'select-1')

  assert.deepEqual(restored.stack.current, initial)
  assert.equal(restored.restored?.id, 'select-1')
  assert.equal(restored.stack.past.at(-1)?.category, 'branch_restore')
  assert.equal(restored.stack.future[0].id, 'select-1')
})
