/**
 * Unit tests for the AI subsystem
 *
 * Covers:
 *   A) ai-metrics.ts — counters, latency, tier tracking, reset
 *   B) ollama-errors.ts — OllamaOfflineError, inferErrorCode, getOllamaErrorHelp
 *   C) with-ai-fallback.ts — formula-first, AI enhancement, fallback on error
 *   D) providers.ts — isOllamaEnabled, getOllamaModel, getOllamaConfig
 *
 * Run: node --test tests/unit/ai-layer.test.ts
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import {
  incrementAiMetric,
  recordAiLatency,
  recordAiTier,
  getAiMetrics,
  resetAiMetrics,
  MAX_LATENCY_SAMPLES,
} from '../../lib/ai/ai-metrics'

import { OllamaOfflineError, getOllamaErrorHelp } from '../../lib/ai/ollama-errors'

import { withAiFallback, formulaOnly } from '../../lib/ai/with-ai-fallback'

import {
  getGitHubModelsConfig,
  getGitHubModelsModel,
  getOllamaConfig,
  getOllamaModel,
  getWorkersAiConfig,
  getWorkersAiModel,
  isGitHubModelsEnabled,
  isOllamaEnabled,
  isWorkersAiEnabled,
} from '../../lib/ai/providers'

// ─────────────────────────────────────────────────────────────────────────────
// A) ai-metrics.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('ai-metrics', () => {
  beforeEach(() => {
    resetAiMetrics()
  })

  it('increments a counter by 1 by default', () => {
    incrementAiMetric('ai.call.success')
    const m = getAiMetrics()
    assert.equal(m.counters['ai.call.success'], 1)
  })

  it('increments a counter by a custom amount', () => {
    incrementAiMetric('ai.call.failure', 5)
    const m = getAiMetrics()
    assert.equal(m.counters['ai.call.failure'], 5)
  })

  it('computes avgLatencyMs correctly', () => {
    recordAiLatency(100)
    recordAiLatency(200)
    recordAiLatency(300)
    const m = getAiMetrics()
    assert.equal(m.avgLatencyMs, 200) // (100+200+300)/3
  })

  it('computes p95 latency', () => {
    // Add 100 values: 1..100
    for (let i = 1; i <= 100; i++) recordAiLatency(i)
    const m = getAiMetrics()
    // p95 index = floor(100 * 0.95) = 95 → sorted[95] = 96
    assert.equal(m.p95LatencyMs, 96)
  })

  it('tracks tier distribution', () => {
    recordAiTier('fast')
    recordAiTier('fast')
    recordAiTier('standard')
    const m = getAiMetrics()
    assert.equal(m.tierDistribution['fast'], 2)
    assert.equal(m.tierDistribution['standard'], 1)
    assert.equal(m.tierDistribution['complex'], undefined)
  })

  it('evicts oldest latency samples beyond MAX_LATENCY_SAMPLES', () => {
    for (let i = 0; i < MAX_LATENCY_SAMPLES + 50; i++) {
      recordAiLatency(i)
    }
    // Should have exactly MAX_LATENCY_SAMPLES
    const m = getAiMetrics()
    // avgLatencyMs is based on MAX_LATENCY_SAMPLES entries
    assert.ok(m.avgLatencyMs !== null)
    // The first 50 entries (0..49) should have been evicted
    // Remaining: 50..(MAX_LATENCY_SAMPLES+49), so avg should reflect that
    const expectedAvg = Math.round(
      Array.from({ length: MAX_LATENCY_SAMPLES }, (_, i) => i + 50).reduce((a, b) => a + b, 0) /
        MAX_LATENCY_SAMPLES
    )
    assert.equal(m.avgLatencyMs, expectedAvg)
  })

  it('returns nulls for empty state', () => {
    const m = getAiMetrics()
    assert.equal(m.avgLatencyMs, null)
    assert.equal(m.p95LatencyMs, null)
    assert.equal(m.cacheHitRate, null)
    assert.equal(m.repairRate, null)
    assert.equal(m.errorRate, null)
    assert.equal(m.totalCalls, 0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B) OllamaOfflineError
// ─────────────────────────────────────────────────────────────────────────────

describe('OllamaOfflineError', () => {
  it('has correct name and code', () => {
    const err = new OllamaOfflineError('test reason', 'unreachable')
    assert.equal(err.name, 'OllamaOfflineError')
    assert.equal(err.code, 'unreachable')
    assert.ok(err.message.includes('test reason'))
  })

  it('infers timeout code from reason string', () => {
    const err = new OllamaOfflineError('Request timeout after 30s')
    assert.equal(err.code, 'timeout')
  })

  it('infers unreachable code from ECONNREFUSED', () => {
    const err = new OllamaOfflineError('ECONNREFUSED at localhost')
    assert.equal(err.code, 'unreachable')
  })

  it('getOllamaErrorHelp returns a string for every code', () => {
    const codes = [
      'not_configured',
      'unreachable',
      'timeout',
      'model_missing',
      'empty_response',
      'invalid_json',
      'validation_failed',
      'unknown',
    ] as const

    for (const code of codes) {
      const help = getOllamaErrorHelp(code)
      assert.ok(typeof help === 'string' && help.length > 0, `No help for ${code}`)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// C) withAiFallback
// ─────────────────────────────────────────────────────────────────────────────

describe('withAiFallback', () => {
  // Save and restore env
  const originalOllamaUrl = process.env.OLLAMA_BASE_URL

  beforeEach(() => {
    resetAiMetrics()
  })

  it('returns formula result when Ollama is disabled', async () => {
    delete process.env.OLLAMA_BASE_URL
    const { result, source } = await withAiFallback(
      () => ({ value: 42 }),
      async () => ({ value: 99 })
    )
    assert.equal(result.value, 42)
    assert.equal(source, 'formula')
    // Restore
    if (originalOllamaUrl) process.env.OLLAMA_BASE_URL = originalOllamaUrl
  })

  it('returns AI result when Ollama is enabled and AI succeeds', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    const { result, source } = await withAiFallback(
      () => ({ value: 42 }),
      async () => ({ value: 99 })
    )
    assert.equal(result.value, 99)
    assert.equal(source, 'ai')
    // Restore
    if (originalOllamaUrl) process.env.OLLAMA_BASE_URL = originalOllamaUrl
    else delete process.env.OLLAMA_BASE_URL
  })

  it('falls back to formula when AI throws a generic error', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    const { result, source } = await withAiFallback(
      () => ({ value: 42 }),
      async () => {
        throw new Error('AI failed')
      }
    )
    assert.equal(result.value, 42)
    assert.equal(source, 'formula')
    // Restore
    if (originalOllamaUrl) process.env.OLLAMA_BASE_URL = originalOllamaUrl
    else delete process.env.OLLAMA_BASE_URL
  })

  it('falls back to formula when AI throws OllamaOfflineError', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    const { result, source } = await withAiFallback(
      () => ({ value: 42 }),
      async () => {
        throw new OllamaOfflineError('offline', 'unreachable')
      }
    )
    assert.equal(result.value, 42)
    assert.equal(source, 'formula')
    // Restore
    if (originalOllamaUrl) process.env.OLLAMA_BASE_URL = originalOllamaUrl
    else delete process.env.OLLAMA_BASE_URL
  })

  it('increments ai.fallback.to_formula metric on fallback', async () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    await withAiFallback(
      () => 'formula',
      async () => {
        throw new Error('fail')
      }
    )
    const m = getAiMetrics()
    assert.equal(m.counters['ai.fallback.to_formula'], 1)
    // Restore
    if (originalOllamaUrl) process.env.OLLAMA_BASE_URL = originalOllamaUrl
    else delete process.env.OLLAMA_BASE_URL
  })

  it('source field is correct for both paths', async () => {
    // Formula path
    delete process.env.OLLAMA_BASE_URL
    const r1 = await withAiFallback(
      () => 'f',
      async () => 'a'
    )
    assert.equal(r1.source, 'formula')

    // AI path
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    const r2 = await withAiFallback(
      () => 'f',
      async () => 'a'
    )
    assert.equal(r2.source, 'ai')

    // Restore
    if (originalOllamaUrl) process.env.OLLAMA_BASE_URL = originalOllamaUrl
    else delete process.env.OLLAMA_BASE_URL
  })

  it('formulaOnly helper returns source=formula', () => {
    const r = formulaOnly({ x: 1 })
    assert.equal(r.source, 'formula')
    assert.deepEqual(r.result, { x: 1 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// D) providers.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('providers', () => {
  const origUrl = process.env.OLLAMA_BASE_URL
  const origModel = process.env.OLLAMA_MODEL
  const origFast = process.env.OLLAMA_MODEL_FAST
  const origComplex = process.env.OLLAMA_MODEL_COMPLEX
  const origGitHubToken = process.env.GITHUB_MODELS_TOKEN
  const origGitHubBaseUrl = process.env.GITHUB_MODELS_BASE_URL
  const origGitHubApiVersion = process.env.GITHUB_MODELS_API_VERSION
  const origGitHubOrg = process.env.GITHUB_MODELS_ORG
  const origGitHubModel = process.env.GITHUB_MODELS_MODEL
  const origGitHubFast = process.env.GITHUB_MODELS_MODEL_FAST
  const origGitHubComplex = process.env.GITHUB_MODELS_MODEL_COMPLEX
  const origCfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const origCfApiToken = process.env.CLOUDFLARE_API_TOKEN
  const origCfBaseUrl = process.env.CLOUDFLARE_WORKERS_AI_BASE_URL
  const origCfModel = process.env.CLOUDFLARE_WORKERS_AI_MODEL
  const origCfFast = process.env.CLOUDFLARE_WORKERS_AI_MODEL_FAST
  const origCfComplex = process.env.CLOUDFLARE_WORKERS_AI_MODEL_COMPLEX

  function restoreEnv() {
    if (origUrl) process.env.OLLAMA_BASE_URL = origUrl
    else delete process.env.OLLAMA_BASE_URL
    if (origModel) process.env.OLLAMA_MODEL = origModel
    else delete process.env.OLLAMA_MODEL
    if (origFast) process.env.OLLAMA_MODEL_FAST = origFast
    else delete process.env.OLLAMA_MODEL_FAST
    if (origComplex) process.env.OLLAMA_MODEL_COMPLEX = origComplex
    else delete process.env.OLLAMA_MODEL_COMPLEX
    if (origGitHubToken) process.env.GITHUB_MODELS_TOKEN = origGitHubToken
    else delete process.env.GITHUB_MODELS_TOKEN
    if (origGitHubBaseUrl) process.env.GITHUB_MODELS_BASE_URL = origGitHubBaseUrl
    else delete process.env.GITHUB_MODELS_BASE_URL
    if (origGitHubApiVersion) process.env.GITHUB_MODELS_API_VERSION = origGitHubApiVersion
    else delete process.env.GITHUB_MODELS_API_VERSION
    if (origGitHubOrg) process.env.GITHUB_MODELS_ORG = origGitHubOrg
    else delete process.env.GITHUB_MODELS_ORG
    if (origGitHubModel) process.env.GITHUB_MODELS_MODEL = origGitHubModel
    else delete process.env.GITHUB_MODELS_MODEL
    if (origGitHubFast) process.env.GITHUB_MODELS_MODEL_FAST = origGitHubFast
    else delete process.env.GITHUB_MODELS_MODEL_FAST
    if (origGitHubComplex) process.env.GITHUB_MODELS_MODEL_COMPLEX = origGitHubComplex
    else delete process.env.GITHUB_MODELS_MODEL_COMPLEX
    if (origCfAccountId) process.env.CLOUDFLARE_ACCOUNT_ID = origCfAccountId
    else delete process.env.CLOUDFLARE_ACCOUNT_ID
    if (origCfApiToken) process.env.CLOUDFLARE_API_TOKEN = origCfApiToken
    else delete process.env.CLOUDFLARE_API_TOKEN
    if (origCfBaseUrl) process.env.CLOUDFLARE_WORKERS_AI_BASE_URL = origCfBaseUrl
    else delete process.env.CLOUDFLARE_WORKERS_AI_BASE_URL
    if (origCfModel) process.env.CLOUDFLARE_WORKERS_AI_MODEL = origCfModel
    else delete process.env.CLOUDFLARE_WORKERS_AI_MODEL
    if (origCfFast) process.env.CLOUDFLARE_WORKERS_AI_MODEL_FAST = origCfFast
    else delete process.env.CLOUDFLARE_WORKERS_AI_MODEL_FAST
    if (origCfComplex) process.env.CLOUDFLARE_WORKERS_AI_MODEL_COMPLEX = origCfComplex
    else delete process.env.CLOUDFLARE_WORKERS_AI_MODEL_COMPLEX
  }

  it('isOllamaEnabled returns true when env is set', () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
    assert.equal(isOllamaEnabled(), true)
    restoreEnv()
  })

  it('isOllamaEnabled returns false when env is not set', () => {
    delete process.env.OLLAMA_BASE_URL
    assert.equal(isOllamaEnabled(), false)
    restoreEnv()
  })

  it('getOllamaModel returns correct defaults per tier', () => {
    delete process.env.OLLAMA_MODEL
    delete process.env.OLLAMA_MODEL_FAST
    delete process.env.OLLAMA_MODEL_COMPLEX

    assert.equal(getOllamaModel('fast'), 'qwen3:4b')
    assert.equal(getOllamaModel('standard'), 'qwen3-coder:30b')
    assert.equal(getOllamaModel('complex'), 'qwen3:30b')
    restoreEnv()
  })

  it('getOllamaConfig returns defaults when env not set', () => {
    delete process.env.OLLAMA_BASE_URL
    delete process.env.OLLAMA_MODEL
    const config = getOllamaConfig()
    assert.equal(config.baseUrl, 'http://localhost:11434')
    assert.equal(config.model, 'qwen3-coder:30b')
    restoreEnv()
  })

  it('isGitHubModelsEnabled returns true when token is set', () => {
    process.env.GITHUB_MODELS_TOKEN = 'ghp_test'
    assert.equal(isGitHubModelsEnabled(), true)
    restoreEnv()
  })

  it('isGitHubModelsEnabled returns false when token is missing', () => {
    delete process.env.GITHUB_MODELS_TOKEN
    assert.equal(isGitHubModelsEnabled(), false)
    restoreEnv()
  })

  it('getGitHubModelsModel returns correct defaults per tier', () => {
    delete process.env.GITHUB_MODELS_MODEL
    delete process.env.GITHUB_MODELS_MODEL_FAST
    delete process.env.GITHUB_MODELS_MODEL_COMPLEX

    assert.equal(getGitHubModelsModel('fast'), 'meta/Llama-3.1-8B-Instruct')
    assert.equal(getGitHubModelsModel('standard'), 'openai/gpt-4.1-mini')
    assert.equal(getGitHubModelsModel('complex'), 'openai/gpt-4.1')
    restoreEnv()
  })

  it('getGitHubModelsConfig returns defaults when env not set', () => {
    delete process.env.GITHUB_MODELS_TOKEN
    delete process.env.GITHUB_MODELS_BASE_URL
    delete process.env.GITHUB_MODELS_API_VERSION
    delete process.env.GITHUB_MODELS_ORG
    const config = getGitHubModelsConfig()
    assert.equal(config.baseUrl, 'https://models.github.ai')
    assert.equal(config.apiVersion, '2026-03-10')
    assert.equal(config.org, null)
    assert.equal(config.token, '')
    restoreEnv()
  })

  it('isWorkersAiEnabled returns true when account ID and token are set', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'acct'
    process.env.CLOUDFLARE_API_TOKEN = 'token'
    assert.equal(isWorkersAiEnabled(), true)
    restoreEnv()
  })

  it('isWorkersAiEnabled returns false when account ID or token is missing', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'acct'
    delete process.env.CLOUDFLARE_API_TOKEN
    assert.equal(isWorkersAiEnabled(), false)
    restoreEnv()
  })

  it('getWorkersAiModel returns correct defaults per tier', () => {
    delete process.env.CLOUDFLARE_WORKERS_AI_MODEL
    delete process.env.CLOUDFLARE_WORKERS_AI_MODEL_FAST
    delete process.env.CLOUDFLARE_WORKERS_AI_MODEL_COMPLEX

    assert.equal(getWorkersAiModel('fast'), '@cf/meta/llama-3.1-8b-instruct')
    assert.equal(getWorkersAiModel('standard'), '@cf/meta/llama-3.3-70b-instruct-fp8-fast')
    assert.equal(getWorkersAiModel('complex'), '@cf/nvidia/nemotron-3-120b-a12b')
    restoreEnv()
  })

  it('getWorkersAiConfig returns defaults when env not set', () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_API_TOKEN
    delete process.env.CLOUDFLARE_WORKERS_AI_BASE_URL
    const config = getWorkersAiConfig()
    assert.equal(config.accountId, '')
    assert.equal(config.apiToken, '')
    assert.equal(config.baseUrl, 'https://api.cloudflare.com/client/v4/accounts//ai/v1')
    restoreEnv()
  })
})
