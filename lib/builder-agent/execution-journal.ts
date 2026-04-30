import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { JournalEntry, LoopState, RiskSeverity, TaskRun, TaskRunMode, TaskRunStatus } from './types'

export const DEFAULT_JOURNAL_DIR = join('memory', 'builder-agent', 'journal')

export function createRunId(prefix = 'builder-agent') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  return `${prefix}-${stamp}-${randomUUID().slice(0, 8)}`
}

export function createTaskRun(fields: {
  taskText: string
  mode: TaskRunMode
  status?: TaskRunStatus
  riskLevel?: RiskSeverity
  loopState?: LoopState
}): TaskRun {
  return {
    runId: createRunId(),
    taskText: fields.taskText,
    mode: fields.mode,
    status: fields.status ?? 'planned',
    startedAt: new Date().toISOString(),
    riskLevel: fields.riskLevel ?? 'low',
    loopState:
      fields.loopState ??
      {
        tripped: false,
        threshold: 3,
        failureCount: 0,
      },
  }
}

export function getJournalPath(runId: string, root = process.cwd(), journalDir = DEFAULT_JOURNAL_DIR) {
  return join(root, journalDir, `${runId}.jsonl`)
}

export function appendJournalEntry(
  entry: JournalEntry,
  root = process.cwd(),
  journalDir = DEFAULT_JOURNAL_DIR,
) {
  const path = getJournalPath(entry.runId, root, journalDir)
  mkdirSync(join(root, journalDir), { recursive: true })
  writeFileSync(path, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'a' })
  return path
}

export function appendRunEvent(
  runId: string,
  phase: string,
  message: string,
  options: { artifacts?: string[]; warnings?: string[] } = {},
  root = process.cwd(),
) {
  return appendJournalEntry(
    {
      runId,
      timestamp: new Date().toISOString(),
      phase,
      message,
      artifacts: options.artifacts ?? [],
      warnings: options.warnings ?? [],
    },
    root,
  )
}

export function readRunJournal(runId: string, root = process.cwd()): JournalEntry[] {
  const path = getJournalPath(runId, root)
  if (!existsSync(path)) return []

  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as JournalEntry)
}

export function finishRun(run: TaskRun, status: TaskRunStatus): TaskRun {
  return {
    ...run,
    status,
    endedAt: new Date().toISOString(),
  }
}

