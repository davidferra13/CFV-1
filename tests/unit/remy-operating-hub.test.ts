import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)

const {
  buildRemyOperatingHub,
  classifyInboxMessage,
  deriveVoiceMemoDraftCards,
} = require('../../lib/remy/operating-hub.ts')

const nowIso = '2026-05-15T23:00:00.000Z'

test('Remy operating hub builds briefing from real tenant-scoped input only', () => {
  const hub = buildRemyOperatingHub({
    nowIso,
    upcomingEvents: [
      {
        id: 'event-1',
        title: 'Maya tasting',
        event_date: '2026-05-16T18:00:00.000Z',
        guest_count: 10,
        status: 'confirmed',
      },
    ],
    completedEvents: [],
    overdueTasks: [
      { id: 'task-1', title: 'Send rental order', due_date: '2026-05-14T12:00:00.000Z' },
    ],
    unreadInbox: [],
    pendingQuotes: [],
    openInquiries: [],
    memories: [],
    auditEntries: [],
    policyRows: [],
    searchRows: [],
    dataAvailability: [{ source: 'events', available: true, note: 'loaded' }],
  })

  assert.equal(hub.briefing.length, 2)
  assert.equal(hub.briefing[0].urgency, 'critical')
  assert.equal(hub.briefing[0].sources[0].recordType, 'event')
  assert.match(hub.briefing[0].detail, /10 guests/)
  assert.equal(hub.workload.score > 0, true)
})

test('inbox triage flags safety, payment, and status terms as deterministic decision needed', () => {
  const result = classifyInboxMessage(
    'Menu update',
    'Client has a shellfish allergy and needs deposit refund terms.'
  )

  assert.equal(result.label, 'Decision needed')
  assert.equal(result.urgency, 'critical')
  assert.equal(result.confidence, 'deterministic')
  assert.match(result.confidenceLabel, /Keyword match/)
})

test('voice memo intake returns draft-only cards and gates risky categories', () => {
  const cards = deriveVoiceMemoDraftCards(
    'Remember that Maya is allergic to shellfish. Draft a follow up about the deposit.'
  )

  assert.equal(cards.length, 2)
  assert.equal(cards[0].status, 'draft')
  assert.equal(cards[0].sensitivity, 'safety')
  assert.equal(cards[0].confidence, 'needs_review')
  assert.equal(cards[1].sensitivity, 'payment')
})

test('insufficient pattern sample does not invent insights', () => {
  const hub = buildRemyOperatingHub({
    nowIso,
    upcomingEvents: [
      { id: 'event-1', title: 'Small dinner', event_date: '2026-05-20T18:00:00.000Z' },
    ],
    completedEvents: [],
    overdueTasks: [],
    unreadInbox: [],
    pendingQuotes: [],
    openInquiries: [],
    memories: [],
    auditEntries: [],
    policyRows: [],
    searchRows: [],
    dataAvailability: [],
  })

  assert.deepEqual(hub.patterns, [])
  assert.equal(hub.workload.level, 'open')
})

test('source ledger minimizes raw source data and labels inference sources', () => {
  const hub = buildRemyOperatingHub({
    nowIso,
    upcomingEvents: [],
    completedEvents: [],
    overdueTasks: [],
    unreadInbox: [],
    pendingQuotes: [],
    openInquiries: [],
    memories: [],
    auditEntries: [],
    policyRows: [],
    searchRows: [],
    dataAvailability: [],
  })

  assert.ok(hub.safety.escalationRules.length >= 1)
  assert.equal(hub.safety.escalationRules[0].sources[0].status, 'inference')
  assert.doesNotMatch(hub.safety.escalationRules[0].detail, /system prompt/i)
})

test('Remy operating server actions require chef auth before db access', () => {
  const source = readFileSync('lib/remy/operating-hub-actions.ts', 'utf8')
  const exportedFunctions = [
    'loadRemyOperatingHub',
    'addRemyDecisionMemoryAction',
    'updateRemyDecisionMemoryAction',
    'archiveRemyDecisionMemoryAction',
  ]

  for (const name of exportedFunctions) {
    const start = source.indexOf(`export async function ${name}`)
    assert.notEqual(start, -1, `${name} should exist`)
    const nextExport = source.indexOf('export async function', start + 1)
    const body = source.slice(start, nextExport === -1 ? source.length : nextExport)
    const requireIndex = body.indexOf('await requireChef()')
    const dbIndex = body.indexOf('createServerClient()')

    assert.ok(requireIndex >= 0, `${name} should call requireChef`)
    assert.ok(
      dbIndex === -1 || requireIndex < dbIndex,
      `${name} should authenticate before creating db client`
    )
  }
})
