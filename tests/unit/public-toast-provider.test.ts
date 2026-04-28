import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('public layout mounts the toast provider for public sonner actions', () => {
  const layout = read('app/(public)/layout.tsx')
  const publicToastUsers = [
    'app/(public)/nearby/_components/nomination-form.tsx',
    'app/(public)/nearby/_components/directory-favorite-button.tsx',
    'app/(public)/nearby/submit/_components/submit-listing-form.tsx',
    'app/(public)/nearby/[slug]/enhance/_components/enhance-profile-form.tsx',
    'app/(public)/nearby/[slug]/_components/claim-remove-actions.tsx',
    'app/(public)/nearby/unsubscribe/_components/unsubscribe-form.tsx',
  ]

  assert.match(layout, /import \{ ToastProvider \} from '@\/components\/notifications\/toast-provider'/)
  assert.match(layout, /<ToastProvider \/>/)

  for (const path of publicToastUsers) {
    assert.match(read(path), /import \{ toast \} from 'sonner'/, `${path} uses sonner toast`)
  }
})

test('ticketed public event copy actions use toast-backed clipboard feedback', () => {
  const source = read('app/(public)/e/[shareToken]/public-event-view.tsx')

  assert.match(source, /import \{ toast \} from 'sonner'/)
  assert.match(source, /function copyToClipboard/)
  assert.match(source, /toast\.success\(successMessage\)/)
  assert.match(source, /toast\.error\('Clipboard is unavailable in this browser\.'\)/)
  assert.doesNotMatch(source, /alert\(/)
})
