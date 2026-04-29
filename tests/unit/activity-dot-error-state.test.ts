import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const source = readFileSync('components/activity/activity-dot.tsx', 'utf8')

describe('ActivityDot load failure state', () => {
  it('renders fetch failures as an error instead of an empty activity state', () => {
    assert.match(source, /const \[loadError, setLoadError\] = useState\(false\)/)
    assert.match(source, /if \(!res\.ok\) throw new Error\('Activity feed request failed'\)/)
    assert.match(source, /setLoadError\(true\)/)
    assert.match(source, /Activity could not load\./)
    assert.match(source, /loaded && !loadError && items\.length === 0/)
  })

  it('keeps the full activity timeline available from the failure state', () => {
    assert.match(source, /href="\/activity"/)
    assert.match(source, /Open full timeline/)
  })
})
