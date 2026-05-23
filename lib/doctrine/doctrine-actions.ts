'use server'

// lib/doctrine/doctrine-actions.ts
// Product Doctrine Registry server actions (P59)
// Hardcoded product principles. No DB tables.
// Admin-gated: all actions require requireAdmin().

import { requireAdmin } from '@/lib/auth/admin'
import type {
  DoctrinePrinciple,
  DoctrineViolation,
  DoctrineEvaluation,
  DoctrineCoverageEntry,
  DoctrineCoverageReport,
} from './doctrine-types'

// ---------------------------------------------------------------------------
// Canonical product principles (hardcoded, not DB-backed)
// ---------------------------------------------------------------------------

const PRODUCT_PRINCIPLES: DoctrinePrinciple[] = [
  {
    id: 'no-cloud-services',
    name: 'No Cloud Services',
    description:
      'Self-hosted only. No hosted DBs, no S3, no monthly cloud bills. Cloudflare (domain/tunnel) is the sole exception.',
    category: 'infrastructure',
    active: true,
  },
  {
    id: 'no-crowdsourced-data',
    name: 'No Crowdsourced Core Data',
    description:
      'Core product data is built by OpenClaw, not contributed by users. Users are not data farmers.',
    category: 'data-integrity',
    active: true,
  },
  {
    id: 'algorithm-first',
    name: 'Algorithm First',
    description:
      'Everything works without AI. AI is opt-in upgrade. AI patterns crystallize into deterministic code.',
    category: 'ai-philosophy',
    active: true,
  },
  {
    id: 'multi-user-product',
    name: 'Multi-User Product',
    description: 'ChefFlow is for all chefs, not just one. Every decision must work for any user.',
    category: 'user-sovereignty',
    active: true,
  },
  {
    id: 'no-fake-stats',
    name: 'No Fake Stats or Testimonials',
    description:
      'Never put fake stats, fallback numbers, or fabricated testimonials on public pages. No data means hide the section.',
    category: 'data-integrity',
    active: true,
  },
  {
    id: 'no-free-tools-without-account',
    name: 'No Free Tools Without Account',
    description:
      'Internal tools (ingredients, nearby, discover, compare) require sign-in. Never exposed as public pages.',
    category: 'monetization-ethics',
    active: true,
  },
  {
    id: 'no-public-ingredients',
    name: 'No Public Ingredients',
    description: 'Never add ingredients to public nav, homepage, or footer. Permanent ban.',
    category: 'ux-identity',
    active: true,
  },
  {
    id: 'chef-approval-required',
    name: 'Chef Approval Required',
    description: 'Every ingredient match requires explicit chef approval. No silent auto-confirms.',
    category: 'user-sovereignty',
    active: true,
  },
  {
    id: 'progressive-disclosure',
    name: 'Progressive Disclosure, Never Deletion',
    description:
      'Growth solved by progressive disclosure. Reorganize, modularize, refine. Never delete features.',
    category: 'ux-identity',
    active: true,
  },
  {
    id: 'accretive-coherence',
    name: 'Accretive Coherence',
    description:
      'Intensification over extension, connective cartography, saturation-based pacing. Wire existing before building new.',
    category: 'operational-autonomy',
    active: true,
  },
  {
    id: 'no-third-party-dependency',
    name: 'No Third-Party Dependency',
    description:
      'ChefFlow is the hub. External platforms are distribution channels pushed to, not depended on.',
    category: 'operational-autonomy',
    active: true,
  },
  {
    id: 'zero-hallucination',
    name: 'Zero Hallucination',
    description:
      'Never show success without confirmation. Never hide failure as zero. Never render non-functional features as functional.',
    category: 'data-integrity',
    active: true,
  },
  {
    id: 'data-safety-first',
    name: 'Data Safety First',
    description:
      'Live production app with real client data. Data loss is unacceptable. Migrations additive by default.',
    category: 'data-integrity',
    active: true,
  },
  {
    id: 'respectful-monetization',
    name: 'Respectful Monetization',
    description:
      'Fair pricing, transparent billing, no dark patterns. Price changes bounded and justified.',
    category: 'monetization-ethics',
    active: true,
  },
  {
    id: 'pie-always-expanding',
    name: 'PIE Always Expanding',
    description:
      'Pricing Intelligence Engine must always be expanding, improving, covering new areas.',
    category: 'operational-autonomy',
    active: true,
  },
  {
    id: 'flexible-creation-order',
    name: 'Flexible Creation Order',
    description: 'Any entity creation order (menu-first, recipe-first). No hierarchy enforcement.',
    category: 'ux-identity',
    active: true,
  },
]

