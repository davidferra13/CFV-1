import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { classifyAiTask } from '@/lib/ai/dispatch/classifier'
import { scanAiPrivacyRisk } from '@/lib/ai/dispatch/privacy-gate'
import { getAiRuntimePolicy, resolveOllamaModel } from '@/lib/ai/dispatch/routing-table'
import { resolveAiActionDecision, resolveAiDispatch } from '@/lib/ai/dispatch/router'

const ORIGINAL_ENV = {
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OLLAMA_LOCAL_BASE_URL: process.env.OLLAMA_LOCAL_BASE_URL,
  OLLAMA_CLOUD_BASE_URL: process.env.OLLAMA_CLOUD_BASE_URL,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  OLLAMA_LOCAL_MODEL: process.env.OLLAMA_LOCAL_MODEL,
  OLLAMA_CLOUD_MODEL: process.env.OLLAMA_CLOUD_MODEL,
}

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value == null) delete process.env[key]
    else process.env[key] = value
  }
}

describe('ai dispatch privacy gate', () => {
  beforeEach(() => {
    restoreEnv()
  })

  it('marks client payloads with PII as restricted', () => {
    const scan = scanAiPrivacyRisk({
      taskType: 'client.search',
      userContent: 'Email Sarah at sarah@example.com about the quote.',
      surface: 'remy.stream',
    })

    assert.equal(scan.level, 'restricted')
    assert.equal(scan.containsSensitiveData, true)
    assert.ok(scan.matchedSignals.includes('content:email_address'))
  })

  it('keeps generic public content public', () => {
    const scan = scanAiPrivacyRisk({
      taskType: 'public.answer',
      userContent: 'What cuisines do you offer for weddings?',
      surface: 'remy.public',
    })

    assert.equal(scan.level, 'public')
  })
})

describe('ai dispatch classifier', () => {
  it('classifies agent actions as writes that need approval', () => {
    const classification = classifyAiTask({ taskType: 'agent.create_event' })

    assert.equal(classification.taskClass, 'write')
    assert.equal(classification.mutatesState, true)
    assert.equal(classification.needsApproval, true)
  })

  it('classifies known formula tasks as deterministic', () => {
    const classification = classifyAiTask({ taskType: 'ops.portion_calc' })

    assert.equal(classification.taskClass, 'deterministic')
    assert.equal(classification.requiresLlm, false)
  })
})

describe('ai action threshold policy', () => {
  it('executes high-confidence reversible work', () => {
    const decision = resolveAiActionDecision({
      confidence: 0.91,
      safety: 'reversible',
      canAutoExecute: true,
      canQueueForApproval: false,
    })

    assert.equal(decision?.disposition, 'execute')
  })

  it('queues medium-confidence approval-capable work', () => {
    const decision = resolveAiActionDecision({
      confidence: 0.72,
      safety: 'significant',
      requiresApproval: true,
      canAutoExecute: false,
      canQueueForApproval: true,
    })

    assert.equal(decision?.disposition, 'queue_for_approval')
  })

  it('requests input for low-confidence work', () => {
    const decision = resolveAiActionDecision({
      confidence: 0.42,
      safety: 'reversible',
      canAutoExecute: true,
      canQueueForApproval: false,
    })

    assert.equal(decision?.disposition, 'request_input')
  })

  it('blocks restricted actions', () => {
    const decision = resolveAiActionDecision({
      confidence: 0.99,
      safety: 'restricted',
      canQueueForApproval: true,
    })

    assert.equal(decision?.disposition, 'block')
  })
})

describe('ai runtime policy', () => {
  beforeEach(() => {
    restoreEnv()
  })

  it('resolves hybrid mode when local and cloud endpoints are both configured', () => {
    process.env.OLLAMA_LOCAL_BASE_URL = 'http://localhost:11434'
    process.env.OLLAMA_CLOUD_BASE_URL = 'https://ollama.example.com'

    const policy = getAiRuntimePolicy()

    assert.equal(policy.mode, 'hybrid')
    assert.equal(policy.defaultLocation, 'local')
    assert.equal(policy.endpoints.filter((endpoint) => endpoint.enabled).length, 2)
  })

  it('uses location-specific model overrides when present', () => {
    process.env.OLLAMA_LOCAL_MODEL = 'gemma4-local'
    process.env.OLLAMA_CLOUD_MODEL = 'gemma4-cloud'

    assert.equal(resolveOllamaModel('standard', 'local'), 'gemma4-local')
    assert.equal(resolveOllamaModel('standard', 'cloud'), 'gemma4-cloud')
  })
})

describe('ai dispatch routing', () => {
  beforeEach(() => {
    restoreEnv()
  })

  it('routes restricted hybrid work to the local runtime', () => {
    process.env.OLLAMA_LOCAL_BASE_URL = 'http://localhost:11434'
    process.env.OLLAMA_CLOUD_BASE_URL = 'https://ollama.example.com'

    const decision = resolveAiDispatch({
      taskType: 'client.search',
      userContent: 'Client email is chef@example.com',
      modelTier: 'standard',
      surface: 'remy.stream',
    })

    assert.equal(decision.endpoint?.location, 'local')
    assert.equal(decision.executionLocation, 'local')
    assert.equal(decision.provider, 'ollama')
  })

  it('routes deterministic work away from the LLM layer', () => {
    const decision = resolveAiDispatch({
      taskType: 'ops.portion_calc',
      userContent: 'Scale to 20 guests',
    })

    assert.equal(decision.provider, 'deterministic')
    assert.equal(decision.endpoint, null)
    assert.equal(decision.model, null)
  })
})
