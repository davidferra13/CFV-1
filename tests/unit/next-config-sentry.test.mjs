import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../../next.config.js', import.meta.url), 'utf8')

function loadConfig(env = {}, sentryAvailable = true) {
  const calls = []
  const module = { exports: {} }
  vm.runInNewContext(source, {
    module,
    process: { env },
    console: { warn() {} },
    require(name) {
      if (name === '@next/bundle-analyzer') return () => (config) => config
      if (name === '@sentry/nextjs') {
        if (!sentryAvailable) throw new Error('Sentry is not installed')
        return {
          withSentryConfig(config, options) {
            calls.push(options)
            return config
          },
        }
      }
      throw new Error(`Unexpected dependency ${name}`)
    },
  })
  return { config: module.exports, calls }
}

test('unconfigured builds do not activate Sentry build hooks', () => {
  const { config, calls } = loadConfig()
  assert.equal(calls.length, 0)
  assert.equal(config.experimental.instrumentationHook, true)
})

test('configured runtime preserves Sentry and opts out of build telemetry', () => {
  const { config, calls } = loadConfig({ NEXT_PUBLIC_SENTRY_DSN: 'https://example.invalid/1' })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].telemetry, false)
  assert.equal(config.experimental.instrumentationHook, true)
})

test('explicit source-map authentication enables the configured wrapper', () => {
  const { calls } = loadConfig({ SENTRY_AUTH_TOKEN: 'fictional-test-token' })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].telemetry, false)
})

test('missing optional Sentry package keeps the application buildable', () => {
  const { config, calls } = loadConfig({ SENTRY_DSN: 'https://example.invalid/1' }, false)
  assert.equal(calls.length, 0)
  assert.equal(config.experimental.instrumentationHook, true)
})

test('isolated output directories and deferred build IDs remain intact', () => {
  const { config } = loadConfig({ NEXT_DIST_DIR: '.next-verification' })
  assert.equal(config.distDir, '.next-verification')
  assert.equal(typeof config.generateBuildId, 'function')
})
