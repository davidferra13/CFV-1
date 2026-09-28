import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()
const watchdog = readFileSync(join(root, 'chefflow-watchdog.ps1'), 'utf8')
const bootstrap = readFileSync(join(root, 'scripts', 'ensure-production-tunnel.ps1'), 'utf8')
const prodRunner = readFileSync(join(root, 'scripts', 'run-next-prod.mjs'), 'utf8')
const rootLauncher = readFileSync(join(root, 'chefflow-launcher.vbs'), 'utf8')
const taskLauncher = readFileSync(join(root, 'scripts', 'watchdog-launcher.vbs'), 'utf8')
const autostart = readFileSync(join(root, 'install-autostart.ps1'), 'utf8')
const template = readFileSync(
  join(root, '.cloudflared', 'chefflow-prod.yml.example'),
  'utf8'
)

const prodTunnelId = '9dab6929-68e3-4775-9b8e-17482f714e83'

test('watchdog targets the canonical production tunnel and loopback origin', () => {
  assert.match(watchdog, /\$prodPort = 3100/)
  assert.ok(watchdog.includes(prodTunnelId))
  assert.ok(watchdog.includes('chefflow-prod.yml'))
  assert.ok(watchdog.includes("HOST = '127.0.0.1'"))
  assert.ok(watchdog.includes("NEXT_PUBLIC_APP_URL = 'https://app.cheflowhq.com'"))
  assert.ok(watchdog.includes('$configText.Contains("service: $originUrl")'))
  assert.ok(!watchdog.includes('f38df8e8-3b6d-463d-b39b-a9265ea5ebcd'))
})

test('watchdog and production runner never force-terminate foreign port owners', () => {
  assert.ok(!watchdog.includes('Stop-Process -Id $owner.ProcessId -Force'))
  assert.ok(watchdog.includes('leaving it untouched'))
  assert.ok(prodRunner.includes("process.env.PORT || '3100'"))
  assert.ok(prodRunner.includes('const foreignOwners = owners.filter((owner) => !isRepoOwned(owner))'))
  assert.ok(prodRunner.includes('refusing destructive cleanup'))
})

test('autostart launchers resolve their checkout instead of the dirty primary path', () => {
  for (const launcher of [rootLauncher, taskLauncher]) {
    assert.ok(launcher.includes('WScript.ScriptFullName'))
    assert.ok(!launcher.includes('C:\\Users\\david\\Documents\\CFv1'))
  }
  assert.ok(autostart.includes("Split-Path -Parent $MyInvocation.MyCommand.Path"))
  assert.ok(autostart.includes("$taskName       = 'ChefFlow-Watchdog'"))
})

test('tunnel bootstrap recovers credentials outside git and validates ingress', () => {
  assert.ok(bootstrap.includes('tunnel token --cred-file'))
  assert.ok(bootstrap.includes('ingress validate'))
  assert.ok(bootstrap.includes('.cloudflared\\chefflow-prod.yml'))
  assert.ok(template.includes('hostname: app.cheflowhq.com'))
  assert.ok(template.includes('hostname: cheflowhq.com'))
  assert.ok(template.includes('hostname: mc.cheflowhq.com'))
  assert.ok(template.includes('http_status:404'))
  assert.ok(!template.includes('eyJ'))
})
