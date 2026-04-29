import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PUBLIC_CLOUD_PRIVATE_DETAIL_MESSAGE,
  assertPublicCloudAiAllowed,
} from '@/lib/ai/public-cloud-policy'
import { trySurfaceInstantAnswer } from '@/app/api/remy/surface-runtime-utils'

const ROOT = join(__dirname, '..', '..')

describe('public cloud AI policy', () => {
  it('allows the platform landing concierge with public-only context', () => {
    const result = assertPublicCloudAiAllowed({
      taskId: 'landing_concierge',
      surface: 'public_landing',
      message: 'How does ChefFlow help with payments?',
    })

    assert.equal(result.allowed, true)
  })

  it('allows the chef public concierge only with public context', () => {
    const result = assertPublicCloudAiAllowed({
      taskId: 'chef_public_concierge',
      surface: 'public_chef_profile',
      message: 'What services does this chef offer?',
      publicContext: { businessName: 'Harbor Hearth' },
    })

    assert.equal(result.allowed, true)
  })

  it('blocks unsupported tasks and surface mismatches', () => {
    assert.deepEqual(
      assertPublicCloudAiAllowed({
        taskId: 'private_parse',
        surface: 'public_landing',
        message: 'Parse this inquiry',
      }).allowed,
      false
    )

    const mismatch = assertPublicCloudAiAllowed({
      taskId: 'landing_concierge',
      surface: 'public_chef_profile',
      message: 'How does ChefFlow work?',
    })
    assert.equal(mismatch.allowed, false)
    if (!mismatch.allowed) assert.equal(mismatch.reason, 'surface_mismatch')
  })

  it('blocks authenticated and private context', () => {
    const auth = assertPublicCloudAiAllowed({
      taskId: 'landing_concierge',
      surface: 'public_landing',
      message: 'How does ChefFlow work?',
      authenticatedUserId: 'user_123',
    })
    assert.equal(auth.allowed, false)
    if (!auth.allowed) assert.equal(auth.reason, 'authenticated_context')

    const privateContext = assertPublicCloudAiAllowed({
      taskId: 'landing_concierge',
      surface: 'public_landing',
      message: 'How does ChefFlow work?',
      tenantPrivateContext: { eventId: 'evt_123' },
    })
    assert.equal(privateContext.allowed, false)
    if (!privateContext.allowed) assert.equal(privateContext.reason, 'private_context')
  })

  it('blocks private details before provider calls', () => {
    const cases = [
      'Email me at client@example.com',
      'Call me at 555-555-1212',
      'My address is 123 Main St',
      'The quote is $2,500',
      'My wife is allergic to peanuts',
      'Here is my contract',
    ]

    for (const message of cases) {
      const result = assertPublicCloudAiAllowed({
        taskId: 'landing_concierge',
        surface: 'public_landing',
        message,
      })
      assert.equal(result.allowed, false, message)
      if (!result.allowed) {
        assert.equal(result.reason, 'private_signal')
        assert.equal(result.publicMessage, PUBLIC_CLOUD_PRIVATE_DETAIL_MESSAGE)
      }
    }
  })

  it('blocks private details replayed through history', () => {
    const result = assertPublicCloudAiAllowed({
      taskId: 'landing_concierge',
      surface: 'public_landing',
      message: 'Can you keep helping?',
      history: [{ role: 'user', content: 'My email is client@example.com' }],
    })

    assert.equal(result.allowed, false)
    if (!result.allowed) assert.equal(result.reason, 'private_signal')
  })

  it('blocks recipe generation but not recipe search wording', () => {
    const blocked = assertPublicCloudAiAllowed({
      taskId: 'landing_concierge',
      surface: 'public_landing',
      message: 'Give me a recipe for vegan pasta',
    })
    assert.equal(blocked.allowed, false)
    if (!blocked.allowed) assert.equal(blocked.reason, 'recipe_generation')

    const allowed = assertPublicCloudAiAllowed({
      taskId: 'landing_concierge',
      surface: 'public_landing',
      message: 'Can ChefFlow search recipes in my own recipe book?',
    })
    assert.equal(allowed.allowed, true)
  })

  it('adds deterministic instant answers for common public questions', () => {
    const pricing = trySurfaceInstantAnswer('landing', 'How much does ChefFlow cost?')
    assert.ok(pricing)
    assert.match(pricing.text, /starts free/)

    const booking = trySurfaceInstantAnswer('public', 'Can I book this chef?', {
      businessName: 'Harbor Hearth',
    })
    assert.ok(booking)
    assert.match(booking.text, /inquiry form/)
  })

  it('keeps private runtime code from importing the public gateway', () => {
    const parseOllama = readFileSync(join(ROOT, 'lib/ai/parse-ollama.ts'), 'utf8')
    const chefRoute = readFileSync(join(ROOT, 'app/api/remy/stream/route.ts'), 'utf8')
    const clientRoute = readFileSync(join(ROOT, 'app/api/remy/client/route.ts'), 'utf8')

    assert.doesNotMatch(parseOllama, /public-cloud-gateway/)
    assert.doesNotMatch(chefRoute, /public-cloud-gateway/)
    assert.doesNotMatch(clientRoute, /public-cloud-gateway/)
  })
})
