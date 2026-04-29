import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { BreadcrumbEntry, BreadcrumbSession } from '@/lib/activity/breadcrumb-types'
import { analyzeDesirePaths } from '@/lib/activity/desire-paths'

function breadcrumb(
  id: string,
  path: string,
  type: BreadcrumbEntry['breadcrumb_type'] = 'page_view',
  createdAt = `2026-04-29T12:00:${id.padStart(2, '0')}.000Z`,
  label: string | null = null
): BreadcrumbEntry {
  return {
    id,
    tenant_id: 'tenant-1',
    actor_id: 'chef-1',
    breadcrumb_type: type,
    path,
    label,
    referrer_path: null,
    metadata: {},
    session_id: 'session-1',
    created_at: createdAt,
  }
}

function session(id: string, breadcrumbs: BreadcrumbEntry[]): BreadcrumbSession {
  return {
    session_id: id,
    started_at: breadcrumbs[0]?.created_at ?? '2026-04-29T12:00:00.000Z',
    ended_at: breadcrumbs[breadcrumbs.length - 1]?.created_at ?? '2026-04-29T12:00:00.000Z',
    duration_minutes: 1,
    breadcrumbs,
    page_count: breadcrumbs.filter((entry) => entry.breadcrumb_type === 'page_view').length,
    summary: 'test session',
  }
}

describe('analyzeDesirePaths', () => {
  it('summarizes page paths, reversals, loops, actions, and exits', () => {
    const insights = analyzeDesirePaths([
      session('session-1', [
        breadcrumb('1', '/dashboard'),
        breadcrumb('2', '/events'),
        breadcrumb('3', '/dashboard'),
        breadcrumb('4', '/clients'),
        breadcrumb('5', '/dashboard'),
        breadcrumb('6', '/events'),
        breadcrumb('7', '/events/abc', 'page_view', undefined, 'Johnson Wedding'),
        breadcrumb('8', '/events', 'click'),
      ]),
      session('session-2', [
        breadcrumb('9', '/dashboard'),
        breadcrumb('10', '/events'),
        breadcrumb('11', '/events/abc', 'page_view', undefined, 'Johnson Wedding'),
      ]),
    ])

    assert.equal(insights.sessionCount, 2)
    assert.equal(insights.breadcrumbCount, 11)
    assert.equal(insights.pageViewCount, 10)
    assert.equal(insights.interactionCount, 1)
    assert.equal(insights.hasEnoughData, true)
    assert.deepEqual(
      insights.topPages.map((page) => [page.path, page.count]),
      [
        ['/dashboard', 4],
        ['/events', 3],
        ['/events/abc', 2],
        ['/clients', 1],
      ]
    )
    assert.equal(insights.topPages[2].label, 'Johnson Wedding')
    assert.deepEqual(insights.topTransitions[0], {
      fromPath: '/dashboard',
      fromLabel: 'Dashboard',
      toPath: '/events',
      toLabel: 'Events',
      count: 3,
    })
    assert.deepEqual(insights.backtracks[0], {
      fromPath: '/events',
      fromLabel: 'Events',
      toPath: '/dashboard',
      toLabel: 'Dashboard',
      count: 1,
    })
    assert.deepEqual(insights.loops[0], {
      path: '/dashboard',
      label: 'Dashboard',
      sessions: 1,
      visits: 3,
    })
    assert.deepEqual(insights.interactionHotspots[0], {
      path: '/events',
      label: 'Events',
      count: 1,
    })
    assert.deepEqual(insights.exitPages[0], {
      path: '/events/abc',
      label: 'Johnson Wedding',
      count: 2,
    })
    assert.deepEqual(
      insights.recommendations.map((recommendation) => [
        recommendation.title,
        recommendation.href,
        recommendation.priority,
      ]),
      [
        ['Review this reversal', '/events', 'high'],
        ['Tighten this work surface', '/dashboard', 'medium'],
        ['Audit the main action path', '/events', 'medium'],
        ['Check the stop point', '/events/abc', 'low'],
      ]
    )
    assert.match(insights.recommendations[3].detail, /Johnson Wedding/)
  })

  it('fails closed until enough breadcrumb data exists', () => {
    const insights = analyzeDesirePaths([session('short', [breadcrumb('1', '/dashboard')])])

    assert.equal(insights.hasEnoughData, false)
    assert.equal(insights.topTransitions.length, 0)
    assert.equal(insights.backtracks.length, 0)
    assert.deepEqual(insights.recommendations, [
      {
        id: 'exit:/dashboard',
        title: 'Check the stop point',
        detail:
          'Dashboard is a common last page in sessions. Confirm it leaves the chef with a clear saved state or next action.',
        href: '/dashboard',
        priority: 'low',
      },
    ])
  })
})
