'use server'

// lib/research/builds-index-actions.ts
// Research-Derived Builds Index server actions (P60)
// Maps docs/research/ files to built code via filesystem scan.
// No new tables. Admin-gated.

import { requireAdmin } from '@/lib/auth/admin'
import { readdir } from 'fs/promises'
import { join, basename } from 'path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResearchBuildMapping = {
  researchFile: string
  title: string
  builtPaths: string[]
  hasCorrespondingCode: boolean
}

type UnbuiltResearch = {
  researchFile: string
  title: string
  reason: string
}

type BuildCoverageReport = {
  totalResearchDocs: number
  builtCount: number
  unbuiltCount: number
  coveragePercent: number
  mappings: ResearchBuildMapping[]
  scannedAt: string
}

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

// ---------------------------------------------------------------------------
// Research-to-code keyword mapping
// Maps research file name patterns to expected lib/app directories.
// ---------------------------------------------------------------------------

const RESEARCH_TO_CODE_MAP: Record<string, string[]> = {
  loyalty: ['lib/loyalty', 'app/(chef)/loyalty'],
  compliance: ['lib/compliance', 'app/(chef)/settings/compliance'],
  finance: ['lib/finance', 'app/(chef)/finance'],
  staff: ['lib/staff', 'app/(chef)/staff'],
  recipe: ['lib/recipes', 'app/(chef)/recipes'],
  menu: ['lib/menus', 'app/(chef)/menus'],
  ingredient: ['lib/ingredients', 'app/(chef)/culinary'],
  calendar: ['lib/calendar', 'app/(chef)/events'],
  email: ['lib/email', 'lib/communication'],
  communication: ['lib/communication', 'app/(chef)/communication'],
  pricing: ['lib/pricing', 'lib/pie'],
  survey: ['lib/surveys'],
  seo: ['lib/seo', 'app/(public)'],
  auth: ['lib/auth'],
  rbac: ['lib/auth', 'lib/roles'],
  onboarding: ['lib/onboarding', 'app/(chef)/onboarding'],
  directory: ['lib/directory', 'app/(public)/directory'],
  booking: ['lib/booking', 'app/(public)/book'],
  ai: ['lib/ai', 'lib/remy'],
  remy: ['lib/remy', 'app/(chef)/remy'],
  openclaw: ['lib/openclaw'],
  weather: ['lib/weather'],
  lifecycle: ['lib/lifecycle'],
  monetization: ['lib/monetization'],
  nav: ['lib/navigation', 'components/nav'],
  dashboard: ['app/(chef)/dashboard'],
  client: ['lib/clients', 'app/(chef)/clients'],
  event: ['lib/events', 'app/(chef)/events'],
  cannabis: ['lib/cannabis', 'app/(chef)/cannabis'],
  quote: ['lib/quotes', 'app/(chef)/quotes'],
  security: ['lib/security', 'middleware.ts'],
  infrastructure: ['lib/infrastructure', 'scripts/'],
  performance: ['lib/performance'],
  ux: ['components/ui', 'app/(chef)'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function titleFromFilename(filename: string): string {
  return basename(filename, '.md')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function findMatchingKeywords(filename: string): string[] {
  const lower = filename.toLowerCase()
  const matches: string[] = []
  for (const [keyword, paths] of Object.entries(RESEARCH_TO_CODE_MAP)) {
    if (lower.includes(keyword)) {
      matches.push(...paths)
    }
  }
  return [...new Set(matches)]
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await readdir(dirPath)
    return true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Maps docs/research/ files to built code paths via filesystem scan.
 */
export async function getResearchDerivedBuilds(): Promise<ActionResult<ResearchBuildMapping[]>> {
  try {
    await requireAdmin()

    const researchDir = join(process.cwd(), 'docs', 'research')
    let files: string[]
    try {
      const entries = await readdir(researchDir)
      files = entries.filter((f) => f.endsWith('.md') && f !== 'README.md')
    } catch {
      return { success: false, error: 'Could not read docs/research/ directory.' }
    }

    const mappings: ResearchBuildMapping[] = []

    for (const file of files) {
      const candidatePaths = findMatchingKeywords(file)
      const builtPaths: string[] = []

      for (const candidatePath of candidatePaths) {
        const fullPath = join(process.cwd(), candidatePath)
        if (await directoryExists(fullPath)) {
          builtPaths.push(candidatePath)
        }
      }

      mappings.push({
        researchFile: `docs/research/${file}`,
        title: titleFromFilename(file),
        builtPaths,
        hasCorrespondingCode: builtPaths.length > 0,
      })
    }

    return { success: true, data: mappings }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}

/**
 * Returns research docs with no corresponding code directories found.
 */
export async function getUnbuiltResearch(): Promise<ActionResult<UnbuiltResearch[]>> {
  try {
    await requireAdmin()

    const result = await getResearchDerivedBuilds()
    if (!result.success) {
      return { success: false, error: result.error }
    }

    const unbuilt: UnbuiltResearch[] = result.data
      .filter((m) => !m.hasCorrespondingCode)
      .map((m) => ({
        researchFile: m.researchFile,
        title: m.title,
        reason:
          findMatchingKeywords(m.researchFile).length === 0
            ? 'No keyword match to any known code domain.'
            : 'Matched keywords but no corresponding code directories exist yet.',
      }))

    return { success: true, data: unbuilt }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}

/**
 * Returns the percentage of research docs that have corresponding built code.
 */
export async function getBuildCoverage(): Promise<ActionResult<BuildCoverageReport>> {
  try {
    await requireAdmin()

    const result = await getResearchDerivedBuilds()
    if (!result.success) {
      return { success: false, error: result.error }
    }

    const mappings = result.data
    const builtCount = mappings.filter((m) => m.hasCorrespondingCode).length
    const unbuiltCount = mappings.length - builtCount

    return {
      success: true,
      data: {
        totalResearchDocs: mappings.length,
        builtCount,
        unbuiltCount,
        coveragePercent: mappings.length > 0 ? Math.round((builtCount / mappings.length) * 100) : 0,
        mappings,
        scannedAt: new Date().toISOString(),
      },
    }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}
