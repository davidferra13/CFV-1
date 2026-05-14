import test from 'node:test'
import assert from 'node:assert/strict'

import { POST } from '@/app/api/remy/discovery/route'

test('Remy discovery API rejects invalid control requests', async () => {
  const response = await POST(
    new Request('http://localhost/api/remy/discovery', {
      method: 'POST',
      body: JSON.stringify({ message: '' }),
    })
  )
  const body = (await response.json()) as { error?: string }

  assert.equal(response.status, 400)
  assert.equal(body.error, 'message is required.')
})

test('Remy discovery API returns proposal-only control payloads', async () => {
  const response = await POST(
    new Request('http://localhost/api/remy/discovery', {
      method: 'POST',
      body: JSON.stringify({
        message: 'show me Thai under $80',
        actor: { authenticated: true, actorRole: 'client' },
        now: '2026-05-13T04:30:00.000Z',
      }),
    })
  )
  const body = (await response.json()) as {
    policy: { executionOwner: string; externalActions: string }
    filters: { cuisines: string[]; budget?: string }
    proposals: Array<{ durability: string }>
  }

  assert.equal(response.status, 200)
  assert.equal(body.policy.executionOwner, 'visible_discovery_rail')
  assert.equal(body.policy.externalActions, 'proposal_only')
  assert.deepEqual(body.filters.cuisines, ['thai'])
  assert.ok(body.proposals.some((proposal) => proposal.durability === 'temporary'))
})
