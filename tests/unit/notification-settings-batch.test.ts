import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const ROOT = process.cwd()

function readProjectFile(path: string) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

function extractFunctionBody(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`)
  assert.notEqual(start, -1, `${name} should be exported`)

  const bodyStart = source.indexOf('\n  const user = await requireChef()', start)
  assert.notEqual(bodyStart, -1, `${name} should have a body`)

  const bodyEnd = source.indexOf('\nfunction parseCategoryPreferenceBatch', bodyStart)
  assert.notEqual(bodyEnd, -1, `${name} should end before the parser helper`)

  return source.slice(bodyStart + 1, bodyEnd)
}

test('notification settings batch action authenticates, validates, scopes, and revalidates', () => {
  const source = readProjectFile('lib/notifications/settings-actions.ts')
  const body = extractFunctionBody(source, 'upsertCategoryPreferencesBatch')

  const requireChefIndex = body.indexOf('const user = await requireChef()')
  const parseIndex = body.indexOf('parseCategoryPreferenceBatch(preferences)')
  const dbIndex = body.indexOf('createServerClient()')

  assert.equal(requireChefIndex >= 0, true, 'batch action must start with requireChef')
  assert.equal(parseIndex > requireChefIndex, true, 'batch action must validate input after auth')
  assert.equal(dbIndex > parseIndex, true, 'batch action must validate before creating the DB client')
  assert.match(body, /tenant_id:\s*user\.tenantId/, 'batch rows must be tenant-scoped')
  assert.match(body, /auth_user_id:\s*user\.id/, 'batch rows must be auth-user-scoped')
  assert.match(body, /upsert\(rows,\s*\{\s*onConflict:\s*'auth_user_id,category'\s*\}\)/)
  assert.match(body, /revalidatePath\('\/settings\/notifications'\)/)
})

test('notification settings server actions do not export types from the use server file', () => {
  const source = readProjectFile('lib/notifications/settings-actions.ts')
  const typeSource = readProjectFile('lib/notifications/settings-types.ts')

  assert.doesNotMatch(source, /export\s+type\s+/)
  assert.doesNotMatch(source, /export\s+\{\s*type\s+/)
  assert.match(typeSource, /export type CategoryPreference/)
  assert.match(typeSource, /export type SmsSettings/)
  assert.match(typeSource, /export type NotificationExperienceSettings/)
})

test('notification settings reads are tenant-scoped and do not hide query failures as defaults', () => {
  const source = readProjectFile('lib/notifications/settings-actions.ts')

  assert.match(source, /getNotificationPreferences[\s\S]*\.eq\('tenant_id', user\.tenantId\)/)
  assert.match(source, /getSmsSettings[\s\S]*if \(error\) \{[\s\S]*throw new Error/)
  assert.match(source, /getNotificationExperienceSettings[\s\S]*if \(error\) \{[\s\S]*throw new Error/)
})

test('sms opt-in requires an E.164 phone number server-side', () => {
  const source = readProjectFile('lib/notifications/settings-actions.ts')

  assert.match(source, /const E164_PHONE_PATTERN = \/\^\\\+\[1-9\]\\d\{1,14\}\$\//)
  assert.match(source, /smsOptIn && \(!smsNotifyPhone \|\| !isValidE164Phone\(smsNotifyPhone\)\)/)
  assert.match(source, /Enter a valid E\.164 phone number before enabling SMS alerts/)
})

test('notification settings form saves category channel changes through the batch action', () => {
  const source = readProjectFile('components/settings/notification-settings-form.tsx')

  assert.match(source, /upsertCategoryPreferencesBatch/)
  assert.doesNotMatch(source, /upsertCategoryPreference,/)
  assert.match(source, /Save channel changes/)
  assert.match(source, /setChannels\(rollbackChannels\)/)
  assert.match(source, /setDirtyCategories\(\{\}\)/)
})

test('notification settings form enables SMS category toggles from saved SMS state only', () => {
  const source = readProjectFile('components/settings/notification-settings-form.tsx')

  assert.match(source, /const \[savedSmsPhone, setSavedSmsPhone\]/)
  assert.match(source, /const \[savedSmsOptIn, setSavedSmsOptIn\]/)
  assert.match(source, /const hasSavedSmsSettings = savedSmsOptIn && Boolean\(savedSmsPhone\.trim\(\)\)/)
  assert.match(source, /setSavedSmsOptIn\(smsOptIn\)/)
  assert.match(source, /setSavedSmsPhone\(smsPhone\.trim\(\)\)/)
  assert.match(source, /disabled=\{isSavingChannelChanges \|\| !hasSavedSmsSettings\}/)
})
