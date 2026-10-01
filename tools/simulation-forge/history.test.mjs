import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { main } from './history-cli.mjs'
import {
  compileHistory,
  historyScenario,
  historyAdapter,
  replayHistory,
  branchHistory,
  importGmailThreads,
  importReferenceFixtures,
  replayHistoryThroughForge,
  sourceTimestamp,
} from './history.mjs'

const message = (id, at, text, role = 'client', extra = {}) => ({
  id,
  at,
  text,
  role,
  channel: 'email',
  ...extra,
})
const input = (messages, extra = {}) => ({
  id: 'sample',
  engagement: 'sample-engagement',
  messages,
  coverage: {
    email: 'selected_threads',
    sms: 'not_imported',
    calls: 'not_imported',
    attachments: 'not_reviewed',
  },
  ...extra,
})

test('sorts and deduplicates sources, excludes unsent drafts and preserves missing bodies', () => {
  const a = message('a', '2020-01-01T00:00:00Z', 'six guests')
  const c = compileHistory(
    input([
      message('b', '2020-01-02T00:00:00Z', ''),
      a,
      a,
      message('draft', '2020-01-03T00:00:00Z', 'great dinner', 'chef', { draft: true }),
    ])
  )
  assert.deepEqual(
    c.events.map((e) => e.sourceId),
    ['a', 'b']
  )
  assert.equal(c.events[1].bodyStatus, 'unavailable')
  assert.equal(c.exclusions.drafts, 1)
  assert.equal(c.exclusions.duplicates, 1)
  assert.equal(c.coverage.sms, 'not_imported')
})

test('rejects ambiguous duplicate evidence and invalid clocks', () => {
  assert.throws(() => compileHistory(input([message('a', 'yesterday', 'hi')])), /timestamp/)
  assert.throws(
    () =>
      compileHistory(input([message('a', '2020-01-01', 'one'), message('a', '2020-01-01', 'two')])),
    /conflicting/
  )
})

test('removes quoted chains and scrubs contact and bearer secrets from replay input', () => {
  const c = compileHistory(
    input([
      message(
        'a',
        '2020-01-01',
        'Call +12025550123 or 917-555-0123. a@example.com\nhttps://example.com/private/secret-token?token=abc\n On Friday someone wrote:\n> old facts'
      ),
    ])
  )
  assert.doesNotMatch(
    JSON.stringify(c),
    /2025550123|917-555-0123|a@example.com|secret-token|token=abc|old facts/
  )
  assert.match(c.events[0].text, /contact withheld/)
})

test('replay never supplies future facts or historical outcomes to a participant', async () => {
  const c = compileHistory(
    input(
      [message('a', '2020-01-01', 'six guests'), message('b', '2020-01-03', 'now eight guests')],
      { outcome: 'wonderful' }
    )
  )
  const seen = []
  const r = await replayHistory(c, {
    version: 'probe',
    step: async (view) => {
      seen.push(view)
      return { action: 'observe' }
    },
  })
  assert.equal(seen[0].history.length, 1)
  assert.doesNotMatch(JSON.stringify(seen[0]), /eight|wonderful/)
  assert.equal(seen[1].history.length, 2)
  assert.equal(r.steps.length, 2)
  assert.equal(r.productBehaviorVerified, false)
})

test('findings remain sourced statements rather than invented feelings or settled finance', async () => {
  const c = compileHistory(
    input([
      message('a', '2020-01-01', 'I sent a $20 test payment.'),
      message('b', '2020-01-02', 'The links do not appear to work; we get a redirect notice.'),
      message('c', '2020-01-03', "The guests check out Sunday morning so the schedule won't work."),
    ])
  )
  const r = await replayHistory(c)
  assert.ok(r.findings.some((f) => f.kind === 'link_failure_reported' && f.sourceIds.includes('b')))
  assert.ok(r.findings.some((f) => f.kind === 'schedule_mismatch_reported'))
  assert.equal(r.financialVerification, 'not_performed')
  assert.equal(r.modelTrainingPerformed, false)
  assert.ok(r.findings.every((f) => f.authority === 'statement_in_source'))
})

