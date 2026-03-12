import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isMissingEquipmentSourcingColumn } from '@/lib/equipment/schema-compat'

describe('isMissingEquipmentSourcingColumn', () => {
  it('detects schema cache errors for new equipment asset columns', () => {
    assert.equal(
      isMissingEquipmentSourcingColumn({
        message: 'Could not find the column source_url in the schema cache',
      }),
      true
    )
  })

  it('ignores unrelated errors', () => {
    assert.equal(
      isMissingEquipmentSourcingColumn({
        message: 'duplicate key value violates unique constraint',
      }),
      false
    )
  })
})
