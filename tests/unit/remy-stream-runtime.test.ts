import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const require = createRequire(import.meta.url)

const { buildGreetingFastPath } = require('../../app/api/remy/stream/route-runtime-utils.ts')
const { buildRemySystemPrompt } = require('../../app/api/remy/stream/route-prompt-utils.ts')
const { tryInstantAnswer } = require('../../app/api/remy/stream/route-instant-answers.ts')
const { parseRemyStream } = require('../../lib/ai/remy-stream-parser.ts')

test('greeting fast path stays deterministic and context-free', () => {
  const text = buildGreetingFastPath(new Date('2026-04-09T09:00:00-04:00'))

  assert.match(text, /^Morning, chef!/)
  assert.match(
    text,
    /Ask me about events, clients, menus, costs, drafts, or what needs attention today\./
  )
})

test('greeting fast path uses chef timezone when provided', () => {
  const text = buildGreetingFastPath({
    now: '2026-04-09T14:00:00.000Z',
    chefTimezone: 'America/Los_Angeles',
  })

  assert.match(text, /^Morning, chef!/)
})

test('new-user curated greeting is checked before greeting fast path', () => {
  const routePath = path.join(process.cwd(), 'app/api/remy/stream/route.ts')
  const source = fs.readFileSync(routePath, 'utf8')

  const curatedIndex = source.indexOf('getCuratedStreamGreeting')
  const fastGreetingIndex = source.indexOf('buildGreetingFastPath({ chefTimezone })')

  assert.ok(curatedIndex > -1)
  assert.match(source, /loadRemyFastPathTimezone/)
  assert.ok(fastGreetingIndex > -1)
  assert.ok(curatedIndex < fastGreetingIndex)
})

test('quick replies serialize through the shared SSE parser', async () => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          [
            'data: {"type":"token","data":"Welcome"}',
            '',
            'data: {"type":"quick_replies","data":["Give me the tour","I\'ll figure it out"]}',
            '',
            'data: {"type":"done","data":null}',
            '',
          ].join('\n')
        )
      )
      controller.close()
    },
  })

  let replies: string[] = []
  const result = await parseRemyStream(stream.getReader(), {
    onToken() {},
    onQuickReplies(next: string[]) {
      replies = next
    },
  })

  assert.equal(result.fullContent, 'Welcome')
  assert.deepEqual(result.quickReplies, ['Give me the tour', "I'll figure it out"])
  assert.deepEqual(replies, ['Give me the tour', "I'll figure it out"])
})

test('stream prompt includes dynamic personality block and context health', () => {
  const context = {
    chefName: 'Chef',
    businessName: 'Test Kitchen',
    tagline: null,
    chefCity: null,
    chefState: null,
    chefArchetype: null,
    clientCount: 0,
    upcomingEventCount: 0,
    openInquiryCount: 0,
    contextHealth: {
      degraded: true,
      failedOperations: ['load_email_digest', 'load_price_context'],
    },
  }

  const prompt = buildRemySystemPrompt(
    context,
    [],
    undefined,
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    null,
    null,
    'How is my inbox?',
    'focused',
    null,
    false,
    'TONE ADJUSTMENT: This chef is brand new.'
  )

  assert.match(prompt, /TONE ADJUSTMENT: This chef is brand new\./)
  assert.match(prompt, /CONTEXT HEALTH: Some business context failed to load/)
  assert.match(prompt, /load_email_digest, load_price_context/)
})

test('Remy answers event readiness from completion context', () => {
  const answer = tryInstantAnswer('is this event ready?', {
    chefName: 'Chef',
    businessName: 'Test Kitchen',
    tagline: null,
    chefCity: null,
    chefState: null,
    chefArchetype: null,
    clientCount: 0,
    upcomingEventCount: 1,
    openInquiryCount: 0,
    pageEntity: {
      type: 'event',
      summary: 'EVENT: Henderson dinner',
      completion: {
        status: 'partial',
        score: 72,
        missingRequirements: [
          {
            key: 'menu',
            label: 'Menu complete',
            category: 'culinary',
            actionUrl: '/events/event-1/menu',
          },
        ],
        blockingRequirements: [
          {
            key: 'allergies',
            label: 'Client allergies confirmed',
            category: 'safety',
            actionUrl: '/events/event-1',
          },
        ],
        nextAction: {
          label: 'Confirm allergies',
          url: '/events/event-1',
        },
      },
    },
  })

  assert.ok(answer)
  assert.match(answer.text, /Completion Contract/)
  assert.match(answer.text, /72\/100/)
  assert.match(answer.text, /Client allergies confirmed/)
  assert.equal(answer.navSuggestions?.[0]?.href, '/events/event-1')
})

test('Remy answers mentioned event readiness from completion context', () => {
  const answer = tryInstantAnswer('why is the Henderson dinner blocked?', {
    chefName: 'Chef',
    businessName: 'Test Kitchen',
    tagline: null,
    chefCity: null,
    chefState: null,
    chefArchetype: null,
    clientCount: 0,
    upcomingEventCount: 1,
    openInquiryCount: 0,
    mentionedEntities: [
      {
        type: 'event',
        summary: 'EVENT: Henderson dinner',
        completion: {
          status: 'partial',
          score: 80,
          missingRequirements: [],
          blockingRequirements: [
            {
              key: 'deposit',
              label: 'Deposit paid',
              category: 'financial',
            },
          ],
          nextAction: null,
        },
      },
    ],
  })

  assert.ok(answer)
  assert.match(answer.text, /Deposit paid/)
})

test('local AI context route uses the same dynamic personality helper', () => {
  const routePath = path.join(process.cwd(), 'app/api/remy/context/route.ts')
  const source = fs.readFileSync(routePath, 'utf8')

  assert.match(source, /buildStreamDynamicPersonalityBlock/)
  assert.match(source, /dynamicPersonalityBlock/)
  assert.match(source, /getCuratedStreamGreeting/)
})

test('Remy quality harness uses Auth.js agent sign-in helper', () => {
  const harnessPath = path.join(process.cwd(), 'tests/remy-quality/harness/remy-quality-runner.mjs')
  const source = fs.readFileSync(harnessPath, 'utf8')

  assert.match(source, /signInAgent/)
  assert.doesNotMatch(source, /createClient/)
})
