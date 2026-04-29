import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync('lib/clients/client-profile-actions.ts', 'utf8')

function getUpdateMyProfileSource() {
  const start = source.indexOf('export async function updateMyProfile')
  const end = source.indexOf('export async function getMyMealCollaborationData', start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  return source.slice(start, end)
}

describe('client self-service profile sync', () => {
  it('keeps downstream chef and client surfaces aligned after dietary edits', () => {
    const section = getUpdateMyProfileSource()

    assert.match(section, /invalidateRemyContextCache\(oldProfile\.tenant_id\)/)
    assert.match(section, /logDietaryChange\(/)
    assert.match(section, /syncFlatToStructured/)
    assert.match(section, /recheckUpcomingMenusForClient/)
    assert.match(section, /\.from\('events'\)/)
    assert.match(section, /\.eq\('client_id', user\.entityId\)/)
    assert.match(section, /\.eq\('tenant_id', oldProfile\.tenant_id\)/)
    assert.match(section, /\.in\('status', activeStatuses\)/)
    assert.match(section, /revalidatePath\(`\/events\/\$\{event\.id\}`\)/)
    assert.match(section, /revalidatePath\(`\/my-events\/\$\{event\.id\}`\)/)
  })

  it('only runs dietary bridges for submitted dietary fields', () => {
    const section = getUpdateMyProfileSource()

    assert.match(section, /changedDietaryFields/)
    assert.match(section, /hasOwnInputField\(validated, field\)/)
    assert.match(section, /changedDietaryFields\.includes\('allergies'\)/)
  })
})
