import { readFile, writeFile } from 'node:fs/promises'
import { runnerStatusSchema, type RunnerStatus } from './types'
import { pathExists, resolveBuilderPath } from './store'

export function defaultRunnerStatus(now = new Date()): RunnerStatus {
  return {
    status: 'idle',
    updatedAt: now.toISOString(),
    runnerId: 'v1-builder-local',
    pid: null,
    intervalSeconds: null,
    currentTaskId: null,
    lastTaskId: null,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastReceiptPath: null,
    lastPacketPath: null,
    lastError: null,
    executorCommand: null,
  }
}

export async function readRunnerStatus(root = process.cwd(), now = new Date()) {
  const path = resolveBuilderPath('runner-state.json', root)
  if (!(await pathExists(path))) return defaultRunnerStatus(now)

  const parsed = JSON.parse(await readFile(path, 'utf-8'))
  return runnerStatusSchema.parse(parsed)
}

export async function writeRunnerStatus(status: RunnerStatus, root = process.cwd()) {
  const path = resolveBuilderPath('runner-state.json', root)
  const parsed = runnerStatusSchema.parse(status)
  await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`, 'utf-8')
  return path
}
