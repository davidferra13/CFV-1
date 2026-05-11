import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  assertPacketCanMutate,
  summarizeCompliancePacketCompleteness,
} from '@/lib/compliance/compliance-packet'

describe('compliance packet', () => {
  it('requires snapshot, reconciliation, and evidence before finalization', () => {
    const summary = summarizeCompliancePacketCompleteness({
      packetId: 'packet-1',
      stage: 'reconcile',
      snapshotCreated: true,
      reconciliationRecorded: false,
      evidenceItems: [],
    })

    assert.equal(summary.readyToFinalize, false)
    assert.deepEqual(summary.missing, ['reconciliation', 'evidence'])
    assert.equal(summary.evidenceCount, 0)
  })

  it('blocks mutations after finalization', () => {
    assert.throws(
      () =>
        assertPacketCanMutate({
          packetId: 'packet-1',
          stage: 'finalized',
          snapshotCreated: true,
          reconciliationRecorded: true,
          evidenceItems: [{ id: 'e1', label: 'Evidence', contentType: 'image/png', sizeBytes: 1 }],
          finalizedAt: '2026-05-11T00:00:00.000Z',
        }),
      /Finalized compliance packets cannot be modified/
    )
  })
})
