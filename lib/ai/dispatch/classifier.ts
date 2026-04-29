import { getAiToolPermission, hasAiToolPermission } from '../tool-permission-manifest'
import type { AiDispatchRequest, AiTaskClassification, AiTaskClass } from './types'

const DETERMINISTIC_TASK_TYPES = new Set([
  'analytics.break_even',
  'calendar.availability',
  'calendar.check',
  'finance.break_even',
  'ops.portion_calc',
  'ops.portion_scale',
])

const WRITE_MARKERS = ['agent.', 'create', 'update', 'edit', 'change', 'schedule', 'record', 'log']
const READ_MARKERS = ['search', 'list', 'lookup', 'status', 'summary', 'details', 'check']
const PARSE_MARKERS = ['parse', 'classify', 'extract']
const GENERATION_MARKERS = ['draft', 'generate', 'rewrite', 'summarize']

function normalizeTaskType(taskType?: string): string {
  return taskType?.trim().toLowerCase() ?? ''
}

function hasMarker(taskType: string, markers: string[]): boolean {
  return markers.some((marker) => taskType.includes(marker))
}

function classification(
  taskClass: AiTaskClass,
  input: {
    requiresLlm: boolean
    mutatesState: boolean
    needsApproval: boolean
    reason: string
  }
): AiTaskClassification {
  return {
    taskClass,
    requiresLlm: input.requiresLlm,
    mutatesState: input.mutatesState,
    needsApproval: input.needsApproval,
    reasons: [input.reason],
  }
}

export function classifyAiTask(input: AiDispatchRequest): AiTaskClassification {
  const taskType = normalizeTaskType(input.taskType)
  const source = input.source?.trim().toLowerCase() ?? ''
  const surface = input.surface?.trim().toLowerCase() ?? ''

  if (DETERMINISTIC_TASK_TYPES.has(taskType)) {
    return classification('deterministic', {
      requiresLlm: false,
      mutatesState: false,
      needsApproval: false,
      reason: 'Task is explicitly classified as deterministic.',
    })
  }

  if (hasAiToolPermission(taskType)) {
    const permission = getAiToolPermission(taskType)

    if (permission.writes.length > 0) {
      return classification('write', {
        requiresLlm: true,
        mutatesState: true,
        needsApproval: permission.requiresApproval,
        reason: `Permission manifest declares writes to ${permission.writes.join(', ')}.`,
      })
    }

    if (permission.reads.length > 0) {
      return classification('read', {
        requiresLlm: true,
        mutatesState: false,
        needsApproval: permission.requiresApproval,
        reason: `Permission manifest declares reads from ${permission.reads.join(', ')}.`,
      })
    }

    if (permission.requiresApproval) {
      return classification('orchestration', {
        requiresLlm: true,
        mutatesState: false,
        needsApproval: true,
        reason: 'Permission manifest requires approval for this AI task.',
      })
    }
  }

  if (taskType.startsWith('agent.') || hasMarker(taskType, WRITE_MARKERS)) {
    return classification('write', {
      requiresLlm: true,
      mutatesState: true,
      needsApproval: true,
      reason: 'Task writes or prepares a state mutation.',
    })
  }

  if (hasMarker(taskType, PARSE_MARKERS)) {
    return classification('parse', {
      requiresLlm: true,
      mutatesState: false,
      needsApproval: false,
      reason: 'Task performs extraction or structured parsing.',
    })
  }

  if (
    source.includes('queue') ||
    source.includes('scheduled') ||
    source.includes('reactive') ||
    surface.includes('automation')
  ) {
    return classification('automation', {
      requiresLlm: true,
      mutatesState: false,
      needsApproval: false,
      reason: 'Task is background workflow intelligence.',
    })
  }

  if (hasMarker(taskType, GENERATION_MARKERS)) {
    return classification('generation', {
      requiresLlm: true,
      mutatesState: false,
      needsApproval: false,
      reason: 'Task generates or rewrites content.',
    })
  }

  if (surface.includes('remy') || hasMarker(taskType, READ_MARKERS)) {
    return classification('read', {
      requiresLlm: true,
      mutatesState: false,
      needsApproval: false,
      reason: 'Task reads and interprets existing context.',
    })
  }

  return classification('orchestration', {
    requiresLlm: true,
    mutatesState: false,
    needsApproval: false,
    reason: 'Task coordinates other intelligence paths.',
  })
}
