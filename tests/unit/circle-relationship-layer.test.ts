import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CIRCLE_KIND_LABELS,
  decideCircleAdoption,
  normalizeHubGroupToCircleKind,
  shapeCircleThreadForActor,
} from '@/lib/hub/circle-relationship-layer'

describe('circle relationship layer', () => {
  it('defines the required universal circle taxonomy', () => {
    assert.equal(CIRCLE_KIND_LABELS.solo, 'Private Circle')
    assert.equal(CIRCLE_KIND_LABELS.dinner, 'Dinner Circle')
    assert.equal(CIRCLE_KIND_LABELS.chef_collab, 'Chef Collab Circle')
    assert.equal(CIRCLE_KIND_LABELS.vendor, 'Vendor Circle')
    assert.equal(CIRCLE_KIND_LABELS.platform, 'Platform Circle')
  })

  it('chooses create/reuse/thread actions for major circle sources', () => {
    assert.equal(
      decideCircleAdoption({ source: 'inquiry', tenantId: 't1' }).action,
      'create_circle'
    )
    assert.equal(
      decideCircleAdoption({ source: 'repeat_client_event', relationshipKey: 'client:1' }).action,
      'create_thread'
    )
    assert.equal(decideCircleAdoption({ source: 'vendor_sourcing', tenantId: 't1' }).kind, 'vendor')
  })

  it('normalizes existing hub group types and hides restricted threads', () => {
    assert.equal(
      normalizeHubGroupToCircleKind({
        group_type: 'planning',
        event_id: 'event-1',
        visibility: 'private',
      }),
      'event'
    )

    const shaped = shapeCircleThreadForActor(
      { role: 'member', isMember: true },
      {
        group: {
          visibility: 'private',
          tenant_id: 't1',
          created_by_profile_id: 'p1',
          allow_anonymous_posts: false,
          allow_member_invites: false,
        },
      },
      { id: 'thread-1', kind: 'event', title: 'Chef margin review', chefOnly: true }
    )

    assert.equal(shaped.visible, false)
    assert.equal(shaped.title, 'Restricted thread')
  })
})
