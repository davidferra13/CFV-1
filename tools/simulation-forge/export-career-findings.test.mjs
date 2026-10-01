import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  exportCareerFindings,
  CAREER_FINDINGS_SQL,
  main,
  createPostgresReader,
} from './export-career-findings.mjs'
import { findingsToCareerHistory, runCareerReplay } from './career-replay.mjs'

const tenant = '10000000-0000-4000-8000-000000000001'
const otherTenant = '10000000-0000-4000-8000-000000000002'
const uuid = (n) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const row = (n, extra = {}) => ({
  id: uuid(n),
  tenant_id: tenant,
  gmail_message_id: `message-${n}`,
  gmail_thread_id: `thread-${n}`,
  mailbox_id: uuid(99),
  classification: 'inquiry',
  confidence: 'high',
  received_at: '2016-01-01T12:00:00Z',
  status: 'imported',
  imported_inquiry_id: uuid(50 + n),
  reviewed_at: '2026-10-01T12:00:00Z',
  receipt_verified: true,
  ...extra,
})

test('tenant and keyset cursor are parameters with a bounded lookahead', async () => {
  let captured
  const out = await exportCareerFindings({
    tenantId: tenant,
    cursor: uuid(1),
    limit: 2,
    reader: async (query, params) => {
      captured = { query, params }
      return [row(2), row(3), row(4)]
    },
  })
  assert.deepEqual(captured.params, [tenant, uuid(1), 3])
  assert.equal(captured.query, CAREER_FINDINGS_SQL)
  assert.match(captured.query, /f\.tenant_id = \$1::uuid/)
  assert.match(captured.query, /f\.id > \$2::uuid/)
  assert.match(captured.query, /ORDER BY f\.id ASC/)
  assert.ok(!/\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP)\b/i.test(captured.query))
  assert.equal(out.findings.length, 2)
  assert.equal(out.hasMore, true)
  assert.equal(out.nextCursor, uuid(3))
})

test('only verified inquiry receipts remain imported and other records stay pending', async () => {
  const out = await exportCareerFindings({
    tenantId: tenant,
    reader: async () => [
      row(1),
      row(2, { receipt_verified: false }),
      row(3, { classification: 'payment_invoice' }),
      row(4, { status: 'pending' }),
      row(5, { status: 'dismissed' }),
    ],
  })
  assert.deepEqual(
    out.findings.map((finding) => finding.status),
    ['imported', 'pending', 'pending', 'pending', 'dismissed']
  )
  assert.equal(out.findings[0].importedInquiryId, uuid(51))
  assert.ok(out.findings.slice(1).every((finding) => finding.importedInquiryId === null))
  assert.match(CAREER_FINDINGS_SQL, /i\.tenant_id = f\.tenant_id/)
  assert.match(CAREER_FINDINGS_SQL, /i\.deleted_at IS NULL/)
  assert.match(CAREER_FINDINGS_SQL, /historical_email_scan/)
  assert.match(CAREER_FINDINGS_SQL, /gmail_mailbox_id/)
  assert.match(CAREER_FINDINGS_SQL, /FROM messages m/)
  assert.match(CAREER_FINDINGS_SQL, /m\.tenant_id = f\.tenant_id/)
  assert.match(CAREER_FINDINGS_SQL, /m\.gmail_message_id = f\.gmail_message_id/)
})

test('empty exports truthfully report no continuation and reject cross-tenant rows', async () => {
  const out = await exportCareerFindings({ tenantId: tenant, reader: async () => [] })
  assert.equal(out.hasMore, false)
  assert.equal(out.nextCursor, null)
  assert.equal(out.findings.length, 0)
  await assert.rejects(
    () =>
      exportCareerFindings({
        tenantId: tenant,
        reader: async () => [row(1, { tenant_id: otherTenant })],
      }),
    /Tenant scope/
  )
})

test('invalid tenant/cursor/caps fail before the reader is called', async () => {
  let calls = 0
  const reader = async () => {
    calls++
    return []
  }
  for (const params of [
    { tenantId: null },
    { tenantId: "' OR true" },
    { tenantId: tenant, cursor: "' OR true" },
    { tenantId: tenant, limit: 0 },
    { tenantId: tenant, limit: 5001 },
    { tenantId: tenant, limit: 2.5 },
  ])
    await assert.rejects(() => exportCareerFindings({ ...params, reader }), /Invalid/)
  assert.equal(calls, 0)
})

