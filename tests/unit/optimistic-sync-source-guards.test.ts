import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('gear check inspects packing confirmation results and rolls back failed saves', () => {
  const source = readFileSync('components/events/gear-check-client.tsx', 'utf8')

  assert.doesNotMatch(source, /togglePackingConfirmation\([^)]*\)\.catch\(\(\) => \{\}\)/)
  assert.match(source, /if \(!result\.success \|\| result\.confirmed !== newValue\)/)
  assert.match(source, /setError\(result\.error \?\? 'Failed to save gear confirmation'\)/)
  assert.match(source, /setPendingItemKeys/)
})

test('event detail prep tab inspects prep completion results and restores localStorage on failure', () => {
  const source = readFileSync(
    'app/(chef)/events/[id]/_components/event-detail-prep-tab.tsx',
    'utf8'
  )

  assert.doesNotMatch(
    source,
    /togglePrepCompletion\(eventId, key, completed\)\.catch\(\(\) => \{\}\)/
  )
  assert.match(source, /if \(!result\.success\) throw new Error/)
  assert.match(source, /setCheckedItems\(previous\)/)
  assert.match(source, /toast\.error/)
})