test('a branch preserves the known prefix and removes all later historical messages', () => {
  const c = compileHistory(
    input([
      message('a', '2020-01-01', 'six guests'),
      message('b', '2020-01-02', 'paid'),
      message('c', '2020-01-03', 'thanks'),
    ])
  )
  const b = branchHistory(c, 'a', [message('new', '2020-01-02', 'now ten guests')])
  assert.deepEqual(
    b.events.map((e) => e.sourceId),
    ['a', 'new']
  )
  assert.equal(b.provenance.kind, 'inferred')
  assert.equal(b.events[1].evidenceKind, 'counterfactual')
  assert.throws(
    () => branchHistory(c, 'a', [message('new', '2019-01-01', 'bad clock')]),
    /branch timestamp/
  )
})

test('the existing Forge adapter retains original message clocks and only observed history', async () => {
  const c = compileHistory(
    input([
      message('a', '2016-02-03T12:00:00Z', 'inquiry'),
      message('b', '2016-02-07T12:00:00Z', 'menu change'),
    ])
  )
  const s = historyScenario(c)
  const adapter = historyAdapter()
  let state = s.initialState
  for (const event of s.events) state = (await adapter.step(state, event)).state
  assert.equal(state.at, '2016-02-07T12:00:00.000Z')
  assert.equal(s.environment.at, '2016-02-03T12:00:00.000Z')
  assert.equal(adapter.evaluate(state, s).scores.productBehaviorVerified, 0)
})

test('Gmail import handles HTML-only mail, attachments, drafts and form telemetry', () => {
  const gmailMessage = (id, payload, labels = []) => ({
    id,
    internal_date: '1454491200000',
    payload,
    label_ids: labels,
  })
  const from = [{ name: 'From', value: 'owner@example.invalid' }]
  const c = importGmailThreads(
    [
      {
        id: 'form',
        messages: [
          gmailMessage('a', {
            headers: from,
            mime_type: 'text/plain',
            body: { content: 'Allergies: gluten\nPre-inquiry journey\nIntent: high intent' },
          }),
        ],
      },
      {
        id: 'email',
        messages: [
          gmailMessage('b', {
            headers: [{ name: 'From', value: 'guest@example.invalid' }],
            parts: [
              {
                mime_type: 'text/html',
                body: { content: '<div>Links do not work</div><blockquote>old text</blockquote>' },
              },
              { filename: 'agreement.pdf' },
            ],
          }),
          gmailMessage(
            'draft',
            { headers: from, mime_type: 'text/plain', body: { content: 'great dinner' } },
            ['DRAFT']
          ),
        ],
      },
    ],
    {
      id: 'gmail-case',
      engagement: 'one-dinner',
      ownerEmail: 'owner@example.invalid',
      formThreadIds: ['form'],
    }
  )
  assert.equal(c.events.length, 2)
  assert.equal(c.events[0].role, 'intake_relay')
  assert.doesNotMatch(JSON.stringify(c), /high intent|old text|guest@example/)
  assert.equal(c.events[1].attachmentCount, 1)
  assert.equal(c.events[1].bodyStatus, 'available')
})

test('unresponsive adapters are bounded and do not produce a success report', async () => {
  const c = compileHistory(input([message('a', '2020-01-01', 'hi')]))
  await assert.rejects(
    replayHistory(c, { version: 'never', step: () => new Promise(() => {}) }, { maxMs: 10 }),
    /time budget/
  )
})

test('reference fixtures converge on canonical cases and quarantine unknown source dates', () => {
  const source = {
    generated_at: '2026-10-01T12:00:00Z',
    fixtures: [
      {
        message_id: 'source-one',
        thread_id: 'thread-one',
        date: '2021-06-05T12:00:00Z',
        body: 'private archived text',
        from_email: 'hidden@example.invalid',
        from_name: 'Hidden Name',
        expected_category: 'outbound',
      },
      {
        message_id: 'source-two',
        thread_id: 'thread-one',
        date: '2026-01-23T12:00:00Z',
        body: 'private later text',
      },
      { message_id: 'source-undated', body: 'undated private text', platform: 'takeachef' },
    ],
  }
  const out = importReferenceFixtures(source, { id: 'observed-reference-archive' })
  assert.equal(out.cases.length, 1)
  assert.equal(out.cases[0].events.length, 2)
  assert.equal(out.cases[0].provenance.kind, 'observed')
  assert.equal(out.cases[0].events[0].role, 'counterparty')
  assert.equal(out.cases[0].events[0].bodyStatus, 'withheld')
  assert.equal(out.coverage.recordsSeen, 3)
  assert.equal(out.coverage.datedRecords, 2)
  assert.equal(out.coverage.bodiesPresent, 3)
  assert.equal(out.coverage.bodiesImported, 0)
  assert.deepEqual(
    out.coverage.uncoveredRequestedYears,
    [2016, 2017, 2018, 2019, 2020, 2022, 2023, 2024, 2025]
  )
  assert.equal(out.quarantined[0].reason, 'unknown_source_timestamp')
  assert.doesNotMatch(
    JSON.stringify(out),
    /private archived|private later|undated private|hidden@example|Hidden Name/
  )
  assert.match(out.cases[0].events[0].source.contentHash, /^[a-f0-9]{64}$/)
})

