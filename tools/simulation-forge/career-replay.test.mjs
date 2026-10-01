import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { compileCareerHistory, runCareerReplay, findingsToCareerHistory } from './career-replay.mjs'
import { main } from './history-cli.mjs'

const source = (id) => ({
  id,
  kind: 'gmail',
  evidence: `https://mail.example.invalid/message/${id}`,
})
const record = (id, knownAt, action = 'source_observed', actor = 'unknown', extra = {}) => ({
  id,
  source: source(id),
  knownAt,
  action,
  actor,
  clientId: 'client-a',
  eventId: 'dinner-a',
  ...extra,
})
const history = (records) => ({
  schemaVersion: 1,
  id: 'career-test',
  mode: 'source-backed',
  records,
})
const opts = { maxEvents: 100, budget: { maxMs: 3000, minFreeRamBytes: 0 } }

test('chronology spans 2016 to 2026 and repeats clients without future knowledge', async () => {
  const records = [
    record('late', '2026-09-01T12:00:00Z', 'inquiry_received', 'client', { eventId: 'dinner-b' }),
    record('early', '2016-02-01T12:00:00Z', 'inquiry_received', 'client', {
      facts: [{ key: 'guestCount', value: 2, visibleTo: ['chef', 'client'] }],
    }),
    record('menu', '2016-02-02T12:00:00Z', 'menu_proposed', 'chef', {
      requiredFacts: ['guestCount'],
    }),
  ]
  const out = await runCareerReplay(history(records), opts)
  assert.equal(out.status, 'replayed')
  assert.deepEqual(
    out.run.trajectory.filter((t) => t.kind === 'input').map((t) => t.data.record.id),
    ['early', 'menu', 'late']
  )
  assert.equal(out.checkpoint.state.clients['client-a'].eventIds.length, 2)
  const menu = out.run.trajectory.find(
    (t) => t.kind === 'transition' && t.data.decisions[0]?.recordId === 'menu'
  )
  assert.equal(menu.data.decisions[0].knowledge.guestCount.value, 2)
  assert.ok(!JSON.stringify(menu.data.decisions).includes('dinner-b'))
  assert.equal(out.proof.ui, 'unverified')
  assert.equal(out.proof.externalPayments, 'not_executed')
  assert.ok(out.gaps.some((gap) => gap.invariant === 'incomplete_model_workflow'))
})

test('late facts are withheld until known-at and other client facts never leak', async () => {
  const out = await runCareerReplay(
    history([
      record('inquiry', '2016-01-01T12:00:00Z', 'inquiry_received', 'client', {
        facts: [
          { key: 'allergy', value: 'nuts', knownAt: '2016-01-03T12:00:00Z', visibleTo: ['chef'] },
        ],
      }),
      record('other', '2016-01-01T13:00:00Z', 'source_observed', 'unknown', {
        clientId: 'client-b',
        eventId: 'other-dinner',
        facts: [{ key: 'secret', value: 'private', visibleTo: ['chef', 'client'] }],
      }),
      record('early-menu', '2016-01-02T12:00:00Z', 'menu_proposed', 'chef', {
        requiredFacts: ['allergy'],
      }),
      record('late-menu', '2016-01-04T12:00:00Z', 'menu_proposed', 'chef', {
        requiredFacts: ['allergy'],
      }),
    ]),
    opts
  )
  const decisions = out.run.trajectory
    .filter((t) => t.kind === 'transition')
    .flatMap((t) => t.data.decisions)
  const early = decisions.find((d) => d.recordId === 'early-menu')
  const late = decisions.find((d) => d.recordId === 'late-menu')
  assert.deepEqual(early.knowledge, {})
  assert.equal(early.accepted, false)
  assert.equal(late.knowledge.allergy.value, 'nuts')
  assert.ok(!late.knowledge.secret)
  assert.ok(out.gaps.some((g) => g.invariant === 'missing_known_fact'))
})

test('source evidence is required and invalid or unknown dates are quarantined', async () => {
  const compiled = compileCareerHistory(
    history([
      record('unknown', null),
      record('local', '2016-01-01T12:00:00'),
      record('calendar', '2016-02-31T12:00:00Z'),
      record('missing-source', '2016-01-01T12:00:00Z', 'source_observed', 'unknown', {
        source: { id: 'none', kind: 'gmail' },
      }),
      record('valid', '2016-01-01T12:00:00Z'),
    ])
  )
  assert.equal(compiled.scenario.events.length, 1)
  assert.equal(compiled.quarantined.length, 4)
  assert.equal(compiled.scenario.provenance.kind, 'observed')
})

test('exact duplicate sources and checkpoint re-import are idempotent', async () => {
  const first = record('one', '2016-01-01T12:00:00Z')
  const input = history([first, structuredClone(first), record('two', '2026-01-01T12:00:00Z')])
  const a = await runCareerReplay(input, { ...opts, maxEvents: 1 })
  assert.equal(a.status, 'checkpointed')
  assert.equal(a.duplicates.length, 1)
  const b = await runCareerReplay(input, { ...opts, checkpoint: a.checkpoint })
  assert.equal(b.status, 'replayed')
  assert.equal(b.checkpoint.state.observedSources, 2)
  const c = await runCareerReplay(input, { ...opts, checkpoint: b.checkpoint })
  assert.equal(c.run, null)
  assert.equal(c.status, 'replayed')
  assert.equal(c.checkpoint.state.observedSources, 2)
})

