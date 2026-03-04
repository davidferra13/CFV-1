import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CORE_PACKET_DOCUMENT_TYPES,
  buildSnapshotMetadata,
  parseDocumentRequestQuery,
  parseOperationalDocumentTypeCsv,
  validateSnapshotArchiveInsert,
} from '../../lib/documents/document-definitions.js'

describe('parseOperationalDocumentTypeCsv', () => {
  it('deduplicates while preserving order and reports invalid tokens', () => {
    const parsed = parseOperationalDocumentTypeCsv(
      'summary, grocery, summary, prep, invalid_token, shots'
    )
    assert.deepEqual(parsed.types, ['summary', 'grocery', 'prep', 'shots'])
    assert.deepEqual(parsed.invalidTokens, ['invalid_token'])
  })
})

describe('parseDocumentRequestQuery', () => {
  it('parses pack requests with archive flag and selected types', () => {
    const params = new URLSearchParams({
      type: 'pack',
      types: 'summary,prep,packing',
      archive: 'true',
    })
    const result = parseDocumentRequestQuery(params)
    assert.equal(result.success, true)
    if (!result.success) return

    assert.equal(result.value.requestedType, 'pack')
    assert.equal(result.value.archiveRequested, true)
    assert.deepEqual(result.value.selectedTypes, ['summary', 'prep', 'packing'])
  })

  it('rejects invalid type tokens in pack selection', () => {
    const params = new URLSearchParams({
      type: 'pack',
      types: 'summary,nope,prep',
    })
    const result = parseDocumentRequestQuery(params)
    assert.equal(result.success, false)
    if (result.success) return
    assert.match(result.error, /Invalid value for "types"/)
  })

  it('defaults to core packet for all docs and forces archive on all/pack', () => {
    const params = new URLSearchParams({ type: 'all' })
    const result = parseDocumentRequestQuery(params)
    assert.equal(result.success, true)
    if (!result.success) return
    assert.equal(result.value.requestedType, 'all')
    assert.equal(result.value.archiveRequested, true)
    assert.deepEqual(CORE_PACKET_DOCUMENT_TYPES.slice(0, 2), ['summary', 'grocery'])
  })
})

describe('snapshot archive validation', () => {
  it('accepts valid snapshot metadata and insert payload', () => {
    const metadata = buildSnapshotMetadata({
      requestedType: 'pack',
      selectedTypes: ['summary', 'prep', 'packing'],
      archiveRequested: true,
    })

    const validated = validateSnapshotArchiveInsert({
      tenantId: 'tenant-12345',
      eventId: 'event-12345',
      documentType: 'all',
      versionNumber: 2,
      filename: 'event-pack-2026-03-04.pdf',
      storagePath: 'tenant-12345/event-12345/all/v0002-20260304120000.pdf',
      contentHash: 'a'.repeat(64),
      sizeBytes: 4096,
      generatedBy: 'user-12345',
      metadata,
    })

    assert.equal(validated.success, true)
  })

  it('rejects malformed content hash', () => {
    const metadata = buildSnapshotMetadata({
      requestedType: 'summary',
      selectedTypes: ['summary'],
      archiveRequested: true,
    })
    const validated = validateSnapshotArchiveInsert({
      tenantId: 'tenant-12345',
      eventId: 'event-12345',
      documentType: 'summary',
      versionNumber: 1,
      filename: 'event-summary-2026-03-04.pdf',
      storagePath: 'tenant-12345/event-12345/summary/v0001-20260304120000.pdf',
      contentHash: 'not-a-real-hash',
      sizeBytes: 1024,
      generatedBy: 'user-12345',
      metadata,
    })
    assert.equal(validated.success, false)
  })
})
