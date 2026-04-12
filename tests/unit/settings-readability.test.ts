import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

test('settings hub cards keep contrast-forward text tokens', () => {
  const category = read('components/settings/settings-category.tsx')
  const overview = read('components/settings/settings-guided-overview.tsx')
  const directory = read('components/settings/settings-advanced-directory.tsx')
  const settingsPage = read('app/(chef)/settings/page.tsx')

  assert.match(category, /max-w-2xl text-sm leading-6 text-stone-300/)
  assert.match(category, /tracking-\[0\.16em\] text-stone-300/)
  assert.doesNotMatch(category, /tracking-\[0\.16em\] text-stone-500/)

  assert.match(overview, /text-sm leading-6 text-stone-300/)
  assert.doesNotMatch(overview, /text-sm leading-6 text-stone-500/)

  assert.match(directory, /max-w-2xl text-sm text-stone-400/)
  assert.match(directory, /tracking-\[0\.16em\] text-stone-300/)

  assert.match(settingsPage, /text-xs font-semibold uppercase tracking-wider text-stone-400/)
  assert.match(settingsPage, /text-xs text-stone-400 -mt-1 mb-3/)
  assert.doesNotMatch(settingsPage, /text-xs text-stone-600 -mt-1 mb-3/)
})
