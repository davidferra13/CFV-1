import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getRemyNavigationRouteFromTasks,
  normalizeRemyNavigationRoute,
} from '@/lib/ai/remy-navigation'

const ROOT = join(__dirname, '..', '..')

describe('Remy navigation', () => {
  it('normalizes natural navigation targets to app routes', () => {
    assert.equal(normalizeRemyNavigationRoute('events'), '/events')
    assert.equal(normalizeRemyNavigationRoute('my recipe book'), '/recipes')
    assert.equal(normalizeRemyNavigationRoute('the client list page'), '/clients')
    assert.equal(normalizeRemyNavigationRoute('/events?tab=prep'), '/events?tab=prep')
  })

  it('rejects unsafe or unknown destinations', () => {
    assert.equal(normalizeRemyNavigationRoute('https://example.com'), null)
    assert.equal(normalizeRemyNavigationRoute('//example.com'), null)
    assert.equal(normalizeRemyNavigationRoute('does not exist'), null)
  })

  it('extracts only completed nav.go task routes', () => {
    assert.equal(
      getRemyNavigationRouteFromTasks([
        {
          taskId: 't1',
          taskType: 'nav.go',
          tier: 1,
          name: 'Navigate',
          status: 'done',
          data: { route: 'calendar' },
        },
      ]),
      '/calendar'
    )

    assert.equal(
      getRemyNavigationRouteFromTasks([
        {
          taskId: 't1',
          taskType: 'nav.go',
          tier: 1,
          name: 'Navigate',
          status: 'error',
          data: { route: 'calendar' },
        },
      ]),
      null
    )
  })

  it('connects the command executor to the drawer router', () => {
    const orchestrator = readFileSync(join(ROOT, 'lib/ai/command-orchestrator.ts'), 'utf8')
    const hook = readFileSync(join(ROOT, 'lib/hooks/use-remy-send.ts'), 'utf8')

    assert.match(orchestrator, /normalizeRemyNavigationRoute\(inputs\.route\)/)
    assert.match(hook, /scheduleNavigationFromTasks\(tasks\)/)
  })
})
