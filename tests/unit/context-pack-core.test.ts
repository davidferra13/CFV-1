import test from 'node:test'
import assert from 'node:assert/strict'
import { buildContextPack } from '../../scripts/lib/context-pack-core.mjs'

test('buildContextPack includes queue items, workspace state, and finish gate expectations', () => {
  const pack = buildContextPack({
    runId: 'RUN-123',
    generatedAt: '2026-05-15T00:00:00.000Z',
    gitStatus: ' M package.json',
    queueStatus: 'active: 2',
    domainPlan: 'theme lane',
    workspace: 'dirty workspace',
    firePlan: '# Fire Plan',
    items: [
      {
        id: 'BQ-1',
        status: 'in-flight',
        path: '.agents/build-queue/in-flight/BQ-1.md',
        content: 'Acceptance Criteria',
      },
    ],
  })

  assert.match(pack, /Run ID: RUN-123/)
  assert.match(pack, /BQ-1/)
  assert.match(pack, /Dirty Workspace Snapshot/)
  assert.match(pack, /file ownership boundaries/i)
  assert.match(pack, /requireAdmin/)
  assert.match(pack, /finish-check/)
})
