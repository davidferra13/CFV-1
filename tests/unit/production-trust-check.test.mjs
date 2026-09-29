import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import {
  buildChecks,
  classifyFailure,
} from '../../scripts/production-trust-check.mjs'

test('buildChecks uses the canonical ChefFlow origin and public surfaces', () => {
  const checks = buildChecks({})
  const byName = Object.fromEntries(checks.map((check) => [check.name, check.url]))

  assert.equal(byName['origin-health'], 'http://127.0.0.1:3100/api/health/ping')
  assert.equal(byName['app-health'], 'https://app.cheflowhq.com/api/health/ping')
  assert.equal(byName['apex-home'], 'https://cheflowhq.com/')
  assert.equal(byName['chef-directory'], 'https://app.cheflowhq.com/chefs')
  assert.equal(byName['booking'], 'https://app.cheflowhq.com/book')
})

test('classifyFailure isolates an edge or DNS outage from a healthy origin', () => {
  assert.equal(
    classifyFailure({
      'origin-health': { ok: true },
      'app-health': { ok: false },
      'apex-home': { ok: false },
    }),
    'edge_or_dns'
  )
})

test('scheduled health check delegates to the canonical trust checker', () => {
  const scheduled = fs.readFileSync(
    new URL('../../scripts/scheduled/prod-health-check.ps1', import.meta.url),
    'utf8'
  )

  assert.match(scheduled, /production-trust-check\.mjs/)
  assert.match(scheduled, /Trust=\$trustStatus/)
  assert.doesNotMatch(scheduled, /localhost:3000/)
  assert.doesNotMatch(scheduled, /Prod=\$prodStatus/)
})
