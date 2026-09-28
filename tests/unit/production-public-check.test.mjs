import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { checkPublic, classifyResponse, publicChecks } from '../../scripts/production-public-check.mjs'

test('checks both canonical domains and their health endpoints', () => {
  assert.deepEqual(publicChecks.map((c) => c.url), [
    'https://cheflowhq.com/', 'https://cheflowhq.com/api/health/ping',
    'https://app.cheflowhq.com/', 'https://app.cheflowhq.com/api/health/ping',
  ])
})
test('distinguishes 1033 from other edge failures', () => {
  assert.equal(classifyResponse({ kind: 'page' }, 530, 'error code: 1033'), 'tunnel_disconnected')
  assert.equal(classifyResponse({ kind: 'page' }, 530, '<h1>Error <span>1033</span></h1>'), 'tunnel_disconnected')
  assert.equal(classifyResponse({ kind: 'page' }, 530, 'error code: 1016'), 'http_530')
})
test('rejects redirects, HTML masquerading as health and unhealthy JSON', () => {
  for (const [status, body] of [[302, ''], [200, '<html>login</html>'], [200, '{"status":"down"}']]) {
    assert.notEqual(classifyResponse({ kind: 'ping' }, status, body), 'reachable')
  }
})
test('all four probes must pass, without following login redirects', async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(options.redirect, 'manual')
    return new Response(url.endsWith('/ping') ? '{"status":"ok"}' : 'ChefFlow')
  }
  assert.equal((await checkPublic({ fetchImpl })).ok, true)
  const failed = await checkPublic({ fetchImpl: async (url, options) =>
    url === 'https://cheflowhq.com/' ? new Response('error code: 1033', { status: 530 }) : fetchImpl(url, options) })
  assert.equal(failed.ok, false)
  assert.equal(failed.results[0].classification, 'tunnel_disconnected')
})
test('transport failures stay failures', async () => {
  const result = await checkPublic({ fetchImpl: async () => { throw new Error('offline') } })
  assert.equal(result.ok, false)
  assert.ok(result.results.every((r) => r.classification === 'transport_error'))
})
test('production ingress excludes beta and unrelated hosts', () => {
  const config = readFileSync(new URL('../../.cloudflared/production.yml', import.meta.url), 'utf8')
  assert.deepEqual([...config.matchAll(/hostname: (.+)/g)].map((m) => m[1]), ['app.cheflowhq.com', 'cheflowhq.com'])
  assert.match(config, /tunnel: 9dab6929-68e3-4775-9b8e-17482f714e83/)
  assert.match(config, /- service: http_status:404\s*$/)
})
test('legacy deploy fails before Docker when required build inputs are absent', { skip: process.platform === 'win32' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'chef-deploy-test-'))
  mkdirSync(join(root, 'scripts'))
  mkdirSync(join(root, 'bin'))
  copyFileSync(new URL('../../scripts/deploy-prod.sh', import.meta.url), join(root, 'scripts/deploy-prod.sh'))
  writeFileSync(join(root, 'bin/docker'), '#!/bin/sh\necho DOCKER_MUST_NOT_RUN\n', { mode: 0o755 })
  const run = spawnSync('bash', [join(root, 'scripts/deploy-prod.sh')], {
    cwd: tmpdir(), encoding: 'utf8', env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` },
  })
  assert.equal(run.status, 1)
  assert.match(run.stdout, /requires Dockerfile/)
  assert.doesNotMatch(run.stdout, /DOCKER_MUST_NOT_RUN/)
})
