import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const sourcePath = path.join(process.cwd(), 'components/dashboard/return-to-work-strip.tsx')
const source = fs.readFileSync(sourcePath, 'utf8')

test('return-to-work strip opens the continuity digest last path', () => {
  assert.match(source, /const lastPath = digest\?\.lastPath \?\? null/)
  assert.match(source, /const lastHref = normalizeInternalHref\(lastPath\)/)
  assert.doesNotMatch(source, /recentSessions\[0\]/)
})
