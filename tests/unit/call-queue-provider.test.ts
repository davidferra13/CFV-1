import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildCallQueueItem } from '@/lib/queue/providers/call'

describe('call queue provider', () => {
  it('builds completed call follow-ups as client queue work', () => {
    const now = new Date('2026-04-29T12:00:00.000Z')
    const item = buildCallQueueItem(
      {
        id: 'call-1',
        title: 'Planning call',
        call_type: 'follow_up',
        status: 'completed',
        scheduled_at: '2026-04-28T15:00:00.000Z',
        next_action: 'Send menu recap',
        next_action_due_at: '2026-04-29T16:00:00.000Z',
        created_at: '2026-04-28T14:00:00.000Z',
        updated_at: '2026-04-29T10:00:00.000Z',
        client: { full_name: 'Avery Client' },
        event: { occasion: 'Birthday dinner', event_date: '2026-05-05' },
        inquiry: null,
      },
      now
    )

    assert.equal(item.id, 'client:scheduled_call:call-1:next_action')
    assert.equal(item.domain, 'client')
    assert.equal(item.icon, 'PhoneCall')
    assert.equal(item.href, '/calls/call-1')
    assert.equal(item.context.primaryLabel, 'Avery Client')
    assert.equal(item.context.secondaryLabel, 'Due Apr 29')
    assert.equal(item.entityType, 'scheduled_call')
  })

  it('maps PhoneCall through the queue icon registry', () => {
    const source = readFileSync('components/queue/queue-icon.tsx', 'utf8')
    assert.match(source, /PhoneCall,/)
    assert.match(source, /const ICON_MAP[\s\S]*PhoneCall,/)
  })
})
