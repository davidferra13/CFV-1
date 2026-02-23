// Incident Report System — Local File-Based Failure Reports
// No 'use server' — utility module, importable from any server-side context.
//
// Writes human-readable Markdown reports to data/incidents/ on the developer's PC.
// Organized by system (ollama/, queue/, circuit-breaker/, health/, webhook/)
// and by date (YYYY-MM-DD/) within each system folder.
//
// PURPOSE: When something fails, a report is written so the developer can
// browse the folder, see what went wrong, and understand the context.
// Console logs are ephemeral — these reports persist.
//
// PRIVACY: No PII is written to reports. Only system/operational data.
// COST: $0 — local filesystem, no external calls.

import * as fs from 'fs'
import * as path from 'path'

// ============================================
// TYPES
// ============================================

export type IncidentSeverity = 'info' | 'warning' | 'error' | 'critical'

export type IncidentSystem =
  | 'ollama'
  | 'queue'
  | 'circuit-breaker'
  | 'health'
  | 'webhook'
  | 'general'

export interface IncidentReport {
  /** Severity level — how bad is this? */
  severity: IncidentSeverity
  /** Which system failed */
  system: IncidentSystem
  /** Short title — what happened (e.g., "Ollama Timeout") */
  title: string
  /** Human-readable description of what went wrong */
  description: string
  /** The raw error message, if any */
  error?: string
  /** Which endpoint was involved */
  endpoint?: 'pc' | 'pi' | 'unknown'
  /** Additional context (task IDs, durations, attempt counts, etc.) */
  context?: Record<string, unknown>
  /** What should be done about it */
  suggestedAction?: string
}

// ============================================
// CONSTANTS
// ============================================

const INCIDENTS_DIR = path.join(process.cwd(), 'data', 'incidents')

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  info: 'INFO',
  warning: 'WARNING',
  error: 'ERROR',
  critical: 'CRITICAL',
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Write an incident report to disk as a Markdown file.
 * Non-blocking — wraps in try/catch so it never crashes the caller.
 *
 * File goes to: data/incidents/{system}/{YYYY-MM-DD}/{HH-MM-SS}_{slug}.md
 */
export function writeIncident(report: IncidentReport): string | null {
  try {
    const now = new Date()
    const dateStr = formatDate(now)
    const timeStr = formatTime(now)
    const slug = slugify(report.title)

    const systemDir = path.join(INCIDENTS_DIR, report.system, dateStr)
    fs.mkdirSync(systemDir, { recursive: true })

    const filename = `${timeStr}_${slug}.md`
    const filepath = path.join(systemDir, filename)

    const content = formatMarkdown(report, now)
    fs.writeFileSync(filepath, content, 'utf-8')

    // Also append to the daily index for quick scanning
    appendToDailyIndex(report, now, filename)

    return filepath
  } catch (err) {
    // Incident reporting must NEVER crash the app
    console.error('[incident-reporter] Failed to write incident report:', err)
    return null
  }
}

/**
 * Convenience: report an Ollama failure.
 */
export function reportOllamaFailure(opts: {
  title: string
  error: string
  endpoint: 'pc' | 'pi'
  context?: Record<string, unknown>
}): string | null {
  return writeIncident({
    severity: 'error',
    system: 'ollama',
    title: opts.title,
    description: `Ollama on ${opts.endpoint.toUpperCase()} failed: ${opts.error}`,
    error: opts.error,
    endpoint: opts.endpoint,
    context: opts.context,
    suggestedAction:
      opts.endpoint === 'pc'
        ? 'Check if Ollama is running on this machine. Run: ollama list'
        : 'Check if the Raspberry Pi is reachable. Run: ping 10.0.0.177',
  })
}

/**
 * Convenience: report a queue task failure.
 */
