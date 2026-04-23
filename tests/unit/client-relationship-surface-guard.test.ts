import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}

test('relationship route uses the shared snapshot instead of stitching competing loaders inline', () => {
  const relationshipPage = read('app/(chef)/clients/[id]/relationship/page.tsx')
  const snapshotBuilder = read('lib/clients/relationship-snapshot.ts')

  assert.match(relationshipPage, /getClientRelationshipSnapshot/)
  assert.match(relationshipPage, /getRelationshipRouteCopy/)
  assert.doesNotMatch(relationshipPage, /function getRelationshipHeading/)
  assert.doesNotMatch(relationshipPage, /getClientPatterns/)
  assert.doesNotMatch(relationshipPage, /getClientHistory/)
  assert.doesNotMatch(relationshipPage, /getRepeatClientIntelligence/)
  assert.doesNotMatch(relationshipPage, /getClientIntelligenceContext/)

  assert.match(snapshotBuilder, /getClientPatterns/)
  assert.match(snapshotBuilder, /learnClientPreferences/)
  assert.match(snapshotBuilder, /getClientHistory/)
  assert.match(snapshotBuilder, /getRepeatClientIntelligence/)
  assert.match(snapshotBuilder, /getClientIntelligenceContext/)
})
