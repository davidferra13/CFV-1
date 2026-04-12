import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { parseRemyConversationSummaryDocument } = require('../../lib/ai/mempalace-bridge.ts')
const {
  buildRemySystemPrompt,
  determineContextScope,
} = require('../../app/api/remy/stream/route-prompt-utils.ts')
const {
  getOperatorResponseTokenBudget,
} = require('../../app/api/remy/stream/route-runtime-utils.ts')
const { REMY_PERSONALITY } = require('../../lib/ai/remy-personality.ts')
const { DEFAULT_ARCHETYPE } = require('../../lib/ai/remy-archetypes.ts')

function makeBaseContext() {
  return {
    businessName: 'ChefFlow Test Kitchen',
    tagline: null,
    clientCount: 0,
    upcomingEventCount: 0,
    openInquiryCount: 0,
    upcomingEvents: [],
    recentClients: [],
    activeGoals: [],
    activeTodos: [],
    upcomingCalls: [],
    recentArtifacts: [],
    recentAARInsights: [],
    pendingMenuApprovals: [],
    unreadInquiryMessages: [],
    upcomingPaymentDeadlines: [],
    expiringQuotes: [],
    staleInquiries: [],
    overduePayments: [],
    clientReengagement: [],
    expenseBreakdown: [],
    serviceStyles: [],
    referralSources: [],
    currentPage: null,
    mentionedEntities: [],
  }
}

test('parseRemyConversationSummaryDocument extracts summary metadata from persisted drawer text', () => {
  const parsed = parseRemyConversationSummaryDocument(`Remy conversation (14 messages)
Mrs. Chen prefers low-acid menus and earlier dinners.
Topics: follow-up, dinner planning, low-acid menu
People/things: Mrs. Chen, Tuesday dinner`)

  assert.deepEqual(parsed, {
    summary: 'Mrs. Chen prefers low-acid menus and earlier dinners.',
    topics: ['follow-up', 'dinner planning', 'low-acid menu'],
    entities: ['Mrs. Chen', 'Tuesday dinner'],
    messageCount: 14,
  })
})

test('buildRemySystemPrompt renders relevant prior conversations when summaries are provided', () => {
  const prompt = buildRemySystemPrompt(
    makeBaseContext(),
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
    'What did we decide for Mrs. Chen?',
    undefined,
    [
      {
        summary: 'Mrs. Chen prefers low-acid menus and earlier dinners.',
        generatedAt: new Date().toISOString(),
      },
    ]
  )

  assert.match(prompt, /RELEVANT PRIOR CONVERSATIONS:/)
  assert.match(prompt, /Mrs\. Chen prefers low-acid menus and earlier dinners\./)
})

test('Remy prompt now biases toward concise, answer-first responses', () => {
  assert.match(REMY_PERSONALITY, /Default to the shortest useful answer\./)

  const prompt = buildRemySystemPrompt(
    makeBaseContext(),
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
    'Am I free Saturday?',
    undefined,
    null
  )

  assert.match(prompt, /Default to the shortest useful answer\./)
  assert.match(prompt, /Use one of these default shapes only:/)
  assert.match(
    prompt,
    /Very short question - answer in 1 sentence when possible\. Only add a second sentence if it changes the outcome\./
  )
})

test('Remy defaults to the calmer classic archetype', () => {
  assert.equal(DEFAULT_ARCHETYPE, 'classic')
})

test('determineContextScope routes narrow, focused, and strategic messages differently', () => {
  assert.equal(determineContextScope('Where do I add staff?', 'command'), 'minimal')
  assert.equal(determineContextScope('Tell me about the Johnson family', 'question'), 'focused')
  assert.equal(determineContextScope('Am I charging enough?', 'question'), 'full')
})

test('operator response token budgets shrink for narrow questions and expand for strategic ones', () => {
  assert.equal(getOperatorResponseTokenBudget('minimal', 'question'), 120)
  assert.equal(getOperatorResponseTokenBudget('focused', 'question'), 220)
  assert.equal(getOperatorResponseTokenBudget('full', 'question'), 420)
  assert.equal(getOperatorResponseTokenBudget('minimal', 'mixed'), 160)
  assert.equal(getOperatorResponseTokenBudget('full', 'mixed'), 520)
})

test('minimal prompt scope omits heavy analytics while full scope keeps them', () => {
  const context = {
    ...makeBaseContext(),
    yearlyStats: {
      yearRevenueCents: 1200000,
      yearExpenseCents: 400000,
      totalEventsThisYear: 10,
      completedEventsThisYear: 8,
      avgEventRevenueCents: 150000,
      topClients: [],
    },
    profitabilityStats: {
      eventCount: 6,
      avgMargin: 54,
      bestMargin: 68,
      worstMargin: 31,
      avgProfitCents: 82000,
    },
    businessIntelligence: 'Margins are stable and repeat bookings are carrying the quarter.',
  }

  const minimalPrompt = buildRemySystemPrompt(
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
    'Where do I add staff?',
    'minimal',
    null
  )

  const fullPrompt = buildRemySystemPrompt(
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
    'Am I charging enough?',
    'full',
    null
  )

  assert.equal(minimalPrompt.includes('YEAR-TO-DATE STATS:'), false)
  assert.equal(minimalPrompt.includes('PROFITABILITY INTELLIGENCE'), false)
  assert.equal(minimalPrompt.includes('BUSINESS INTELLIGENCE'), false)

  assert.equal(fullPrompt.includes('YEAR-TO-DATE STATS:'), true)
  assert.equal(fullPrompt.includes('PROFITABILITY INTELLIGENCE'), true)
  assert.equal(fullPrompt.includes('BUSINESS INTELLIGENCE'), true)
})
