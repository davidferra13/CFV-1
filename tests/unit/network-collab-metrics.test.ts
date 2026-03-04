import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeCollabMetrics } from '../../lib/network/collab-metrics.js'

describe('computeCollabMetrics', () => {
  it('computes rates and response speed for mixed recipient outcomes', () => {
    const metrics = computeCollabMetrics({
      windowDays: 90,
      outgoingHandoffs: [
        {
          id: 'h-1',
          status: 'open',
          created_at: '2026-03-01T10:00:00.000Z',
        },
        {
          id: 'h-2',
          status: 'closed',
          created_at: '2026-03-01T12:00:00.000Z',
        },
      ],
      outgoingRecipients: [
        { handoff_id: 'h-1', status: 'accepted', responded_at: '2026-03-01T13:00:00.000Z' },
        { handoff_id: 'h-1', status: 'converted', responded_at: '2026-03-01T14:00:00.000Z' },
        { handoff_id: 'h-2', status: 'rejected', responded_at: '2026-03-01T16:00:00.000Z' },
      ],
      incomingRecipients: [{ status: 'sent' }, { status: 'viewed' }, { status: 'accepted' }],
    })

    assert.equal(metrics.outgoing_total, 2)
    assert.equal(metrics.outgoing_open, 1)
    assert.equal(metrics.outgoing_closed, 1)
    assert.equal(metrics.accepted, 1)
    assert.equal(metrics.rejected, 1)
    assert.equal(metrics.converted, 1)
    assert.equal(metrics.recipient_responses, 3)
    assert.equal(metrics.acceptance_rate_pct, 66.7)
    assert.equal(metrics.conversion_rate_pct, 50)
    assert.equal(metrics.avg_first_response_hours, 3.5)
    assert.equal(metrics.incoming_unread, 1)
    assert.equal(metrics.incoming_actionable, 2)
  })

  it('returns null percentages when there are no responses', () => {
    const metrics = computeCollabMetrics({
      windowDays: 90,
      outgoingHandoffs: [],
      outgoingRecipients: [],
      incomingRecipients: [],
    })

    assert.equal(metrics.acceptance_rate_pct, null)
    assert.equal(metrics.conversion_rate_pct, null)
    assert.equal(metrics.avg_first_response_hours, null)
  })
})
