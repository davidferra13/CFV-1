import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const platformStatsSource = readFileSync(
  resolve(process.cwd(), 'lib/admin/platform-stats.ts'),
  'utf-8'
)
const auditPageSource = readFileSync(
  resolve(process.cwd(), 'app/(admin)/admin/audit/page.tsx'),
  'utf-8'
)
const auditLogSource = readFileSync(
  resolve(process.cwd(), 'app/(admin)/admin/audit/log.tsx'),
  'utf-8'
)
const ownerObservabilitySource = readFileSync(
  resolve(process.cwd(), 'lib/admin/owner-observability.ts'),
  'utf-8'
)

test('platform audit log supports operator filters', () => {
  assert.match(platformStatsSource, /PlatformAuditLogFilters/)
  assert.match(platformStatsSource, /actorEmail/)
  assert.match(platformStatsSource, /actionType/)
  assert.match(platformStatsSource, /targetType/)
  assert.match(platformStatsSource, /targetId/)
  assert.match(platformStatsSource, /\.gte\('ts'/)
  assert.match(platformStatsSource, /\.lte\('ts'/)
  assert.match(platformStatsSource, /normalizeAuditDateEnd/)
  assert.match(platformStatsSource, /Failed to load admin audit log/)
})

test('admin audit page exposes filter controls and target pivots', () => {
  for (const name of ['actorEmail', 'actionType', 'targetType', 'targetId', 'from', 'to']) {
    assert.match(auditPageSource, new RegExp(`name="${name}"`))
  }

  assert.match(auditLogSource, /getTargetHref/)
  assert.match(auditLogSource, /\/admin\/users\/\$\{targetId\}/)
  assert.match(auditLogSource, /\/admin\/conversations\/\$\{targetId\}/)
  assert.match(auditLogSource, /\/admin\/hub\/groups\/\$\{targetId\}/)
  assert.match(auditLogSource, /conversationId/)
  assert.match(auditLogSource, /groupId/)
  assert.match(auditLogSource, /includeDeleted=1/)
  assert.match(ownerObservabilitySource, /id\.eq\.\$\{q\},body\.ilike/)
})
