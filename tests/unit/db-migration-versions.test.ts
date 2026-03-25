import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

describe('Database migration versions', () => {
  it('has unique numeric version prefixes', () => {
    const migrationsDir = join(process.cwd(), 'db', 'migrations')
    const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))

    const seen = new Map<string, string>()
    const duplicates: Array<{ version: string; first: string; second: string }> = []

    for (const file of files) {
      const match = /^(\d+)_/.exec(file)
      if (!match) continue

      const version = match[1]
      const existing = seen.get(version)
      if (existing) {
        duplicates.push({ version, first: existing, second: file })
      } else {
        seen.set(version, file)
      }
    }

    assert.equal(
      duplicates.length,
      0,
      `Duplicate migration version prefixes found: ${duplicates
        .map((d) => `${d.version} (${d.first}, ${d.second})`)
        .join('; ')}`
    )
  })
})
