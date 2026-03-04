import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { remyActionAuditInternals } from '@/lib/ai/remy-action-audit-core'

const { sanitizeValue, toSafeJsonb } = remyActionAuditInternals

describe('remy action audit payload safety', () => {
  it('truncates long strings', () => {
    const long = 'x'.repeat(800)
    const value = sanitizeValue(long)
    assert.equal(typeof value, 'string')
    assert.ok((value as string).includes('[truncated'))
    assert.ok((value as string).length < long.length)
  })

  it('caps array length', () => {
    const input = Array.from({ length: 40 }, (_, i) => i)
    const value = sanitizeValue(input)
    assert.ok(Array.isArray(value))
    assert.equal((value as unknown[]).length, 25)
  })

  it('caps object key count', () => {
    const input: Record<string, number> = {}
    for (let i = 0; i < 70; i++) input[`k${i}`] = i
    const value = sanitizeValue(input) as Record<string, unknown>
    assert.equal(Object.keys(value).length, 50)
  })

  it('truncates nested depth', () => {
    const input = { a: { b: { c: { d: { e: { f: true } } } } } }
    const value = sanitizeValue(input) as Record<string, unknown>
    const levelA = value.a as Record<string, unknown>
    const levelB = levelA.b as Record<string, unknown>
    const levelC = levelB.c as Record<string, unknown>
    const levelD = levelC.d as Record<string, unknown>
    assert.equal(levelD.e, '[truncated-depth]')
  })

  it('returns truncation envelope for oversized JSON payload', () => {
    const input: Record<string, string> = {}
    for (let i = 0; i < 50; i++) input[`k${i}`] = 'x'.repeat(500)
    const value = toSafeJsonb(input) as Record<string, unknown>
    assert.equal(value._truncated, true)
    assert.equal(typeof value.preview, 'string')
    assert.equal(typeof value.originalLength, 'number')
  })

  it('handles null payloads', () => {
    assert.equal(toSafeJsonb(null), null)
    assert.equal(toSafeJsonb(undefined), null)
  })
})
