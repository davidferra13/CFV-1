// @ts-nocheck
import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  buildInteractionSet,
  classifyChangedFiles,
  selectReports,
} from '../../devtools/persona-completion-gate.mjs'

test('classifies product changes into persona categories and roles', () => {
  const result = classifyChangedFiles([
    'lib/dietary/allergen-check.ts',
    'components/messages/client-thread.tsx',
    'docs/specs/persona.md',
  ])

  assert.deepEqual(result.relevantFiles, [
    'lib/dietary/allergen-check.ts',
    'components/messages/client-thread.tsx',
  ])
  assert.ok(result.categories.includes('dietary-medical'))
  assert.ok(result.categories.includes('communication'))
  assert.ok(result.roles.includes('Chef'))
  assert.ok(result.roles.includes('Client'))
  assert.ok(result.roles.includes('Guest'))
  assert.ok(result.roles.includes('Staff'))
})

test('unknown product surfaces still receive general workflow coverage', () => {
  const result = classifyChangedFiles(['lib/new-domain/engine.ts'])
  assert.deepEqual(result.categories, ['general-workflow'])
  assert.deepEqual(result.roles, ['Chef', 'Client'])
})

test('internal tooling changes do not trigger end-user persona execution', () => {
  const result = classifyChangedFiles([
    'scripts/regression-firewall.mjs',
    'devtools/persona-completion-gate.mjs',
    'tests/unit/persona-completion-gate.test.mjs',
  ])
  assert.deepEqual(result.relevantFiles, [])
  assert.deepEqual(result.categories, [])
})

test('selects a small category-matched and role-diverse persona set', () => {
  const reports = [
    {
      slug: 'chef-a',
      type: 'Chef',
      score: 70,
      categories: ['dietary-medical'],
      partial: false,
    },
    {
      slug: 'guest-a',
      type: 'Guest',
      score: 65,
      categories: ['dietary-medical'],
      partial: false,
    },
    {
      slug: 'client-a',
      type: 'Client',
      score: 80,
      categories: ['communication'],
      partial: false,
    },
    {
      slug: 'chef-b',
      type: 'Chef',
      score: 90,
      categories: ['communication'],
      partial: false,
    },
  ]

  const selected = selectReports(
    reports,
    ['dietary-medical', 'communication'],
    ['Chef', 'Client', 'Guest'],
    3
  )

  assert.equal(selected.length, 3)
  assert.ok(selected.some((item) => item.categories.includes('dietary-medical')))
  assert.ok(selected.some((item) => item.categories.includes('communication')))
  assert.ok(new Set(selected.map((item) => item.type)).size >= 2)
})

test('builds pair and triad interaction coverage from three selected personas', () => {
  const selected = [
    { slug: 'chef-a', type: 'Chef' },
    { slug: 'client-a', type: 'Client' },
    { slug: 'guest-a', type: 'Guest' },
  ]

  const interactions = buildInteractionSet(selected)
  assert.equal(interactions.filter((item) => item.status === 'selected-pair').length, 3)
  assert.equal(interactions.filter((item) => item.status === 'selected-triad').length, 1)
})

import * as gate from '../../devtools/persona-completion-gate.mjs'

