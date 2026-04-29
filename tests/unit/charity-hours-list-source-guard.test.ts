import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('components/charity/charity-hours-list.tsx', 'utf8')

test('charity hours delete hides successfully deleted rows from local UI state', () => {
  assert.match(
    source,
    /const \[deletedEntryIds, setDeletedEntryIds\] = useState<Set<string>>\(\(\) => new Set\(\)\)/
  )
  assert.match(
    source,
    /const visibleEntries = useMemo\(\s*\(\) => entries\.filter\(\(entry\) => !deletedEntryIds\.has\(entry\.id\)\),\s*\[deletedEntryIds, entries\]\s*\)/
  )
  assert.match(
    source,
    /await deleteCharityHours\(entry\.id\)\s*setDeletedEntryIds\(\(currentIds\) => new Set\(currentIds\)\.add\(entry\.id\)\)/
  )
})

test('charity hours list renders and exports from the local visible entries', () => {
  assert.match(source, /const rows = visibleEntries\.map/)
  assert.match(source, /if \(visibleEntries\.length === 0\)/)
  assert.match(source, /Volunteer log \(\{visibleEntries\.length\}\)/)
  assert.match(source, /visibleEntries\.map\(\(entry\) =>/)
})

test('charity hours delete still preserves visible failure feedback', () => {
  assert.match(source, /catch \{\s*toast\.error\('Failed to delete entry\.'\)\s*\}/)
})