test('canonical Forge history replay processes bounded chunks without losing the prefix', async () => {
  const c = compileHistory(
    input(
      Array.from({ length: 31 }, (_, index) =>
        message(
          `source-${index}`,
          new Date(Date.UTC(2016, 0, index + 1)).toISOString(),
          `known record ${index}`
        )
      )
    )
  )
  const out = await replayHistoryThroughForge(c, {
    maxBatchEvents: 5,
    maxMs: 3000,
    budget: { minFreeRamBytes: 0 },
  })
  assert.equal(out.recordsReplayed, 31)
  assert.equal(out.forgeRunIds.length, 7)
  assert.equal(out.productBehaviorVerified, false)
  assert.deepEqual(out.historicalRange, [c.events[0].at, c.events.at(-1).at])
  assert.ok(out.batchEvents.every((count) => count <= 5))
  assert.equal(out.bodyGaps.length, 0)
  assert.equal(out.violations.length, 0)
  assert.equal(out.steps.length, 31)
  assert.equal(out.forgeScores.recordsReplayed, 31)
})

test('canonical source clock accepts old API dates but requires precise clocks for workflow facts', () => {
  assert.equal(sourceTimestamp('2020-01-01'), '2020-01-01T00:00:00.000Z')
  assert.throws(() => sourceTimestamp('2020-01-01', { requireTimezone: true }), /timestamp/)
  assert.throws(
    () => sourceTimestamp('2016-02-31T12:00:00Z', { requireTimezone: true }),
    /timestamp/
  )
  assert.equal(
    sourceTimestamp('2016-02-03T12:00:00Z', { requireTimezone: true }),
    '2016-02-03T12:00:00.000Z'
  )
})

test('one canonical CLI imports reference records and retains legacy replay and branch commands', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'canonical-history-cli-'))
  const sourcePath = join(directory, 'source.json'),
    casesPath = join(directory, 'cases.json')
  const receiptPath = join(directory, 'receipt.json'),
    branchPath = join(directory, 'branch-input.json')
  const branchedPath = join(directory, 'branched.json')
  await writeFile(
    sourcePath,
    JSON.stringify({
      fixtures: [
        {
          message_id: 'first',
          thread_id: 'thread-one',
          date: '2021-01-01T00:00:00Z',
          body: 'withheld source content',
        },
        {
          message_id: 'second',
          thread_id: 'thread-one',
          date: '2021-01-02T00:00:00Z',
          body: 'withheld later content',
        },
      ],
    })
  )
  assert.equal(await main(['import', '--input', sourcePath, '--output', casesPath]), 0)
  const imported = JSON.parse(await readFile(casesPath, 'utf8'))
  assert.equal(imported.cases.length, 1)
  assert.equal(
    await main(['replay', '--input', casesPath, '--output', receiptPath, '--max-events', '1']),
    0
  )
  const receipt = JSON.parse(await readFile(receiptPath, 'utf8'))
  assert.equal(receipt.cases[0].steps.length, 2)
  assert.equal(receipt.cases[0].bodiesWithheld, 2)
  assert.doesNotMatch(JSON.stringify(receipt), /withheld source content|withheld later content/)
  await writeFile(
    branchPath,
    JSON.stringify({
      case: imported.cases[0],
      sourceId: imported.cases[0].events[0].sourceId,
      replacements: [message('hypothetical', '2021-01-03T00:00:00Z', 'a documented test branch')],
    })
  )
  assert.equal(await main(['branch', '--input', branchPath, '--output', branchedPath]), 0)
  const branched = JSON.parse(await readFile(branchedPath, 'utf8'))
  assert.equal(branched.provenance.kind, 'inferred')
  assert.deepEqual(
    branched.events.map((event) => event.sourceId),
    [imported.cases[0].events[0].sourceId, 'hypothetical']
  )
})