const chef = {
  slug: 'test-chef',
  type: 'Chef',
  content: 'Synthetic chef persona',
}
const client = {
  slug: 'test-client',
  type: 'Client',
  content: 'Synthetic client persona',
}
const context = {
  categories: ['documentation-records'],
  changedFiles: ['lib/history/import.ts'],
  patch: 'Synthetic patch',
  minScore: 60,
}
function response(
  verdict = {
    pass: true,
    score: 75,
    blocking_gaps: [],
    risks: [],
    reason: 'Patch is safe',
  }
) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ response: JSON.stringify(verdict) }),
  }
}
async function bounded(promise) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Evaluation exceeded the test deadline')), 1500)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
test('evaluates a successful real-shaped Ollama response with unchanged request contract', async () => {
  const calls = []
  const result = await gate.runAnalyzer(chef, 'existing-local-model', context, {
    requestTimeoutMs: 20,
    fetch: async (url, options) => {
      calls.push({ url, options })
      return response()
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.score, 75)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://127.0.0.1:11434/api/generate')
  const payload = JSON.parse(calls[0].options.body)
  assert.equal(payload.model, 'existing-local-model')
  assert.equal(payload.options.num_predict, 320)
  assert.equal(payload.options.temperature, 0)
  assert.equal(payload.think, false)
  assert.equal(payload.stream, false)
  assert.ok(payload.prompt.includes('Synthetic patch'))
  assert.ok(payload.prompt.includes('Synthetic chef persona'))
  assert.ok(calls[0].options.signal instanceof AbortSignal)
})
test('unresponsive fetch is aborted and yields a bounded failed analyzer result', async () => {
  const signals = []
  const result = await bounded(
    gate.runAnalyzer(chef, 'existing-local-model', context, {
      requestTimeoutMs: 10,
      fetch: async (_url, options) => {
        signals.push(options.signal)
        return new Promise(() => {})
      },
    })
  )
  assert.equal(result.ok, false)
  assert.equal(result.score, 0)
  assert.match(result.error, /timed out/i)
  assert.equal(signals.length, 2)
  assert.ok(signals.every((signal) => signal.aborted))
})
test('response body parsing shares the request deadline', async () => {
  const signals = []
  const result = await bounded(
    gate.runAnalyzer(chef, 'existing-local-model', context, {
      requestTimeoutMs: 10,
      fetch: async (_url, options) => {
        signals.push(options.signal)
        return { ok: true, status: 200, json: () => new Promise(() => {}) }
      },
    })
  )
  assert.equal(result.ok, false)
  assert.match(result.error, /timed out/i)
  assert.ok(signals.every((signal) => signal.aborted))
})
test('malformed model JSON retries with the existing second-attempt prompt and token budget', async () => {
  const payloads = []
  const result = await gate.runAnalyzer(chef, 'existing-local-model', context, {
    requestTimeoutMs: 20,
    fetch: async (_url, options) => {
      payloads.push(JSON.parse(options.body))
      return payloads.length === 1
        ? { ok: true, status: 200, json: async () => ({ response: '{' }) }
        : response()
    },
  })
  assert.equal(result.ok, true)
  assert.deepEqual(
    payloads.map((payload) => payload.options.num_predict),
    [320, 520]
  )
  assert.ok(payloads[1].prompt.includes('RETRY: Keep every gap/risk under 12 words'))
})
test('HTTP failures produce a failed receipt and retain selected persona and interaction coverage', async () => {
  let calls = 0
  const receipt = await gate.evaluatePersonaGate(
    [chef, client],
    [chef, client],
    'existing-local-model',
    context,
    {
      requestTimeoutMs: 20,
      fetch: async () => {
        calls++
        return { ok: false, status: 503 }
      },
    }
  )
  assert.equal(receipt.status, 'FAIL')
  assert.equal(receipt.results.length, 3)
  assert.equal(calls, 6)
  assert.ok(
    receipt.results.every((result) => result.ok === false && /Ollama HTTP 503/.test(result.error))
  )
  assert.equal(receipt.results[2].type, 'Chef+Client')
})
test('connection errors produce an honest failed receipt without skipping personas', async () => {
  const receipt = await gate.evaluatePersonaGate(
    [chef, client],
    [],
    'existing-local-model',
    context,
    {
      requestTimeoutMs: 20,
      fetch: async () => {
        throw new Error('Synthetic connection unavailable')
      },
    }
  )
  assert.equal(receipt.status, 'FAIL')
  assert.equal(receipt.results.length, 2)
  assert.ok(receipt.results.every((result) => /connection unavailable/.test(result.error)))
})
test('successful reviews preserve scoring rules and interaction prompt context', async () => {
  const prompts = []
  const receipt = await gate.evaluatePersonaGate(
    [chef, client],
    [chef, client],
    'existing-local-model',
    context,
    {
      requestTimeoutMs: 20,
      fetch: async (_url, options) => {
        prompts.push(JSON.parse(options.body).prompt)
        return response()
      },
    }
  )
  assert.equal(receipt.status, 'PASS')
  assert.equal(receipt.results.length, 3)
  assert.ok(receipt.results.every((result) => result.ok === true))
  assert.ok(prompts[2].includes('Cross-role ChefFlow handoff stress scenario'))
  const blocked = await gate.runAnalyzer(chef, 'existing-local-model', context, {
    requestTimeoutMs: 20,
    fetch: async () =>
      response({
        pass: true,
        score: 90,
        blocking_gaps: ['Synthetic blocking gap'],
        risks: [],
        reason: 'Blocked',
      }),
  })
  assert.equal(blocked.ok, false)
})
test('overall budget exhaustion retains failed evidence for remaining selected scenarios', async () => {
  const receipt = await bounded(
    gate.evaluatePersonaGate([chef, client], [chef, client], 'existing-local-model', context, {
      requestTimeoutMs: 10,
      gateTimeoutMs: 15,
      fetch: async () => new Promise(() => {}),
    })
  )
  assert.equal(receipt.status, 'FAIL')
  assert.equal(receipt.results.length, 3)
  assert.ok(receipt.results.every((result) => result.ok === false))
  assert.ok(receipt.results.some((result) => /budget exhausted/i.test(result.error)))
})
test('deadline configuration cannot exceed the request or gate ceiling', async () => {
  for (const limits of [
    { requestTimeoutMs: 90000 },
    { gateTimeoutMs: 400000 },
    { requestTimeoutMs: 0 },
    { gateTimeoutMs: 0 },
  ]) {
    let calls = 0
    const receipt = await gate.evaluatePersonaGate([chef], [], 'existing-local-model', context, {
      ...limits,
      fetch: async () => {
        calls++
        return response()
      },
    })
    assert.equal(receipt.status, 'FAIL')
    assert.equal(calls, 0)
    assert.match(receipt.results[0].error, /deadline|budget|timeout/i)
  }
})
test('unavailable evaluations persist FAIL evidence in receipt, latest and coverage ledger', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'chefflow-persona-deadline-'))
  try {
    const evaluation = await gate.evaluatePersonaGate([chef], [], 'synthetic-test-model', context, {
      requestTimeoutMs: 10,
      fetch: async () => ({ ok: false, status: 503 }),
    })
    const payload = { generated_at: '2026-10-01T00:00:00.000Z', ...evaluation }
    gate.writeReceipt(payload, { directory })
    const receiptFile = readdirSync(directory).find((name) => name.startsWith('gate-'))
    assert.ok(receiptFile)
    for (const file of [receiptFile, 'latest.json', 'coverage-ledger.jsonl']) {
      const persisted = JSON.parse(readFileSync(join(directory, file), 'utf8'))
      assert.equal(persisted.status, 'FAIL')
      assert.equal(persisted.results[0].ok, false)
      assert.match(persisted.results[0].error, /Ollama HTTP 503/)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
