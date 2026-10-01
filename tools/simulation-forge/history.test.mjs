import test from 'node:test'
import assert from 'node:assert/strict'
import { compileHistory, historyScenario, historyAdapter, replayHistory, branchHistory, importGmailThreads } from './history.mjs'

const message = (id, at, text, role = 'client', extra = {}) => ({ id, at, text, role, channel: 'email', ...extra })
const input = (messages, extra = {}) => ({ id: 'sample', engagement: 'sample-engagement', messages, coverage: { email: 'selected_threads', sms: 'not_imported', calls: 'not_imported', attachments: 'not_reviewed' }, ...extra })

test('sorts and deduplicates sources, excludes unsent drafts and preserves missing bodies', () => {
  const a = message('a', '2020-01-01T00:00:00Z', 'six guests')
  const c = compileHistory(input([message('b', '2020-01-02T00:00:00Z', ''), a, a, message('draft', '2020-01-03T00:00:00Z', 'great dinner', 'chef', { draft: true })]))
  assert.deepEqual(c.events.map(e => e.sourceId), ['a', 'b'])
  assert.equal(c.events[1].bodyStatus, 'unavailable')
  assert.equal(c.exclusions.drafts, 1)
  assert.equal(c.exclusions.duplicates, 1)
  assert.equal(c.coverage.sms, 'not_imported')
})

test('rejects ambiguous duplicate evidence and invalid clocks', () => {
  assert.throws(() => compileHistory(input([message('a', 'yesterday', 'hi')])), /timestamp/)
  assert.throws(() => compileHistory(input([message('a', '2020-01-01', 'one'), message('a', '2020-01-01', 'two')])), /conflicting/)
})

test('removes quoted chains and scrubs contact and bearer secrets from replay input', () => {
  const c = compileHistory(input([message('a', '2020-01-01', 'Call +12025550123 or 917-555-0123. a@example.com\nhttps://example.com/private/secret-token?token=abc\n On Friday someone wrote:\n> old facts')]))
  assert.doesNotMatch(JSON.stringify(c), /2025550123|917-555-0123|a@example.com|secret-token|token=abc|old facts/)
  assert.match(c.events[0].text, /contact withheld/)
})

test('replay never supplies future facts or historical outcomes to a participant', async () => {
  const c = compileHistory(input([message('a', '2020-01-01', 'six guests'), message('b', '2020-01-03', 'now eight guests')], { outcome: 'wonderful' }))
  const seen = []
  const r = await replayHistory(c, { version: 'probe', step: async view => { seen.push(view); return { action: 'observe' } } })
  assert.equal(seen[0].history.length, 1)
  assert.doesNotMatch(JSON.stringify(seen[0]), /eight|wonderful/)
  assert.equal(seen[1].history.length, 2)
  assert.equal(r.steps.length, 2)
  assert.equal(r.productBehaviorVerified, false)
})

test('findings remain sourced statements rather than invented feelings or settled finance', async () => {
  const c = compileHistory(input([message('a', '2020-01-01', 'I sent a $20 test payment.'), message('b', '2020-01-02', 'The links do not appear to work; we get a redirect notice.'), message('c', '2020-01-03', "The guests check out Sunday morning so the schedule won't work.")]))
  const r = await replayHistory(c)
  assert.ok(r.findings.some(f => f.kind === 'link_failure_reported' && f.sourceIds.includes('b')))
  assert.ok(r.findings.some(f => f.kind === 'schedule_mismatch_reported'))
  assert.equal(r.financialVerification, 'not_performed')
  assert.equal(r.modelTrainingPerformed, false)
  assert.ok(r.findings.every(f => f.authority === 'statement_in_source'))
})

test('a branch preserves the known prefix and removes all later historical messages', () => {
  const c = compileHistory(input([message('a', '2020-01-01', 'six guests'), message('b', '2020-01-02', 'paid'), message('c', '2020-01-03', 'thanks')]))
  const b = branchHistory(c, 'a', [message('new', '2020-01-02', 'now ten guests')])
  assert.deepEqual(b.events.map(e => e.sourceId), ['a', 'new'])
  assert.equal(b.provenance.kind, 'inferred')
  assert.equal(b.events[1].evidenceKind, 'counterfactual')
  assert.throws(() => branchHistory(c, 'a', [message('new', '2019-01-01', 'bad clock')]), /branch timestamp/)
})

test('the existing Forge adapter retains original message clocks and only observed history', async () => {
  const c = compileHistory(input([message('a', '2016-02-03T12:00:00Z', 'inquiry'), message('b', '2016-02-07T12:00:00Z', 'menu change')]))
  const s = historyScenario(c)
  const adapter = historyAdapter()
  let state = s.initialState
  for (const event of s.events) state = (await adapter.step(state, event)).state
  assert.equal(state.at, '2016-02-07T12:00:00.000Z')
  assert.equal(s.environment.at, '2016-02-03T12:00:00.000Z')
  assert.equal(adapter.evaluate(state, s).scores.productBehaviorVerified, 0)
})

test('Gmail import handles HTML-only mail, attachments, drafts and form telemetry', () => {
  const gmailMessage = (id, payload, labels = []) => ({ id, internal_date: '1454491200000', payload, label_ids: labels })
  const from = [{ name: 'From', value: 'owner@example.invalid' }]
  const c = importGmailThreads([{ id: 'form', messages: [gmailMessage('a', { headers: from, mime_type: 'text/plain', body: { content: 'Allergies: gluten\nPre-inquiry journey\nIntent: high intent' } })] },
    { id: 'email', messages: [gmailMessage('b', { headers: [{ name: 'From', value: 'guest@example.invalid' }], parts: [{ mime_type: 'text/html', body: { content: '<div>Links do not work</div><blockquote>old text</blockquote>' } }, { filename: 'agreement.pdf' }] }),
      gmailMessage('draft', { headers: from, mime_type: 'text/plain', body: { content: 'great dinner' } }, ['DRAFT'])] }],
  { id: 'gmail-case', engagement: 'one-dinner', ownerEmail: 'owner@example.invalid', formThreadIds: ['form'] })
  assert.equal(c.events.length, 2)
  assert.equal(c.events[0].role, 'intake_relay')
  assert.doesNotMatch(JSON.stringify(c), /high intent|old text|guest@example/)
  assert.equal(c.events[1].attachmentCount, 1)
  assert.equal(c.events[1].bodyStatus, 'available')
})

test('unresponsive adapters are bounded and do not produce a success report', async () => {
  const c = compileHistory(input([message('a', '2020-01-01', 'hi')]))
  await assert.rejects(replayHistory(c, { version: 'never', step: () => new Promise(() => {}) }, { maxMs: 10 }), /time budget/)
})
