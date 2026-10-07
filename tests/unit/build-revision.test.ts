import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

import { resolveBuildRevision } from '../../lib/release/build-revision'

const FULL = '065916ad4c0ffee0000000000000000000000abc'
const ROOT = process.cwd()

describe('resolveBuildRevision', () => {
  it('expands a built short id to the full commit', () => {
    const calls: Array<[string, string]> = []
    const revision = resolveBuildRevision('065916ad4', '/srv/app', (id, cwd) => {
      calls.push([id, cwd])
      return `${FULL}\n`
    })
    assert.equal(revision, FULL)
    assert.deepEqual(calls, [['065916ad4', '/srv/app']])
  })

  it('returns a full commit as-is without asking git', () => {
    const revision = resolveBuildRevision(FULL.toUpperCase(), '/srv/app', () => {
      throw new Error('should not be called')
    })
    assert.equal(revision, FULL)
  })

  it('fails closed when the build id is not a commit', () => {
    for (const id of [
      'unknown',
      '',
      null,
      undefined,
      'abc',
      'v1.2.3',
      'HEAD',
      '065916ad4; rm -rf /',
    ]) {
      assert.equal(
        resolveBuildRevision(id, '/srv/app', () => FULL),
        null,
        `expected null for ${String(id)}`
      )
    }
  })

  it('fails closed when git cannot expand the id', () => {
    assert.equal(
      resolveBuildRevision('065916ad4', '/srv/app', () => {
        throw new Error('not a git repository')
      }),
      null
    )
  })

  it('rejects an expansion that does not match the built id', () => {
    const other = 'ffffffffffffffffffffffffffffffffffffffff'
    assert.equal(
      resolveBuildRevision('065916ad4', '/srv/app', () => other),
      null
    )
    assert.equal(
      resolveBuildRevision('065916ad4', '/srv/app', () => 'not-a-sha'),
      null
    )
  })

  it('agrees with git for this checkout', () => {
    const git = (args: string[]) =>
      execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
    const full = git(['rev-parse', 'HEAD'])
    const short = git(['rev-parse', '--short', 'HEAD'])
    assert.equal(resolveBuildRevision(short, ROOT), full)
  })
})

describe('/api/build-version contract', () => {
  const route = readFileSync(join(ROOT, 'app', 'api', 'build-version', 'route.ts'), 'utf8')
  const gate = readFileSync(join(ROOT, 'scripts', 'verify-capability-claims.mjs'), 'utf8')

  it('serves the revision field the capability proof gate reads', () => {
    assert.match(route, /revision:\s*getRevision\(\)/)
    assert.match(route, /buildId:\s*getBuildId\(\)/)
    assert.match(gate, /typeof identity\.revision !== 'string'/)
    assert.match(gate, /live\.revision !== run\.revision/)
  })

  it('derives the revision from the build, never from the checkout HEAD', () => {
    assert.match(route, /resolveBuildRevision\(getBuildId\(\), process\.cwd\(\)\)/)
    assert.doesNotMatch(route, /rev-parse/)
  })
})