export function reportTaskFailure(opts: {
  taskType: string
  taskId: string
  error: string
  endpoint: 'pc' | 'pi'
  attempt: number
  maxAttempts: number
  durationMs: number
  isDead?: boolean
}): string | null {
  const isDead = opts.isDead ?? opts.attempt >= opts.maxAttempts
  return writeIncident({
    severity: isDead ? 'error' : 'warning',
    system: 'queue',
    title: isDead ? `Task Dead: ${opts.taskType}` : `Task Failed: ${opts.taskType}`,
    description: isDead
      ? `Task ${opts.taskType} exhausted all ${opts.maxAttempts} attempts and moved to dead letter queue.`
      : `Task ${opts.taskType} failed on attempt ${opts.attempt}/${opts.maxAttempts}. Will retry.`,
    error: opts.error,
    endpoint: opts.endpoint,
    context: {
      taskId: opts.taskId,
      taskType: opts.taskType,
      attempt: opts.attempt,
      maxAttempts: opts.maxAttempts,
      durationMs: opts.durationMs,
      movedToDLQ: isDead,
    },
    suggestedAction: isDead
      ? 'Check the dead letter queue in the database. Review the error and decide whether to retry manually.'
      : 'Task will retry automatically. Monitor for repeated failures.',
  })
}

/**
 * Convenience: report a circuit breaker state change.
 */
export function reportCircuitBreakerChange(opts: {
  service: string
  from: string
  to: string
  failures?: number
}): string | null {
  const isOpening = opts.to === 'OPEN'
  return writeIncident({
    severity: isOpening ? 'error' : 'info',
    system: 'circuit-breaker',
    title: isOpening ? `Circuit OPEN: ${opts.service}` : `Circuit ${opts.to}: ${opts.service}`,
    description: isOpening
      ? `Circuit breaker for "${opts.service}" tripped after ${opts.failures ?? '?'} consecutive failures. All requests will fast-fail until the circuit resets.`
      : `Circuit breaker for "${opts.service}" transitioned from ${opts.from} to ${opts.to}.`,
    context: {
      service: opts.service,
      previousState: opts.from,
      newState: opts.to,
      consecutiveFailures: opts.failures,
    },
    suggestedAction: isOpening
      ? `The ${opts.service} service is down or unreachable. Check connectivity and service status.`
      : undefined,
  })
}

/**
 * Convenience: report a health check finding.
 */
export function reportHealthDegraded(opts: {
  pcHealthy: boolean
  piHealthy: boolean
  pcLatencyMs?: number | null
  piLatencyMs?: number | null
  error?: string
}): string | null {
  const bothDown = !opts.pcHealthy && !opts.piHealthy
  return writeIncident({
    severity: bothDown ? 'critical' : 'warning',
    system: 'health',
    title: bothDown ? 'All Ollama Endpoints Offline' : 'Ollama Degraded',
    description: bothDown
      ? 'Both PC and Pi Ollama endpoints are unreachable. No AI processing is possible.'
      : `Ollama is running in degraded mode. PC: ${opts.pcHealthy ? 'OK' : 'DOWN'}, Pi: ${opts.piHealthy ? 'OK' : 'DOWN'}.`,
    error: opts.error,
    context: {
      pc: { healthy: opts.pcHealthy, latencyMs: opts.pcLatencyMs },
      pi: { healthy: opts.piHealthy, latencyMs: opts.piLatencyMs },
    },
    suggestedAction: bothDown
      ? 'Start Ollama on the PC (run: ollama serve) or check Pi connectivity (ping 10.0.0.177).'
      : 'The down endpoint will be skipped. Tasks will route to the healthy endpoint.',
  })
}

/**
 * Convenience: report a worker slot backoff (per-slot circuit breaker).
 */
