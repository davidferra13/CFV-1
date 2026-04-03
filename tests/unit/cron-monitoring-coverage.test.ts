import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { CRON_MONITOR_DEFINITIONS } from '../../lib/cron/definitions'

const API_ROOT = path.join(process.cwd(), 'app', 'api')
const ALLOWED_UNREGISTERED_CRONS = new Set(['monitor', 'simulation'])

function walkRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkRouteFiles(fullPath))
      continue
    }
    if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath)
    }
  }

  return files
}

function getScheduledRouteFiles(): string[] {
  return walkRouteFiles(API_ROOT).filter((filePath) =>
    /app[\\/]api[\\/](scheduled|cron|gmail[\\/]sync)[\\/]/.test(filePath)
  )
}

function isInstrumented(content: string): boolean {
  return (
    /runMonitoredCronJob\(/.test(content) ||
    (/recordCronHeartbeat\(/.test(content) && /recordCronError\(/.test(content))
  )
}

function extractCronNames(content: string): string[] {
  const names = new Set<string>()
  const matcher = /(runMonitoredCronJob|recordCronHeartbeat|recordCronError)\('([^']+)'/g
  let match: RegExpExecArray | null

  while ((match = matcher.exec(content))) {
    names.add(match[2])
  }

  return [...names]
}

test('scheduled routes record both success and failure cron telemetry', () => {
  const uncovered = getScheduledRouteFiles()
    .filter((filePath) => !isInstrumented(fs.readFileSync(filePath, 'utf8')))
    .map((filePath) => path.relative(process.cwd(), filePath).replace(/\\/g, '/'))
    .sort()

  assert.deepEqual(uncovered, [])
})

test('monitored cron names are registered in the shared monitor definitions', () => {
  const registered = new Set(CRON_MONITOR_DEFINITIONS.map((definition) => definition.cronName))
  const unregistered = new Set<string>()

  for (const filePath of getScheduledRouteFiles()) {
    const content = fs.readFileSync(filePath, 'utf8')
    for (const cronName of extractCronNames(content)) {
      if (!registered.has(cronName) && !ALLOWED_UNREGISTERED_CRONS.has(cronName)) {
        unregistered.add(cronName)
      }
    }
  }

  assert.deepEqual([...unregistered].sort(), [])
})
