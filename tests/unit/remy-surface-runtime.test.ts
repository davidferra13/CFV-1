import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const {
  getSurfaceRuntimeOptions,
  trySurfaceInstantAnswer,
} = require('../../app/api/remy/surface-runtime-utils.ts')
const { buildLandingSystemPrompt } = require('../../lib/ai/remy-landing-personality.ts')

test('landing fast path answers hey without model work', () => {
  const result = trySurfaceInstantAnswer('landing', 'hey')

  assert.ok(result)
  assert.match(result.text, /^Hey\./)
  assert.match(result.text, /ChefFlow does/)
})

test('public fast path uses chef context for greetings', () => {
  const result = trySurfaceInstantAnswer('public', 'hello', {
    businessName: 'North Fork Suppers',
    serviceArea: 'Hudson Valley, NY',
    serviceTypes: ['Private dinners', 'Events'],
    dietaryCapabilities: ['Gluten-free', 'Vegan'],
  })

  assert.ok(result)
  assert.match(result.text, /North Fork Suppers/)
  assert.match(result.text, /Hudson Valley, NY/)
})

test('client fast path uses client event context for greetings', () => {
  const result = trySurfaceInstantAnswer('client', 'hey', {
    clientName: 'Sofia Martinez',
    upcomingEventCount: 1,
    pendingQuoteCount: 0,
  })

  assert.ok(result)
  assert.match(result.text, /Hey, Sofia\./)
  assert.match(result.text, /1 upcoming event/)
})

test('surface runtime options shrink trivial prompts and expand strategic ones', () => {
  const greeting = getSurfaceRuntimeOptions('hey')
  const strategy = getSurfaceRuntimeOptions('How does ChefFlow help with pricing and margins?')

  assert.equal(greeting.contextScope, 'minimal')
  assert.equal(greeting.tokenBudget, 120)
  assert.equal(strategy.contextScope, 'full')
  assert.equal(strategy.tokenBudget, 420)
})

test('landing prompt contract is operator-style and concise', () => {
  const prompt = buildLandingSystemPrompt()

  assert.match(prompt, /Default to the shortest useful answer\./)
  assert.match(prompt, /Answer in the first line\./)
  assert.match(prompt, /Use 1 short paragraph or up to 3 bullets by default\./)
})
