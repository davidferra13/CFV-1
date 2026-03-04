export const LEGACY_SIGNIFICANT_TASK_TYPES = ['event.create_draft'] as const

function normalizeTaskType(taskType: string): string {
  return taskType.trim().toLowerCase()
}

export function buildSignificantApprovalPhrase(taskType: string): string {
  return `approve ${normalizeTaskType(taskType)}`
}

export function normalizeSignificantApprovalInput(input: string | null | undefined): string {
  if (!input) return ''
  return input.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function validateSignificantApprovalPhrase(input: {
  taskType: string
  provided: string | null | undefined
}): {
  valid: boolean
  expected: string
} {
  const expected = buildSignificantApprovalPhrase(input.taskType)
  const providedNormalized = normalizeSignificantApprovalInput(input.provided)
  return {
    valid: providedNormalized === expected,
    expected,
  }
}

export function isLegacySignificantTaskType(taskType: string): boolean {
  const normalized = normalizeTaskType(taskType)
  return LEGACY_SIGNIFICANT_TASK_TYPES.some((candidate) => candidate === normalized)
}
