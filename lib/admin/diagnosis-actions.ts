'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { requireChef } from '@/lib/auth/get-user'
import type {
  DiagnosisCheck,
  DiagnosisCategory,
  SystemDiagnosis,
  SystemVitals,
} from './diagnosis-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function timedCheck(
  category: DiagnosisCategory,
  name: string,
  fn: () => Promise<string>
): Promise<DiagnosisCheck> {
  const start = Date.now()
  try {
    const message = await fn()
    return {
      category,
      name,
      status: 'healthy',
      message,
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return {
      category,
      name,
      status: 'failing',
      message: err instanceof Error ? err.message : 'Unknown error',
      latencyMs: Date.now() - start,
    }
  }
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

async function checkDatabase(): Promise<DiagnosisCheck> {
  return timedCheck('database', 'PostgreSQL connectivity', async () => {
    await db.execute(sql`SELECT 1`)
    return 'Database responding'
  })
}

async function checkAuth(): Promise<DiagnosisCheck> {
  return timedCheck('auth', 'Session table accessible', async () => {
    await db.execute(sql`SELECT count(*) FROM sessions LIMIT 1`)
    return 'Sessions table accessible'
  })
}

async function checkSearch(): Promise<DiagnosisCheck> {
  return timedCheck('search', 'Universal search module', async () => {
    // Verify the search module can be loaded
    await import('@/lib/search/universal-search')
    return 'Search module loaded'
  })
}

async function checkRoutes(): Promise<DiagnosisCheck> {
  return timedCheck('routes', 'App route count', async () => {
    const fs = await import('fs')
    const path = await import('path')

    function countPages(dir: string): number {
      let count = 0
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.isDirectory()) {
            count += countPages(path.join(dir, entry.name))
          } else if (entry.name === 'page.tsx') {
            count++
          }
        }
      } catch {
        // Directory not readable
      }
      return count
    }

    const appDir = path.join(process.cwd(), 'app')
    const pageCount = countPages(appDir)
    return `${pageCount} page routes found`
  })
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

export async function runDiagnosis(): Promise<SystemDiagnosis> {
  await requireChef()

  const checks = await Promise.all([checkDatabase(), checkAuth(), checkSearch(), checkRoutes()])

  const healthyCount = checks.filter((c) => c.status === 'healthy').length
  const overallHealth = Math.round((healthyCount / checks.length) * 100)

  const failingNames = checks.filter((c) => c.status === 'failing').map((c) => c.name)

  const summary =
    failingNames.length === 0 ? 'All systems operational' : `Failing: ${failingNames.join(', ')}`

  return { checks, overallHealth, summary }
}

export async function getSystemVitals(): Promise<SystemVitals> {
  await requireChef()

  const mem = process.memoryUsage()
  return {
    nodeVersion: process.version,
    uptime: process.uptime(),
    env: process.env.NODE_ENV ?? 'unknown',
    platform: process.platform,
    memoryUsageMb: Math.round(mem.heapUsed / 1024 / 1024),
  }
}
