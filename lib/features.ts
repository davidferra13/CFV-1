export const COMM_TRIAGE_ENABLED = process.env.COMM_TRIAGE_ENABLED === 'true'
export const OPS_COPILOT_ENABLED = process.env.OPS_COPILOT_ENABLED === 'true'

type OpsAutonomyLevel = 0 | 1 | 2

function parseOpsAutonomyLevel(raw: string | undefined): OpsAutonomyLevel {
  if (raw === '1') return 1
  if (raw === '2') return 2
  return 0
}

export const OPS_AUTONOMY_LEVEL = parseOpsAutonomyLevel(process.env.OPS_AUTONOMY_LEVEL)

export function isCommTriageEnabled() {
  return COMM_TRIAGE_ENABLED
}

export function isOpsCopilotEnabled() {
  return OPS_COPILOT_ENABLED
}
