import assert from 'node:assert/strict'
import test from 'node:test'
import { formatClientContext, type RemyClientContext } from '@/lib/ai/remy-client-context'
import { summarizeRemyClientContextSourceLabels } from '@/lib/ai/remy-client-context-policy'

function createContext(overrides: Partial<RemyClientContext> = {}): RemyClientContext {
  return {
    clientName: 'Jordan Client',
    chefName: 'Chef Avery',
    businessName: 'Avery Table',
    upcomingEvents: [],
    pastEvents: [],
    pendingQuotes: [],
    dietaryRestrictions: null,
    allergies: null,
    openInquiries: 0,
    loyaltyTier: 'bronze',
    loyaltyPointsBalance: 0,
    loyaltyLifetimePoints: 0,
    nextTierName: 'silver',
    pointsToNextTier: 100,
    contextSourceLabels: ['Client profile', 'Client work graph'],
    actionableItemCount: 0,
    continuitySummary: {
      generatedAt: '2026-04-29T12:00:00.000Z',
      caughtUp: true,
      headline: 'Caught up',
      detail: 'No client action is currently needed.',
      primaryNextStep: null,
      importantItems: [],
      counts: [],
      workGraphSummary: { totalItems: 0 },
    } as RemyClientContext['continuitySummary'],
    workGraph: { items: [], summary: { totalItems: 0 } } as RemyClientContext['workGraph'],
    workItems: [],
    ...overrides,
  }
}

test('client Remy context includes explicit source labels in the prompt block', () => {
  const prompt = formatClientContext(createContext())

  assert.match(prompt, /Context sources:/)
  assert.match(prompt, /Client profile/)
  assert.match(prompt, /Client work graph/)
})

test('client Remy source labels only summarize allowed client context categories', () => {
  const labels = summarizeRemyClientContextSourceLabels([
    'profile',
    'work_graph',
    'private_chef_notes',
    'admin_audit',
  ])

  assert.deepEqual(labels, ['Client profile', 'Client work graph'])
})
