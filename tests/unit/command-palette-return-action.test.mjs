import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('components/search/command-palette.tsx', 'utf8')

test('command palette exposes return-to-work Remy catch-up action', () => {
  assert.match(source, /import \{ openRemy \} from '@\/lib\/ai\/remy-launch'/)
  assert.match(source, /id: 'action:return-catch-up'/)
  assert.match(source, /label: 'Ask Remy to catch me up'/)
  assert.match(source, /sublabel: 'Start the return-to-work briefing'/)
  assert.match(source, /prompt: 'Catch me up since I was away'/)
  assert.match(source, /source: 'command-palette-return-to-work'/)
  assert.match(source, /send: true/)
})

test('command palette quick actions search labels and sublabels once', () => {
  assert.equal(source.match(/id: 'action:return-catch-up'/g)?.length, 1)
  assert.match(
    source,
    /const matchedActions = QUICK_ACTIONS\.filter\(\s*\(item\) => fuzzyMatch\(item\.label, query\) \|\| fuzzyMatch\(item\.sublabel \|\| '', query\)\s*\)/
  )
  assert.match(source, /fuzzyScore\(a\.sublabel \|\| '', query\)/)
  assert.match(source, /fuzzyScore\(b\.sublabel \|\| '', query\)/)
})