// ---------------------------------------------------------------------------
// Keywords that heuristically indicate a principle is reflected in code
// ---------------------------------------------------------------------------

const PRINCIPLE_KEYWORDS: Record<string, string[]> = {
  'no-cloud-services': ['self-hosted', 'cloudflare', 'no-cloud', 'local-only'],
  'no-crowdsourced-data': ['openclaw', 'synthesizer', 'price-bridge', 'data-pipeline'],
  'algorithm-first': ['algorithm-first', 'deterministic', 'opt-in', 'ai-policy'],
  'multi-user-product': ['tenant', 'chefId', 'tenantId', 'multi-tenant'],
  'no-fake-stats': ['testimonial', 'social-proof', 'trust-bar'],
  'no-free-tools-without-account': ['requireAuth', 'requireChef', 'requireClient'],
  'no-public-ingredients': ['ingredients', 'public-nav'],
  'chef-approval-required': ['approval', 'chef-approve', 'confirm-match'],
  'progressive-disclosure': ['progressive-disclosure', 'expandable', 'collapsible'],
  'accretive-coherence': ['wire-audit', 'wiring-audit', 'page-xray'],
  'no-third-party-dependency': ['distribution-channel', 'external-platform'],
  'zero-hallucination': ['try/catch', 'rollback', 'error-state', 'optimistic'],
  'data-safety-first': ['migration', 'additive', 'backup', 'immutable'],
  'respectful-monetization': ['monetization', 'guardrail', 'pricing-fairness'],
  'pie-always-expanding': ['resolve-price', 'pie', 'pricing-intelligence'],
  'flexible-creation-order': ['flexible-creation', 'creation-order'],
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Returns the full set of product doctrine principles.
 */
export async function getDoctrinePrinciples(): Promise<ActionResult<DoctrinePrinciple[]>> {
  try {
    await requireAdmin()
    return { success: true, data: PRODUCT_PRINCIPLES }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}

/**
 * Evaluate a proposed feature description against all active doctrine principles.
 * Returns any violations found via keyword/heuristic matching.
 */
export async function evaluateAgainstDoctrine(
  featureDescription: string
): Promise<ActionResult<DoctrineEvaluation>> {
  try {
    await requireAdmin()

    const lower = featureDescription.toLowerCase()
    const violations: DoctrineViolation[] = []

    for (const principle of PRODUCT_PRINCIPLES) {
      if (!principle.active) continue

      // Cloud services check
      if (principle.id === 'no-cloud-services') {
        const cloudTerms = [
          'aws',
          's3',
          'lambda',
          'azure',
          'gcp',
          'firebase',
          'supabase',
          'planetscale',
          'vercel postgres',
          'neon',
          'hosted database',
        ]
        for (const term of cloudTerms) {
          if (lower.includes(term)) {
            violations.push({
              principleId: principle.id,
              principleName: principle.name,
              reason: `Feature references cloud service "${term}". ChefFlow is self-hosted only.`,
              severity: 'hard-block',
            })
          }
        }
      }

      // Crowdsourced data check
      if (principle.id === 'no-crowdsourced-data') {
        const crowdTerms = [
          'user-contributed',
          'crowdsource',
          'user-submitted data',
          'community data',
        ]
        for (const term of crowdTerms) {
          if (lower.includes(term)) {
            violations.push({
              principleId: principle.id,
              principleName: principle.name,
              reason: `Feature implies crowdsourced data ("${term}"). Core data comes from OpenClaw.`,
              severity: 'hard-block',
            })
          }
        }
      }

      // Free tools without account
      if (principle.id === 'no-free-tools-without-account') {
        const freeTerms = [
          'public tool',
          'no login required',
          'anonymous access',
          'free calculator',
          'public api',
        ]
        for (const term of freeTerms) {
          if (lower.includes(term)) {
            violations.push({
              principleId: principle.id,
              principleName: principle.name,
              reason: `Feature exposes internal tools publicly ("${term}"). Requires sign-in.`,
              severity: 'hard-block',
            })
          }
        }
      }

      // Fake stats / testimonials
      if (principle.id === 'no-fake-stats') {
        const fakeTerms = [
          'placeholder testimonial',
          'fake review',
          'sample stat',
          'dummy number',
          'fallback count',
        ]
        for (const term of fakeTerms) {
          if (lower.includes(term)) {
            violations.push({
              principleId: principle.id,
              principleName: principle.name,
              reason: `Feature includes fabricated social proof ("${term}").`,
              severity: 'hard-block',
            })
          }
        }
      }

      // Third-party dependency
      if (principle.id === 'no-third-party-dependency') {
        const depTerms = [
          'depends on eventbrite',
          'requires facebook',
          'groupon integration',
          'third-party required',
        ]
        for (const term of depTerms) {
          if (lower.includes(term)) {
            violations.push({
              principleId: principle.id,
              principleName: principle.name,
              reason: `Feature creates external dependency ("${term}"). ChefFlow is the hub.`,
              severity: 'warning',
            })
          }
        }
      }

      // Respectful monetization
      if (principle.id === 'respectful-monetization') {
        const darkTerms = [
          'dark pattern',
          'hidden fee',
          'auto-upgrade',
          'forced upsell',
          'cancel penalty',
        ]
        for (const term of darkTerms) {
          if (lower.includes(term)) {
            violations.push({
              principleId: principle.id,
              principleName: principle.name,
              reason: `Feature contains monetization anti-pattern ("${term}").`,
              severity: 'hard-block',
            })
          }
        }
      }
    }

    const evaluation: DoctrineEvaluation = {
      featureDescription,
      violations,
      passed: violations.length === 0,
      evaluatedAt: new Date().toISOString(),
    }

    return { success: true, data: evaluation }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}

/**
 * Heuristic scan: which doctrine principles are reflected in the codebase.
 * Uses keyword matching against known file patterns.
 */
export async function getDoctrineCoverage(): Promise<ActionResult<DoctrineCoverageReport>> {
  try {
    await requireAdmin()

    const { execSync } = await import('child_process')
    const entries: DoctrineCoverageEntry[] = []

    for (const principle of PRODUCT_PRINCIPLES) {
      const keywords = PRINCIPLE_KEYWORDS[principle.id] || []
      const evidence: string[] = []

      for (const keyword of keywords) {
        try {
          const result = execSync(
            `grep -rl "${keyword}" lib/ app/ --include="*.ts" --include="*.tsx" 2>nul || echo ""`,
            { encoding: 'utf-8', cwd: process.cwd(), timeout: 5000 }
          ).trim()

          if (result) {
            const files = result.split('\n').filter(Boolean).slice(0, 3)
            for (const f of files) {
              evidence.push(`${keyword} found in ${f}`)
            }
          }
        } catch {
          // grep not found or timeout; skip
        }
      }

      entries.push({
        principleId: principle.id,
        principleName: principle.name,
        reflected: evidence.length > 0,
        evidence,
      })
    }

    const reflected = entries.filter((e) => e.reflected).length

    const report: DoctrineCoverageReport = {
      total: entries.length,
      reflected,
      percentage: Math.round((reflected / entries.length) * 100),
      entries,
      scannedAt: new Date().toISOString(),
    }

    return { success: true, data: report }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}
