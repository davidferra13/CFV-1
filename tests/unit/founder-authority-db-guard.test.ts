import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const migration = readFileSync(
  'database/migrations/20260430000002_founder_authority_platform_guard.sql',
  'utf8'
)

describe('Founder Authority database guard migration', () => {
  it('protects the canonical founder platform admin row from direct SQL mutation', () => {
    assert.match(migration, /prevent_founder_authority_platform_admin_change/)
    assert.match(migration, /davidferra13@gmail\.com/)
    assert.match(migration, /0c254be3-8e70-42a0-84d9-39a01a877ae8/)
    assert.match(migration, /BEFORE UPDATE OR DELETE ON platform_admins/)
  })

  it('blocks disabling, deleting, or downgrading Founder Authority', () => {
    assert.match(migration, /cannot be deleted/)
    assert.match(migration, /access level cannot be downgraded/)
    assert.match(migration, /cannot be disabled/)
    assert.match(migration, /NEW\.access_level <> 'owner'/)
    assert.match(migration, /NEW\.is_active IS NOT TRUE/)
    assert.match(migration, /RETURN OLD/)
  })
})