test('reader overrun, wrong ordering and repeated rows never silently lose records', async () => {
  await assert.rejects(
    () =>
      exportCareerFindings({
        tenantId: tenant,
        limit: 1,
        reader: async () => [row(1), row(2), row(3)],
      }),
    /Reader exceeded/
  )
  await assert.rejects(
    () => exportCareerFindings({ tenantId: tenant, reader: async () => [row(2), row(1)] }),
    /keyset order/
  )
  await assert.rejects(
    () => exportCareerFindings({ tenantId: tenant, reader: async () => [row(1), row(1)] }),
    /keyset order/
  )
  await assert.rejects(
    () => exportCareerFindings({ tenantId: tenant, cursor: uuid(3), reader: async () => [row(2)] }),
    /keyset order/
  )
})

test('the maximum segment is 5000 and explicitly reports the next source page', async () => {
  let params
  const out = await exportCareerFindings({
    tenantId: tenant,
    limit: 5000,
    reader: async (_query, values) => {
      params = values
      return Array.from({ length: 5001 }, (_, i) => row(i + 1))
    },
  })
  assert.equal(params[2], 5001)
  assert.equal(out.findings.length, 5000)
  assert.equal(out.hasMore, true)
  assert.equal(out.nextCursor, uuid(5000))
})

test('projection strips message content and identities and feeds source-backed replay', async () => {
  const out = await exportCareerFindings({
    tenantId: tenant,
    reader: async () => [
      row(1, {
        body_preview: 'private message body',
        source_message: 'private original message',
        from_address: 'person@example.invalid',
        subject: 'private subject',
        full_name: 'Private Person',
        unknown_fields: { original_sender: 'person@example.invalid' },
      }),
    ],
  })
  const serialized = JSON.stringify(out)
  for (const privateText of [
    'private message',
    'private original',
    'person@example.invalid',
    'private subject',
    'Private Person',
    'original_sender',
  ])
    assert.ok(!serialized.includes(privateText))
  assert.ok(!/body_preview|source_message|from_address|subject|full_name/.test(CAREER_FINDINGS_SQL))
  const input = findingsToCareerHistory(out.findings, { id: 'source-backed-export' })
  const replay = await runCareerReplay(input, { budget: { maxMs: 3000, minFreeRamBytes: 0 } })
  assert.equal(replay.proof.history, 'source_backed_model_only')
  assert.ok(replay.gaps.some((gap) => gap.invariant === 'workflow_not_reconstructed'))
  assert.equal(replay.checkpoint.state.destinationReceipts[0].id, uuid(51))
})

test('missing dates remain unknown rather than acquiring current time', async () => {
  const out = await exportCareerFindings({
    tenantId: tenant,
    reader: async () => [row(1, { received_at: null, reviewed_at: null })],
  })
  assert.equal(out.findings[0].receivedAt, null)
  assert.equal(out.findings[0].status, 'pending')
  assert.equal(out.findings[0].importedInquiryId, null)
})

test('CLI requires explicit tenant and writes new files without exposing private content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'career-export-test-'))
  const output = join(directory, 'findings.json')
  let closed = false
  const createReader = async () => ({
    reader: async () => [row(1, { body_preview: 'never export this' })],
    close: async () => {
      closed = true
    },
  })
  assert.equal(
    await main(['--tenant-id', tenant, '--output', output, '--limit', '1'], { createReader }),
    0
  )
  const report = JSON.parse(await readFile(output, 'utf8'))
  assert.equal(report.findings.length, 1)
  assert.ok(!JSON.stringify(report).includes('never export'))
  assert.equal(closed, true)
  await assert.rejects(() => main(['--output', output], { createReader }), /tenant-id/)
  await assert.rejects(
    () => main(['--tenant-id', tenant, '--output', output], { createReader }),
    /EEXIST/
  )
})

test('missing caller credentials fail before driver discovery and reader failures close connections', async () => {
  await assert.rejects(() => createPostgresReader(''), /DATABASE_URL is required/)
  const directory = await mkdtemp(join(tmpdir(), 'career-export-error-test-'))
  let closed = false
  await assert.rejects(
    () =>
      main(['--tenant-id', tenant, '--output', join(directory, 'not-created.json')], {
        createReader: async () => ({
          reader: async () => {
            throw Error('reader failed')
          },
          close: async () => {
            closed = true
          },
        }),
      }),
    /reader failed/
  )
  assert.equal(closed, true)
})
