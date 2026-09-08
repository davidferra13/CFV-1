import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  buildReport,
  evaluateCase,
  renderMarkdown,
  validateCase,
} from '../../scripts/revival/evaluate-real-case.mjs'

const fixtureRoot = path.resolve(import.meta.dirname, '../..')
const readJson = (relativePath) =>
  JSON.parse(readFileSync(path.join(fixtureRoot, relativePath), 'utf8'))
const loop = readJson('docs/revival/dfpc-operating-loop.json')
const realCase = readJson('docs/revival/real-cases/dfpc-0492597d-shadow.json')

test('evaluates the first real DFPC shadow case honestly', () => {
  const report = evaluateCase(loop, realCase)
  assert.deepEqual(
    report.stages.map((stage) => stage.status),
    [
      'passed',
      'open',
      'open',
      'not-due',
      'not-due',
      'not-due',
      'not-due',
      'not-due',
      'not-due',
      'not-due',
      'not-due',
      'not-due',
    ]
  )
  assert.deepEqual(report.counts, { passed: 1, open: 2, blocked: 0, 'not-due': 9 })
  assert.equal(report.lifecycle_stage, 'availability-reviewed')
  assert.equal(report.waiting_on, 'client')
  assert.equal(report.first_open_stage, 'discovery')
  assert.equal(report.first_real_event_complete, false)
  assert.equal(report.completed_event_count_increment, 0)
  assert.equal(report.external_dispatch, 'not-sent')
})

test('keeps unknown evidence open and later stages not due', () => {
  const report = evaluateCase(loop, realCase)
  assert.deepEqual(report.stages[1].open_evidence, [
    'dietary_needs',
    'preferences',
    'referral_source',
  ])
  assert.deepEqual(report.stages[2].open_evidence, ['currency', 'expiration'])
  assert.ok(report.stages.slice(3).every((stage) => stage.status === 'not-due'))
})

test('rejects privacy leaks and external mutation states', () => {
  const withEmail = structuredClone(realCase)
  withEmail.client_email = 'person@example.com'
  assert.throws(() => validateCase(loop, withEmail), /Privacy guard/)

  const withPhone = structuredClone(realCase)
  withPhone.notes = 'Call 207-555-0100'
  assert.throws(() => validateCase(loop, withPhone), /Privacy guard/)

  const mutable = structuredClone(realCase)
  mutable.controls.mutation_state = 'write-through'
  assert.throws(() => validateCase(loop, mutable))
})

test('rejects unsupported evidence references', () => {
  const broken = structuredClone(realCase)
  broken.stage_evidence.inquiry.source.evidence_ids.push('E404')
  assert.throws(() => validateCase(loop, broken), /Unknown evidence E404/)
})

test('builds deterministic JSON and Markdown reports', () => {
  const first = buildReport(loop, realCase)
  const second = buildReport(loop, realCase)
  assert.deepEqual(first, second)
  assert.equal(renderMarkdown(first), renderMarkdown(second))
  assert.match(renderMarkdown(first), /adds zero to the three-event repeatability gate/)
  assert.doesNotMatch(JSON.stringify(first), /person@example\.com|207-555-0100/)
})