test('conflicting source IDs do not arbitrarily pick a record', () => {
  const a = record('same', '2016-01-01T12:00:00Z')
  const b = { ...a, facts: [{ key: 'guestCount', value: 20 }] }
  const out = compileCareerHistory(history([a, b]))
  assert.equal(out.scenario.events.length, 0)
  assert.equal(out.quarantined.length, 2)
  assert.ok(out.quarantined.every((q) => q.reason === 'source_conflict'))
})

test('uncertain facts never satisfy a documented workflow requirement', async () => {
  const out = await runCareerReplay(
    history([
      record('inquiry', '2016-01-01T12:00:00Z', 'inquiry_received', 'client', {
        facts: [{ key: 'guestCount', value: 2, certainty: 'uncertain', visibleTo: ['chef'] }],
      }),
      record('menu', '2016-01-02T12:00:00Z', 'menu_proposed', 'chef', {
        requiredFacts: ['guestCount'],
      }),
    ]),
    opts
  )
  assert.ok(out.gaps.some((g) => g.invariant === 'missing_known_fact'))
  assert.equal(out.checkpoint.state.events['dinner-a'].phase, 'inquiry')
})

test('records added before checkpoint time require chronological rebuild', async () => {
  const input = history([record('newer', '2026-01-01T12:00:00Z')])
  const a = await runCareerReplay(input, opts)
  const b = await runCareerReplay(
    history([...input.records, record('older', '2016-01-01T12:00:00Z')]),
    { ...opts, checkpoint: a.checkpoint }
  )
  assert.equal(b.status, 'blocked')
  assert.ok(b.quarantined.some((q) => q.reason === 'requires_full_replay'))
  assert.equal(b.checkpoint.state.observedSources, 1)
})

