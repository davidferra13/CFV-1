import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { collectNavRouteEntries } from '@/components/navigation/nav-config'
import { ROUTE_REGISTRY } from '@/lib/navigation/route-registry'

describe('Route Registry Coverage', () => {
  it('covers every normalized nav route', () => {
    const registryPaths = new Set(ROUTE_REGISTRY.map((route) => route.path))
    const missingPaths = collectNavRouteEntries()
      .map((entry) => entry.href)
      .filter((path, index, all) => all.indexOf(path) === index)
      .filter((path) => !registryPaths.has(path))

    assert.deepEqual(
      missingPaths,
      [],
      `Missing nav routes in ROUTE_REGISTRY:\n${missingPaths.join('\n')}`
    )
  })
})
