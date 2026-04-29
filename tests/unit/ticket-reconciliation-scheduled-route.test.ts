import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { CRON_MONITOR_DEFINITIONS } from '../../lib/cron/definitions'

const routePath = path.join(
  process.cwd(),
  'app',
  'api',
  'scheduled',
  'ticket-reconciliation',
  'route.ts'
)

test('ticket reconciliation scheduled route uses cron auth and monitored heartbeat', () => {
  const source = fs.readFileSync(routePath, 'utf8')

  assert.match(source, /verifyCronAuth\(request\.headers\.get\('authorization'\)\)/)
  assert.match(source, /runMonitoredCronJob\(CRON_NAME/)
  assert.match(source, /runTicketReconciliationAudit\(\)/)
  assert.match(source, /export \{ handleTicketReconciliation as GET, handleTicketReconciliation as POST \}/)
})

test('ticket reconciliation cron is registered with monitor definitions', () => {
  const definition = CRON_MONITOR_DEFINITIONS.find(
    (entry) => entry.cronName === 'ticket-reconciliation'
  )

  assert.deepEqual(definition, {
    cronName: 'ticket-reconciliation',
    routePath: '/api/scheduled/ticket-reconciliation',
    maxExpectedMinutes: 120,
    cadence: 'hourly',
    description: 'Audit event ticket inventory against orders and reservations',
  })
})