test('source-backed full dinner replays both roles and keeps historical amounts', async () => {
  const actions = [
    'inquiry_received',
    'menu_proposed',
    'quote_issued',
    'booking_confirmed',
    'deposit_recorded',
    'event_planned',
    'service_completed',
    'final_payment_recorded',
    'follow_up_sent',
  ]
  const records = actions.map((action, i) =>
    record(
      action,
      `2016-03-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
      action,
      ['inquiry_received', 'booking_confirmed'].includes(action) ? 'client' : 'chef',
      {
        facts:
          action === 'quote_issued'
            ? [{ key: 'priceCents', value: 25000, visibleTo: ['chef', 'client'] }]
            : [],
      }
    )
  )
  const out = await runCareerReplay(history(records), opts)
  assert.equal(out.gaps.length, 0)
  assert.equal(out.checkpoint.state.events['dinner-a'].phase, 'followed_up')
  assert.equal(out.checkpoint.state.knowledge['dinner-a:priceCents'].value, 25000)
  assert.deepEqual(
    new Set(
      out.run.trajectory
        .filter((t) => t.kind === 'transition')
        .flatMap((t) => t.data.decisions.map((d) => d.actor))
    ),
    new Set(['chef', 'client'])
  )
})

test('historical Gmail finding mapping preserves destination and exposes no guessed role', async () => {
  const input = findingsToCareerHistory(
    [
      {
        id: 'finding-a',
        source: 'gmail',
        sourceUrl: 'https://mail.example.invalid/a',
        category: 'inquiry',
        confidence: 'high',
        receivedAt: '2016-01-01T12:00:00Z',
        reviewedAt: '2026-10-01T12:00:00Z',
        status: 'imported',
        importedInquiryId: 'persisted-inquiry-a',
      },
      {
        id: 'finding-b',
        source: 'gmail',
        sourceUrl: 'https://mail.example.invalid/b',
        category: 'payment_invoice',
        confidence: 'low',
        receivedAt: '2016-01-02T12:00:00Z',
        status: 'pending',
        importedInquiryId: null,
      },
      {
        id: 'finding-c',
        source: 'gmail',
        sourceUrl: 'https://mail.example.invalid/c',
        category: 'event',
        receivedAt: null,
        status: 'pending',
      },
    ],
    { id: 'gmail-career' }
  )
  assert.equal(input.records[0].actor, 'unknown')
  assert.equal(input.records[0].action, 'source_observed')
  assert.equal(input.records[0].destination.id, 'persisted-inquiry-a')
  const out = await runCareerReplay(input, opts)
  assert.equal(out.checkpoint.state.events['persisted-inquiry-a'], undefined)
  assert.equal(out.checkpoint.state.destinationReceipts[0].id, 'persisted-inquiry-a')
  assert.ok(out.quarantined.some((q) => q.recordId === 'finding-c'))
  assert.ok(out.gaps.some((g) => g.invariant === 'workflow_not_reconstructed'))
})

test('synthetic mode remains synthetic and cannot become source-backed proof', async () => {
  const synthetic = { ...history([record('synthetic', '2016-01-01T12:00:00Z')]), mode: 'synthetic' }
  synthetic.records[0].source = {
    id: 'synthetic',
    kind: 'synthetic',
    evidence: 'fixture:synthetic',
  }
  const out = await runCareerReplay(synthetic, opts)
  assert.equal(out.run.source.kind, 'synthetic')
  assert.equal(out.proof.history, 'synthetic_only')
  assert.throws(
    () => compileCareerHistory({ ...synthetic, mode: 'source-backed' }),
    /Synthetic source/
  )
})

test('bounded execution rejects excessive input and invalid checkpoint identity', async () => {
  assert.throws(
    () =>
      compileCareerHistory(
        history(Array.from({ length: 5001 }, (_, i) => record(`${i}`, '2016-01-01T12:00:00Z')))
      ),
    /Record budget/
  )
  await assert.rejects(() => runCareerReplay(history([]), { maxEvents: 101 }), /Batch budget/)
  await assert.rejects(
    () => runCareerReplay(history([]), { checkpoint: { historyId: 'other', state: {} } }),
    /Checkpoint/
  )
})

test('malformed facts and oversized evidence are quarantined before allocating replay state', () => {
  const compiled = compileCareerHistory(
    history([
      record('null-fact', '2016-01-01T12:00:00Z', 'source_observed', 'unknown', { facts: [null] }),
      record('large-evidence', '2016-01-01T12:00:00Z', 'source_observed', 'unknown', {
        source: { id: 'large', kind: 'gmail', evidence: 'x'.repeat(2049) },
      }),
      record('many-facts', '2016-01-01T12:00:00Z', 'source_observed', 'unknown', {
        facts: Array.from({ length: 101 }, (_, i) => ({
          key: `${i}`,
          value: i,
          visibleTo: ['chef'],
        })),
      }),
    ])
  )
  assert.equal(compiled.scenario.events.length, 0)
  assert.equal(compiled.quarantined.length, 3)
})

test('the fictional decade fixture resumes across bounded batches with both roles', async () => {
  const input = JSON.parse(
    await readFile(new URL('./fixtures/career-history-synthetic.json', import.meta.url), 'utf8')
  )
  let checkpoint = null,
    output,
    batches = 0
  do {
    output = await runCareerReplay(input, { ...opts, maxEvents: 25, checkpoint })
    checkpoint = output.checkpoint
    assert.ok(output.run.trajectory.filter((t) => t.kind === 'input').length <= 25)
    batches++
  } while (output.status === 'checkpointed' && batches < 10)
  assert.equal(output.status, 'replayed')
  assert.equal(output.gaps.length, 0)
  assert.equal(output.proof.history, 'synthetic_only')
  assert.equal(checkpoint.state.observedSources, 99)
  assert.equal(Object.keys(checkpoint.state.events).length, 11)
  assert.equal(Object.keys(checkpoint.state.clients).length, 3)
  assert.ok(Object.values(checkpoint.state.events).every((event) => event.phase === 'followed_up'))
})

test('changed checkpoint sources and a receipt dated before its source are quarantined', async () => {
  const original = record('one', '2016-01-01T12:00:00Z')
  const first = await runCareerReplay(history([original]), opts)
  const changed = await runCareerReplay(
    history([{ ...original, action: 'inquiry_received', actor: 'client' }]),
    { ...opts, checkpoint: first.checkpoint }
  )
  assert.equal(changed.status, 'blocked')
  assert.ok(changed.quarantined.some((row) => row.reason === 'checkpoint_source_changed'))
  const badReceipt = compileCareerHistory(
    history([
      {
        ...original,
        destination: { type: 'inquiry', id: 'future-import', knownAt: '2015-01-01T12:00:00Z' },
      },
    ])
  )
  assert.equal(badReceipt.scenario.events.length, 0)
  assert.equal(badReceipt.quarantined[0].reason, 'invalid_destination_receipt')
})

test('CLI writes honest source-only evidence and refuses source/output overlap', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'career-replay-test-'))
  const input = join(directory, 'history.json'),
    output = join(directory, 'report.json')
  const checkpoint = join(directory, 'checkpoint.json')
  await writeFile(input, JSON.stringify(history([record('one', '2016-01-01T12:00:00Z')])))
  assert.equal(
    await main(['career', '--input', input, '--output', output, '--save-checkpoint', checkpoint]),
    2
  )
  const report = JSON.parse(await readFile(output, 'utf8'))
  assert.equal(report.proof.ui, 'unverified')
  assert.equal(report.runs.length, 1)
  assert.ok(report.gaps.some((gap) => gap.invariant === 'workflow_not_reconstructed'))
  await assert.rejects(() => main(['career', '--input', input, '--output', input]), /distinct/)
  await assert.rejects(() => main(['career', '--input', input, '--output', output]), /EEXIST/)
})
