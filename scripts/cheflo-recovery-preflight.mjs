import { execFileSync } from 'node:child_process'
import { statfsSync } from 'node:fs'
import os from 'node:os'
import process from 'node:process'

import { RECOVERY_LIMITS, evaluateRecoverySnapshot } from '../lib/recovery/runtime-safety.mjs'

function run(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function collectGitState() {
  return {
    branch: run('git', ['branch', '--show-current']),
    root: run('git', ['rev-parse', '--show-toplevel']),
    head: run('git', ['rev-parse', 'HEAD']),
  }
}
function collectWindowsMetrics(root) {
  const driveName = String(root).match(/^([A-Za-z]):/)?.[1] ?? 'C'
  const script = [
    '$node = @(Get-Process node -ErrorAction SilentlyContinue)',
    '$llama = @(Get-Process llama-server -ErrorAction SilentlyContinue)',
    '$os = Get-CimInstance Win32_OperatingSystem',
    `$disk = Get-PSDrive -Name '${driveName}'`,
    '$port = @(Get-NetTCPConnection -State Listen -LocalPort 3118 -ErrorAction SilentlyContinue)',
    '[pscustomobject]@{',
    'freeMemoryGb=[math]::Round($os.FreePhysicalMemory/1MB,2)',
    'freeDiskGb=[math]::Round($disk.Free/1GB,2)',
    'nodeCount=$node.Count',
    'nodeWorkingSetGb=[math]::Round((($node | Measure-Object WorkingSet64 -Sum).Sum/1GB),2)',
    'llamaCount=$llama.Count',
    'llamaWorkingSetGb=[math]::Round((($llama | Measure-Object WorkingSet64 -Sum).Sum/1GB),2)',
    'recoveryPortInUse=($port.Count -gt 0)',
    '} | ConvertTo-Json -Compress',
  ].join('\n')

  return JSON.parse(run('powershell', ['-NoProfile', '-Command', script]))
}
function collectPortableMetrics() {
  const disk = statfsSync(process.cwd())
  return {
    freeMemoryGb: Number((os.freemem() / 1024 ** 3).toFixed(2)),
    freeDiskGb: Number(((disk.bavail * disk.bsize) / 1024 ** 3).toFixed(2)),
    nodeCount: 1,
    nodeWorkingSetGb: Number((process.memoryUsage().rss / 1024 ** 3).toFixed(2)),
    llamaCount: 0,
    llamaWorkingSetGb: 0,
    recoveryPortInUse: false,
  }
}

export function collectRecoverySnapshot() {
  const git = collectGitState()
  const metrics =
    process.platform === 'win32' ? collectWindowsMetrics(git.root) : collectPortableMetrics()

  return { ...git, ...metrics }
}
const snapshot = collectRecoverySnapshot()
const result = evaluateRecoverySnapshot(snapshot)

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
} else {
  console.log('Cheflo recovery preflight')
  console.log('Branch: ' + snapshot.branch)
  console.log('HEAD: ' + snapshot.head)
  console.log('Free memory: ' + snapshot.freeMemoryGb + ' GB')
  console.log('Free disk: ' + snapshot.freeDiskGb + ' GB')
  console.log('Node: ' + snapshot.nodeCount + ' processes / ' + snapshot.nodeWorkingSetGb + ' GB')
  console.log(
    'Local models: ' + snapshot.llamaCount + ' processes / ' + snapshot.llamaWorkingSetGb + ' GB'
  )
  console.log(
    'Recovery port ' +
      RECOVERY_LIMITS.recoveryPort +
      ': ' +
      (snapshot.recoveryPortInUse ? 'busy' : 'free')
  )

  for (const issue of result.issues) {
    console.error('BLOCKED [' + issue.code + '] ' + issue.message)
  }
}

process.exitCode = result.safe ? 0 : 1
