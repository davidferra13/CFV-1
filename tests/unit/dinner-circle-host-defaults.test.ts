import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8')
}

describe('Dinner Circle host creation defaults', () => {
  it('adds primary inquiry clients as hosts with client-facing coordination permissions', () => {
    const source = readRepoFile('lib/hub/inquiry-circle-actions.ts')

    assert.match(
      source,
      /Primary inquiry client as host[\s\S]*?role: 'host'[\s\S]*?can_post: true[\s\S]*?can_invite: true[\s\S]*?can_pin: true/
    )
    assert.match(
      source,
      /role: 'chef'[\s\S]*?can_post: true[\s\S]*?can_invite: true[\s\S]*?can_pin: true/
    )
  })

  it('adds primary event clients as hosts in chef-created and system-created event circles', () => {
    const chefSource = readRepoFile('lib/hub/chef-circle-actions.ts')
    const integrationSource = readRepoFile('lib/hub/integration-actions.ts')

    const chefHostDefaults = chefSource.match(
      /role: 'host'[\s\S]*?can_post: true[\s\S]*?can_invite: true[\s\S]*?can_pin: true/g
    )

    assert.ok(
      chefHostDefaults && chefHostDefaults.length >= 2,
      'chef-circle-actions should host-add the primary client in both event creation paths'
    )
    assert.match(
      integrationSource,
      /primary event client as host[\s\S]*?role: 'host'[\s\S]*?can_post: true[\s\S]*?can_invite: true[\s\S]*?can_pin: true/i
    )
  })

  it('keeps RSVP joiners and client-created planning circle creators on their existing roles', () => {
    const integrationSource = readRepoFile('lib/hub/integration-actions.ts')
    const stubSource = readRepoFile('lib/events/stub-actions.ts')

    assert.match(
      integrationSource,
      /syncRSVPToHubProfile[\s\S]*?role: 'member'[\s\S]*?can_post: true[\s\S]*?can_invite: false[\s\S]*?can_pin: false/
    )
    assert.match(
      stubSource,
      /Add creator as owner[\s\S]*?role: 'owner'[\s\S]*?can_post: true[\s\S]*?can_invite: true[\s\S]*?can_pin: true/
    )
  })
})
