import assert from 'node:assert/strict'
import { it } from 'node:test'
import { WorkEvidenceSchema } from '@/lib/work-ledger/validators'

it('rejects forbidden raw-content keys even when nested', () => {
  const result = WorkEvidenceSchema.safeParse({
    source_type: 'gmail',
    source_record_id: 'message-1',
    source_hash: '0123456789abcdef',
    source_created_at: '2026-09-08T14:00:00.000Z',
    actor_type: 'david_active',
    signal_type: 'activity_anchor',
    signal_summary: 'Sent a business email',
    minimal_metadata: { payload: { message_body: 'must not be stored' } },
    privacy_class: 'sensitive_business',
  })

  assert.equal(result.success, false)
})

it('compares interval boundaries as instants rather than timestamp text', () => {
  const result = WorkEvidenceSchema.safeParse({
    source_type: 'windows',
    source_record_id: 'window-1',
    source_hash: '0123456789abcdef',
    actor_type: 'david_active',
    signal_type: 'observed_window',
    signal_summary: 'Editor active',
    interval_start: '2026-09-08T10:00:00.000-04:00',
    interval_end: '2026-09-08T13:30:00.000Z',
    minimal_metadata: {},
    privacy_class: 'business',
  })
  assert.equal(result.success, false)
})
