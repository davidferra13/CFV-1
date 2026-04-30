import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { QueueRecord } from '../../lib/v1-builder/types'
import { ensureBuilderState, resolveBuilderPath } from '../../lib/v1-builder/store'

export async function createBuilderFixture() {
  const root = await mkdtemp(join(tmpdir(), 'v1-builder-'))
  await ensureBuilderState(root)
  return root
}

export function queueRecord(overrides: Partial<QueueRecord> = {}): QueueRecord {
  return {
    id: 'v1-fixture',
    createdAt: '2026-04-30T12:35:00.000Z',
    source: 'spec',
    sourcePath: 'docs/specs/private-dev-cockpit-consolidation.md',
    classification: 'approved_v1_blocker',
    activeLane: 'pricing-reliability',
    title: 'Fixture task',
    reason: 'Proves the V1 builder queue.',
    canonicalOwner: 'docs/specs/private-dev-cockpit-consolidation.md',
    dependencies: [],
    risk: 'low',
    status: 'queued',
    pricingRelevant: false,
    overrideId: null,
    ...overrides,
  }
}

export async function writeQueue(root: string, records: QueueRecord[]) {
  const lines = records.map((record) => JSON.stringify(record)).join('\n')
  await writeFile(resolveBuilderPath('approved-queue.jsonl', root), lines ? `${lines}\n` : '', 'utf-8')
}
