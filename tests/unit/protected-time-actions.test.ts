import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const sourcePath = path.join(process.cwd(), 'lib/scheduling/protected-time-actions.ts')
const source = readFileSync(sourcePath, 'utf8')

function functionSource(name: string) {
  const start = source.indexOf(`export async function ${name}`)
  assert.ok(start >= 0, `${name} export not found`)
  const next = source.indexOf('\nexport async function ', start + 1)
  return source.slice(start, next === -1 ? undefined : next)
}

test('protected time detail fetch authenticates before validating and querying', () => {
  const body = functionSource('getProtectedTimeBlock')
  const authIndex = body.indexOf('const user = await requireChef()')
  const validationIndex = body.indexOf('ProtectedTimeIdSchema.safeParse(blockId)')
  const dbIndex = body.indexOf('const db: any = createServerClient()')

  assert.ok(authIndex >= 0)
  assert.ok(validationIndex > authIndex)
  assert.ok(dbIndex > validationIndex)
})

test('protected time detail fetch is chef-scoped and excludes auto event blocks', () => {
  const body = functionSource('getProtectedTimeBlock')

  assert.match(body, /const chefId = user\.entityId/)
  assert.match(body, /\.eq\('id', parsedBlockId\.data\)/)
  assert.match(body, /\.eq\('chef_id', chefId\)/)
  assert.match(body, /\.eq\('is_event_auto', false\)/)
})

test('protected time removal validates id before database mutation and returns feedback', () => {
  const body = functionSource('deleteProtectedTime')
  const authIndex = body.indexOf('const user = await requireChef()')
  const validationIndex = body.indexOf('ProtectedTimeIdSchema.safeParse(blockId)')
  const dbIndex = body.indexOf('const db: any = createServerClient()')

  assert.ok(authIndex >= 0)
  assert.ok(validationIndex > authIndex)
  assert.ok(dbIndex > validationIndex)
  assert.match(body, /Promise<\{ success: boolean; error\?: string \}>/)
  assert.match(body, /return \{ success: false, error: 'Invalid protected time block id\.' \}/)
  assert.match(
    body,
    /return \{ success: false, error: 'Failed to remove protected time block\.' \}/
  )
  assert.match(body, /return \{ success: false, error: 'Protected time block not found\.' \}/)
  assert.match(body, /return \{ success: true \}/)
})

test('protected time removal is chef-scoped and revalidates calendar', () => {
  const body = functionSource('deleteProtectedTime')

  assert.match(body, /const chefId = user\.entityId/)
  assert.match(body, /\.eq\('id', parsedBlockId\.data\)/)
  assert.match(body, /\.eq\('chef_id', chefId\)/)
  assert.match(body, /\.eq\('is_event_auto', false\)/)
  assert.match(body, /\.select\('id'\)/)
  assert.match(body, /revalidatePath\('\/calendar'\)/)
})
