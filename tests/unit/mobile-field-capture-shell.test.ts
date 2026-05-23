import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('mobile field capture shell covers Chef Life service-day capture patterns', () => {
  const source = readFileSync('app/(chef)/capture/mobile-field-capture-shell.tsx', 'utf8')

  for (const expected of [
    'Incident',
    'Vendor issue',
    'Loadout',
    'Household',
    'Waste',
    'Staff',
    'Craft note',
  ]) {
    assert.equal(source.includes(expected), true, `${expected} action is missing`)
  }

  assert.equal(source.includes('grid grid-cols-2 gap-2 sm:grid-cols-4'), true)
  assert.equal(source.includes('min-h-14'), true)
  assert.equal(source.includes('break-words'), true)
  assert.equal(source.includes('overflow-x-hidden'), true)
})

test('mobile field capture shell protects drafts, degraded mode, attachments, privacy, and owner route', () => {
  const source = readFileSync('app/(chef)/capture/mobile-field-capture-shell.tsx', 'utf8')

  assert.equal(source.includes('chef-flow-mobile-field-capture-draft-v1'), true)
  assert.equal(source.includes('window.localStorage.setItem'), true)
  assert.equal(source.includes('window.localStorage.removeItem'), true)
  assert.equal(source.includes('navigator.onLine'), true)
  assert.equal(source.includes("window.addEventListener('offline'"), true)
  assert.equal(source.includes('disabled={isPending || !online}'), true)
  assert.equal(source.includes('type="file"'), true)
  assert.equal(source.includes('capture="environment"'), true)
  assert.equal(source.includes('accept="image/*,application/pdf,audio/*"'), true)
  assert.equal(source.includes("privacy: 'private_only'"), true)
  assert.equal(source.includes("privacy: 'chef_internal'"), true)
  assert.equal(source.includes("searchParams.get('returnTo')"), true)
  assert.equal(source.includes('href={ownerHref}'), true)
})

test('field capture persistence remains auth-gated and tenant-scoped', () => {
  const actionsSource = readFileSync('lib/capture/actions.ts', 'utf8')
  const pageSource = readFileSync('app/(chef)/capture/page.tsx', 'utf8')

  assert.equal(actionsSource.includes("'use server'"), true)
  assert.equal(actionsSource.includes('const user = await requireChef()'), true)
  assert.equal(actionsSource.includes('tenant_id: user.tenantId!'), true)
  assert.equal(actionsSource.includes(".eq('tenant_id', user.tenantId!)"), true)
  assert.equal(pageSource.includes('await requireChef()'), true)
})
