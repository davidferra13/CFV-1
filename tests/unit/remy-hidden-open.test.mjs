import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const wrapperSource = fs.readFileSync(
  path.join(process.cwd(), 'components/ai/remy-wrapper.tsx'),
  'utf8'
)

test('explicit open-remy events can open Remy while launcher mode is hidden', () => {
  assert.match(wrapperSource, /const explicitOpenRemyRef = useRef\(false\)/)
  assert.match(wrapperSource, /window\.addEventListener\('open-remy', handleExplicitOpenRemy\)/)
  assert.match(wrapperSource, /explicitOpenRemyRef\.current = true/)
  assert.match(wrapperSource, /mode === 'hidden' && !explicitOpenRemyRef\.current/)
})

test('explicit open-remy restores a desktop-visible mode before the drawer guard closes it', () => {
  assert.match(wrapperSource, /if \(!isMobile && mode === 'hidden'\) \{/)
  assert.match(wrapperSource, /setMode\('docked'\)/)
})
