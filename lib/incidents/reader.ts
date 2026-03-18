'use server'

// Incident Reader - Server Action
// Reads incident reports from data/incidents/ for the dashboard UI.

import * as fs from 'fs'
import * as path from 'path'
import type { IncidentSeverity, IncidentSystem } from './reporter'

// ============================================
// TYPES (for the dashboard)
// ============================================

export interface IncidentSummary {
  /** File path relative to data/incidents/ */
  file: string
  /** Full system path (for reading content) */
  fullPath: string
  /** System folder (ollama, queue, circuit-breaker, health) */
  system: IncidentSystem
  /** Date folder (YYYY-MM-DD) */
  date: string
  /** Time from filename (HH-MM-SS) */
  time: string
  /** Parsed title from filename slug */
  slug: string
  /** Severity parsed from file content (first line) */
  severity: IncidentSeverity
  /** Full title parsed from file content */
  title: string
}

export interface IncidentDashboardData {
  /** All incidents, newest first */
  incidents: IncidentSummary[]
  /** Count by severity */
  bySeverity: Record<IncidentSeverity, number>
  /** Count by system */
  bySystem: Record<string, number>
  /** Available dates (for filtering) */
  dates: string[]
  /** Total count */
  total: number
}

// ============================================
// PUBLIC API
// ============================================

const INCIDENTS_DIR = path.join(process.cwd(), 'data', 'incidents')

/**
 * Read all incidents for the dashboard.
 * Returns structured data for rendering.
 */
export async function getIncidentDashboard(filters?: {
  date?: string
  system?: string
  severity?: string
}): Promise<IncidentDashboardData> {
  const empty: IncidentDashboardData = {
    incidents: [],
    bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
    bySystem: {},
    dates: [],
    total: 0,
  }

  try {
    if (!fs.existsSync(INCIDENTS_DIR)) return empty
  } catch {
    return empty
  }

  const incidents: IncidentSummary[] = []
  const systems: IncidentSystem[] = [
    'ollama',
    'queue',
    'circuit-breaker',
    'health',
    'webhook',
    'general',
  ]

  for (const system of systems) {
    const systemDir = path.join(INCIDENTS_DIR, system)
    if (!fs.existsSync(systemDir)) continue

    // Filter by system if requested
    if (filters?.system && filters.system !== system) continue

    const dateDirs = safeReaddir(systemDir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))

    for (const dateDir of dateDirs) {
      // Filter by date if requested
      if (filters?.date && filters.date !== dateDir) continue

      const datePath = path.join(systemDir, dateDir)
      const files = safeReaddir(datePath).filter((f) => f.endsWith('.md'))

      for (const file of files) {
        const fullPath = path.join(datePath, file)
        const parsed = parseFilename(file)
        if (!parsed) continue

        // Read first line to get severity and title
        const { severity, title } = parseFirstLine(fullPath)

        // Filter by severity if requested
        if (filters?.severity && filters.severity !== severity) continue

        incidents.push({
          file: `${system}/${dateDir}/${file}`,
          fullPath,
          system: system as IncidentSystem,
          date: dateDir,
          time: parsed.time,
          slug: parsed.slug,
          severity,
          title,
        })
      }
    }
  }

  // Sort newest first
  incidents.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.time.localeCompare(a.time)
  })

  // Compute aggregates
  const bySeverity: Record<IncidentSeverity, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
  }
  const bySystem: Record<string, number> = {}
  const dateSet = new Set<string>()

  for (const inc of incidents) {
    bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1
    bySystem[inc.system] = (bySystem[inc.system] || 0) + 1
    dateSet.add(inc.date)
  }

  return {
    incidents,
    bySeverity,
    bySystem,
    dates: [...dateSet].sort().reverse(),
    total: incidents.length,
  }
}

/**
 * Read the full content of a specific incident report.
 */
export async function getIncidentContent(filePath: string): Promise<string> {
  try {
    // Security: ensure the path is within data/incidents/
    const resolved = path.resolve(filePath)
    const incidentsResolved = path.resolve(INCIDENTS_DIR)
    if (!resolved.startsWith(incidentsResolved)) {
      return 'Access denied: path is outside incidents directory.'
    }

    if (!fs.existsSync(resolved)) return 'Report file not found.'
    return fs.readFileSync(resolved, 'utf-8')
  } catch {
    return 'Failed to read incident report.'
  }
}

// ============================================
// HELPERS
// ============================================

function safeReaddir(dir: string): string[] {
  try {
    return fs.readdirSync(dir)
  } catch {
    return []
  }
}

function parseFilename(filename: string): { time: string; slug: string } | null {
  // Format: HH-MM-SS_slug-text.md
  const match = filename.match(/^(\d{2}-\d{2}-\d{2})_(.+)\.md$/)
  if (!match) return null
  return { time: match[1], slug: match[2] }
}

function parseFirstLine(filepath: string): { severity: IncidentSeverity; title: string } {
  try {
    const content = fs.readFileSync(filepath, 'utf-8')
    const firstLine = content.split('\n')[0] || ''

    // First line format: # SEVERITY - Title
    const match = firstLine.match(/^#\s+(INFO|WARNING|ERROR|CRITICAL)\s+-\s+(.+)$/)
    if (match) {
      const severityMap: Record<string, IncidentSeverity> = {
        INFO: 'info',
        WARNING: 'warning',
        ERROR: 'error',
        CRITICAL: 'critical',
      }
      return {
        severity: severityMap[match[1]] || 'warning',
        title: match[2],
      }
    }

    return { severity: 'warning', title: firstLine.replace(/^#+\s*/, '') }
  } catch {
    return { severity: 'warning', title: 'Unknown' }
  }
}