export function reportWorkerBackoff(opts: {
  endpoint: 'pc' | 'pi'
  consecutiveFailures: number
  backoffUntil: Date
}): string | null {
  return writeIncident({
    severity: 'error',
    system: 'queue',
    title: `Worker Backoff: ${opts.endpoint.toUpperCase()} slot`,
    description:
      `The ${opts.endpoint.toUpperCase()} worker slot hit ${opts.consecutiveFailures} consecutive failures ` +
      `and is backing off until ${opts.backoffUntil.toISOString()}.`,
    endpoint: opts.endpoint,
    context: {
      consecutiveFailures: opts.consecutiveFailures,
      backoffUntil: opts.backoffUntil.toISOString(),
    },
    suggestedAction: `Check why tasks are failing on the ${opts.endpoint.toUpperCase()} endpoint. The slot will resume automatically after the backoff period.`,
  })
}

// ============================================
// FORMATTING
// ============================================

function formatMarkdown(report: IncidentReport, timestamp: Date): string {
  const lines: string[] = []

  lines.push(`# ${SEVERITY_LABELS[report.severity]} — ${report.title}`)
  lines.push('')
  lines.push(`**Time:** ${timestamp.toISOString()}`)
  lines.push(`**Severity:** ${report.severity}`)
  lines.push(`**System:** ${report.system}`)
  if (report.endpoint) {
    lines.push(
      `**Endpoint:** ${report.endpoint.toUpperCase()}${report.endpoint === 'pc' ? ' (localhost:11434)' : ' (10.0.0.177:11434)'}`
    )
  }
  lines.push('')

  lines.push('## What Happened')
  lines.push('')
  lines.push(report.description)
  lines.push('')

  if (report.error) {
    lines.push('## Error Details')
    lines.push('')
    lines.push('```')
    lines.push(report.error)
    lines.push('```')
    lines.push('')
  }

  if (report.context && Object.keys(report.context).length > 0) {
    lines.push('## Context')
    lines.push('')
    for (const [key, value] of Object.entries(report.context)) {
      const display = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
      lines.push(`- **${key}:** ${display}`)
    }
    lines.push('')
  }

  if (report.suggestedAction) {
    lines.push('## Suggested Action')
    lines.push('')
    lines.push(report.suggestedAction)
    lines.push('')
  }

  lines.push('---')
  lines.push(`*Generated by ChefFlow Incident Reporter at ${timestamp.toLocaleString()}*`)
  lines.push('')

  return lines.join('\n')
}

/**
 * Appends a one-line summary to the daily index file for quick scanning.
 * File: data/incidents/_daily/{YYYY-MM-DD}.md
 */
function appendToDailyIndex(report: IncidentReport, timestamp: Date, filename: string): void {
  try {
    const dailyDir = path.join(INCIDENTS_DIR, '_daily')
    fs.mkdirSync(dailyDir, { recursive: true })

    const dateStr = formatDate(timestamp)
    const indexPath = path.join(dailyDir, `${dateStr}.md`)
    const timeStr = formatTime(timestamp).replace(/-/g, ':')

    // Create header if file is new
    let needsHeader = false
    try {
      fs.accessSync(indexPath)
    } catch {
      needsHeader = true
    }

    const line = `| ${timeStr} | ${SEVERITY_LABELS[report.severity]} | ${report.system} | ${report.endpoint?.toUpperCase() ?? '—'} | ${report.title} | \`${report.system}/${dateStr}/${filename}\` |\n`

    if (needsHeader) {
      const header =
        `# Incident Log — ${dateStr}\n\n` +
        `| Time | Severity | System | Endpoint | Title | Report File |\n` +
        `|------|----------|--------|----------|-------|-------------|\n`
      fs.writeFileSync(indexPath, header + line, 'utf-8')
    } else {
      fs.appendFileSync(indexPath, line, 'utf-8')
    }
  } catch (err) {
    console.error('[incident-reporter] Failed to update daily index:', err)
  }
}

// ============================================
// HELPERS
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatTime(date: Date): string {
  return date.toTimeString().split(' ')[0].replace(/:/g, '-')
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}
