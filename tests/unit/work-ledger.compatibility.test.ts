import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { projectAdminTimeLog, projectStaffClockEntry } from '@/lib/work-ledger/compatibility'

describe('work ledger compatibility', () => {
  it('projects a manual admin log as approved exact duration', () => {
    const projection = projectAdminTimeLog({
      id: 'log-1',
      category: 'email',
      logDate: '2026-09-08',
      minutes: 35,
      notes: 'Client replies',
      eventId: null,
      createdAt: '2026-09-08T18:00:00.000Z',
    })
    assert.equal(projection.session.actorType, 'david_active')
    assert.equal(projection.session.status, 'approved')
    assert.equal(projection.session.durationMinutes, 35)
    assert.equal(projection.session.creationMode, 'compatibility_projection')
  })

  it('never projects staff time into David active labor', () => {
    const projection = projectStaffClockEntry({
      id: 'staff-1',
      staffMemberId: 'member-1',
      clockInAt: '2026-09-08T17:00:00.000Z',
      clockOutAt: '2026-09-08T18:00:00.000Z',
      totalMinutes: 60,
      approved: true,
      eventId: null,
    })
    assert.equal(projection.session.actorType, 'staff')
    assert.equal(projection.session.status, 'approved')
  })
})
