import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveAiDispatch } from '../../lib/ai/dispatch/router'
import { isLocalOllamaUrl } from '../../lib/ai/dispatch/routing-table'

const keys = ['NODE_ENV', 'OLLAMA_BASE_URL', 'OLLAMA_LOCAL_BASE_URL', 'OLLAMA_CLOUD_BASE_URL',
  'OLLAMA_LOCAL_MODEL', 'OLLAMA_LOCAL_MODEL_COMPLEX', 'OLLAMA_MODEL', 'CHEFFLOW_SHARED_AI_RUNTIME_ENABLED'] as const

function isolatedEnv(callback: () => void) {
  const saved = new Map(keys.map(key => [key, process.env[key]]))
  for (const key of keys) delete process.env[key]
  process.env.CHEFFLOW_SHARED_AI_RUNTIME_ENABLED = 'true'
  try { callback() } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test('restricted work does not fall through to cloud when local is missing', () => isolatedEnv(() => {
  process.env.OLLAMA_CLOUD_BASE_URL = 'https://example.invalid'
  assert.throws(() => resolveAiDispatch({ taskType: 'client.search', userContent: 'synthetic@example.invalid' }),
    /enabled local runtime/)
}))

test('restricted work rejects a remote URL mislabeled as local', () => isolatedEnv(() => {
  process.env.OLLAMA_LOCAL_BASE_URL = 'https://localhost.example.invalid'
  assert.throws(() => resolveAiDispatch({ taskType: 'client.search' }), /enabled local runtime/)
}))

test('restricted work rejects a cloud model behind a local endpoint', () => isolatedEnv(() => {
  process.env.OLLAMA_LOCAL_BASE_URL = 'http://127.0.0.1:11434'
  process.env.OLLAMA_LOCAL_MODEL = 'fixture-cloud'
  assert.throws(() => resolveAiDispatch({ taskType: 'client.search' }), /enabled local runtime/)
}))

test('a media approval hint cannot authorize hosted dispatch', () => isolatedEnv(() => {
  for (const mediaOrigin of ['private_review', 'approved_local_archive'] as const) {
    assert.throws(() => resolveAiDispatch({ taskType: 'ops.portion_calc', mediaOrigin }), /owner-local/)
  }
}))

test('local URL detection parses the hostname rather than matching substrings', () => {
  for (const url of ['https://example.invalid/127.0.0.1', 'http://localhost.example.invalid',
    'http://user:pass@127.0.0.1:11434', 'http://0.0.0.0:11434']) assert.equal(isLocalOllamaUrl(url), false)
  assert.equal(isLocalOllamaUrl('http://127.0.0.1:11434'), true)
})

test('restricted requests reject a cloud override for the selected tier', () => isolatedEnv(() => {
  process.env.OLLAMA_LOCAL_BASE_URL = 'http://127.0.0.1:11434'
  process.env.OLLAMA_LOCAL_MODEL = 'fixture-local'
  process.env.OLLAMA_LOCAL_MODEL_COMPLEX = 'fixture-cloud'
  assert.throws(() => resolveAiDispatch({ taskType: 'client.search', modelTier: 'complex' }), /local model/)
}))
