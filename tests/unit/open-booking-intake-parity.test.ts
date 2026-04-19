import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('open booking route parses dietary text once and propagates it through inquiry, client, and event creation', () => {
  const source = read('app/api/book/route.ts')

  assert.match(source, /function stripHtml\(value: string\)/)
  assert.match(source, /function parseDietaryRestrictions\(value\?: string \| null\)/)
  assert.match(
    source,
    /const dietaryRestrictions = parseDietaryRestrictions\(data\.dietary_restrictions\)/
  )
  assert.match(source, /confirmed_dietary_restrictions:\s*dietaryRestrictions/)

  const propagatedArrays =
    source.match(
      /dietary_restrictions:\s*dietaryRestrictions \?\? \[\],\s*allergies:\s*dietaryRestrictions \?\? \[\],/g
    ) ?? []

  assert.equal(
    propagatedArrays.length,
    2,
    'dietary/allergy safety context should be written into both client and event records'
  )
})
