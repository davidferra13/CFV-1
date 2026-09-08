export const RECOVERY_LIMITS = Object.freeze({
  minimumFreeMemoryGb: 16,
  minimumFreeDiskGb: 25,
  maxNodeProcesses: 48,
  maxNodeWorkingSetGb: 16,
  maxLlamaProcesses: 2,
  maxLlamaWorkingSetGb: 8,
  maxNodeHeapMb: 4096,
  maxTestWorkers: 1,
  recoveryPort: 3118,
  allowedBranchPrefix: 'codex/cheflo-recovery-',
})

export const ALLOWED_RECOVERY_SCRIPTS = Object.freeze([
  'test:recovery-safety',
  'test:unit:fsm',
  'test:critical',
  'typecheck:app',
  'regression:firewall:fast',
])

function finiteNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}
export function evaluateRecoverySnapshot(snapshot, limits = RECOVERY_LIMITS) {
  const issues = []
  const branch = String(snapshot.branch ?? '')

  if (!branch.startsWith(limits.allowedBranchPrefix)) {
    issues.push({
      code: 'unsafe_branch',
      message: `Recovery must run from ${limits.allowedBranchPrefix}*, not ${branch || 'unknown'}.`,
    })
  }

  const comparisons = [
    [
      'low_free_memory',
      'Free memory',
      snapshot.freeMemoryGb,
      limits.minimumFreeMemoryGb,
      'minimum',
    ],
    ['low_free_disk', 'Free disk', snapshot.freeDiskGb, limits.minimumFreeDiskGb, 'minimum'],
    [
      'node_process_count',
      'Node process count',
      snapshot.nodeCount,
      limits.maxNodeProcesses,
      'maximum',
    ],
    [
      'node_memory',
      'Node working set',
      snapshot.nodeWorkingSetGb,
      limits.maxNodeWorkingSetGb,
      'maximum',
    ],
    [
      'llama_process_count',
      'Local-model process count',
      snapshot.llamaCount,
      limits.maxLlamaProcesses,
      'maximum',
    ],
    [
      'llama_memory',
      'Local-model working set',
      snapshot.llamaWorkingSetGb,
      limits.maxLlamaWorkingSetGb,
      'maximum',
    ],
  ]
  for (const [code, label, actualValue, limitValue, kind] of comparisons) {
    const actual = finiteNumber(actualValue)
    const violated = kind === 'minimum' ? actual < limitValue : actual > limitValue
    if (violated) {
      issues.push({
        code,
        message: `${label} is ${actual}; recovery ${kind} is ${limitValue}.`,
      })
    }
  }

  if (snapshot.recoveryPortInUse) {
    issues.push({
      code: 'recovery_port_in_use',
      message: `Recovery port ${limits.recoveryPort} is already in use.`,
    })
  }

  return {
    safe: issues.length === 0,
    issues,
    limits,
    snapshot,
  }
}
export function isAllowedRecoveryScript(scriptName) {
  return ALLOWED_RECOVERY_SCRIPTS.includes(String(scriptName ?? ''))
}

export function createRecoveryEnvironment(baseEnvironment = process.env) {
  const existingNodeOptions = String(baseEnvironment.NODE_OPTIONS ?? '')
    .replace(/--max-old-space-size(?:=|\s+)\d+/g, '')
    .trim()
  const heapLimit = `--max-old-space-size=${RECOVERY_LIMITS.maxNodeHeapMb}`

  return {
    ...baseEnvironment,
    CHEFFLOW_RECOVERY_MODE: '1',
    CI: '1',
    PLAYWRIGHT_WORKERS: String(RECOVERY_LIMITS.maxTestWorkers),
    NODE_OPTIONS: [existingNodeOptions, heapLimit].filter(Boolean).join(' '),
  }
}
