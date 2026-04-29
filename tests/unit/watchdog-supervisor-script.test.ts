import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const supervisor = readFileSync(
  join(root, 'scripts/scheduled/watchdog-supervisor.ps1'),
  'utf8'
)
const registrar = readFileSync(
  join(root, 'scripts/scheduled/register-watchdog-supervisor.ps1'),
  'utf8'
)
const healthCheck = readFileSync(join(root, 'scripts/scheduled/prod-health-check.ps1'), 'utf8')

test('watchdog supervisor targets the existing watchdog without destructive recovery', () => {
  assert.match(supervisor, /chefflow-watchdog\.ps1/)
  assert.match(supervisor, /watchdog-launcher\.vbs/)
  assert.match(supervisor, /Start-ScheduledTask/)
  assert.match(supervisor, /Global\\ChefFlowWatchdogSupervisor/)
  assert.match(supervisor, /\[switch\]\$DryRun/)

  for (const forbidden of [
    'Stop-Process',
    'taskkill',
    'Restart-Service',
    'Stop-ScheduledTask',
    'Unregister-ScheduledTask',
  ]) {
    assert.equal(
      supervisor.includes(forbidden),
      false,
      `supervisor must not contain ${forbidden}`
    )
  }
})

test('watchdog supervisor writes current evidence for later health checks', () => {
  assert.match(supervisor, /watchdog-supervisor-latest\.json/)
  assert.match(supervisor, /watchdogProcessCountBefore/)
  assert.match(supervisor, /watchdogProcessCountAfter/)
  assert.match(supervisor, /watchdogPids/)
})

test('watchdog supervisor registration is hidden and single-instance', () => {
  assert.match(registrar, /ChefFlow-WatchdogSupervisor/)
  assert.match(registrar, /watchdog-supervisor\.ps1/)
  assert.match(registrar, /-WindowStyle Hidden/)
  assert.match(registrar, /-RepetitionInterval \(New-TimeSpan -Minutes 1\)/)
  assert.match(registrar, /-MultipleInstances IgnoreNew/)
  assert.match(registrar, /\[switch\]\$DryRun/)
})

test('production health check bridges prod failures to watchdog supervision', () => {
  assert.match(healthCheck, /watchdog-supervisor\.ps1/)
  assert.match(healthCheck, /WatchdogRecovery=/)
  assert.match(healthCheck, /\$prodStatus -ne "OK"/)
  assert.match(healthCheck, /\$tunnelStatus -ne "OK"/)

  for (const forbidden of ['Stop-Process', 'taskkill', 'Restart-Service']) {
    assert.equal(
      healthCheck.includes(forbidden),
      false,
      `health check recovery bridge must not contain ${forbidden}`
    )
  }
})
