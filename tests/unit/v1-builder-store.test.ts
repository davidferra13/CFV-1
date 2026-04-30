import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { queueRecordSchema } from '../../lib/v1-builder/types'
import { appendJsonl, readJsonl, resolveBuilderPath } from '../../lib/v1-builder/store'
import { createBuilderFixture, queueRecord } from './v1-builder-test-helpers'

test('readJsonl reports missing files instead of returning fake empty state', async () => {
  const root = await createBuilderFixture()
  const result = await readJsonl(resolveBuilderPath('missing.jsonl', root), queueRecordSchema)

  assert.equal(result.ok, false)
  assert.equal(result.records.length, 0)
  assert.match(result.errors[0], /missing\.jsonl/)
})

test('readJsonl reports malformed line with exact line number', async () => {
  const root = await createBuilderFixture()
  const path = resolveBuilderPath('approved-queue.jsonl', root)
  await writeFile(path, `${JSON.stringify(queueRecord())}\n{bad json\n`, 'utf-8')

  const result = await readJsonl(path, queueRecordSchema)

  assert.equal(result.ok, false)
  assert.equal(result.records.length, 1)
  assert.match(result.errors[0], /approved-queue\.jsonl:2/)
})

test('appendJsonl appends valid records without replacing prior lines', async () => {
  const root = await createBuilderFixture()
  const path = resolveBuilderPath('approved-queue.jsonl', root)

  await appendJsonl(path, queueRecordSchema, queueRecord({ id: 'v1-one' }))
  await appendJsonl(path, queueRecordSchema, queueRecord({ id: 'v1-two' }))
  const result = await readJsonl(path, queueRecordSchema)

  assert.equal(result.ok, true)
  assert.deepEqual(result.records.map((record) => record.id), ['v1-one', 'v1-two'])
})
