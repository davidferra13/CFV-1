import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(
  join(process.cwd(), 'components/hub/recurring-meals-manager.tsx'),
  'utf8'
)
const compactSource = source.replace(/\s+/g, ' ')

test('recurring meals manager shows initial load failures instead of setup prompt', () => {
  assert.match(source, /const \[isLoading, setIsLoading\] = useState\(true\)/)
  assert.match(source, /const \[loadError, setLoadError\] = useState<string \| null>\(null\)/)
  assert.match(source, /setRecurrings\(\[\]\)/)
  assert.match(source, /setLoadError\('Failed to load recurring meals'\)/)
  assert.match(source, /loadError && !isLoading/)

  assert.ok(
    compactSource.includes('!isLoading && !loadError && recurrings.length === 0 && !showForm'),
    'empty setup prompt must not render while the initial load is pending or failed'
  )
  assert.ok(
    compactSource.includes('!isLoading && !loadError && recurrings.length > 0'),
    'loaded recurring meals must not render while the initial load is pending or failed'
  )
})
