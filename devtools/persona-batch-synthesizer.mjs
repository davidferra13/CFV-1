#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const ROOT = process.cwd()
const STRESS_TEST_DIR = join(ROOT, 'docs', 'stress-tests')
const BUILD_PLANS_DIR = join(ROOT, 'system', 'persona-build-plans')
const OUTPUT_DIR = join(ROOT, 'system', 'persona-batch-synthesis')
const TAG = '[persona-batch-synthesizer]'

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {
    dryRun: false,
    since: null,
    saturationOnly: false,
    useLlm: false,
    model: 'hermes3:8b',
  }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') options.dryRun = true
    if (argv[i] === '--since') options.since = argv[i + 1] || null
    if (argv[i] === '--saturation-only') options.saturationOnly = true
    if (argv[i] === '--use-llm') options.useLlm = true
    if (argv[i] === '--model') options.model = argv[i + 1] || options.model
  }
  return options
}

// ---------------------------------------------------------------------------
// Gap categories (from spec)
// ---------------------------------------------------------------------------

const GAP_CATEGORIES = [
  {
    id: 'event-lifecycle',
    keywords: ['event lifecycle', 'ephemeral', 'one-night', 'pop-up', 'temporary event', 'event management', 'event flow'],
  },
  {
    id: 'access-control',
    keywords: ['access control', 'invite-only', 'tiered access', 'waitlist', 'permissions', 'visibility control'],
  },
  {
    id: 'ticketing-drops',
    keywords: ['ticket', 'drop', 'sell-out', 'controlled release', 'demand', 'allocation'],
  },
  {
    id: 'audience-community',
    keywords: ['audience', 'community', 'guest tracking', 'repeat guest', 'curation', 'composition'],
  },
  { id: 'location-venue', keywords: ['location', 'venue', 'setup', 'mobile', 'site', 'space'] },
  {
    id: 'payment-financial',
    keywords: ['payment', 'financial', 'billing', 'pricing', 'cost', 'revenue', 'commitment', 'deposit', 'invoice', 'price', 'freshness', 'contract', 'real-time'],
  },
  {
    id: 'compliance-legal',
    keywords: ['compliance', 'legal', 'regulation', 'documentation', 'audit', 'license', 'liability', 'traceability', 'evidence', 'cockpit', 'governance'],
  },
  {
    id: 'dosing-cannabis',
    keywords: ['dose', 'dosing', 'cannabis', 'thc', 'cbd', 'infusion', 'potency', 'terpene', 'tolerance', 'dose-curve', 'molecule', 'batch lineage'],
  },
  {
    id: 'dietary-medical',
    keywords: ['dietary', 'medical', 'allergy', 'allergen', 'restriction', 'health', 'constraint', 'intolerance'],
  },
  {
    id: 'recipe-menu',
    keywords: ['recipe', 'menu', 'dish', 'course', 'ingredient', 'prep', 'archive', 'planner', 'builder', 'pairing', 'provisioning'],
  },
  {
    id: 'scheduling-calendar',
    keywords: ['schedule', 'calendar', 'booking', 'availability', 'time', 'conflict', 'timeline', 'offline', 'sync', 'conflict-safe', 'real-time'],
  },
  {
    id: 'communication',
    keywords: ['communication', 'email', 'message', 'notification', 'client communication', 'staff communication'],
  },
  {
    id: 'staffing-team',
    keywords: ['staff', 'team', 'hire', 'brigade', 'delegation', 'assistant', 'subcontractor', 'multi-chef', 'director', 'governance', 'cross-event'],
  },
  {
    id: 'sourcing-supply',
    keywords: ['sourcing', 'supplier', 'vendor', 'procurement', 'supply chain', 'farm', 'seasonal', 'store', 'market', 'route', 'cart', 'optimizer', 'availability'],
  },
  {
    id: 'costing-margin',
    keywords: ['food cost', 'margin', 'per head', 'costing', 'markup', 'profitability', 'waste'],
  },
  {
    id: 'reporting-analytics',
    keywords: ['report', 'analytics', 'dashboard', 'data', 'metrics', 'performance', 'insight', 'history', 'outcome', 'intelligence', 'longitudinal', 'telemetry'],
  },
  {
    id: 'onboarding-ux',
    keywords: ['onboarding', 'first time', 'setup', 'learning curve', 'user experience', 'confusing', 'overwhelming', 'safety command', 'safe-only', 'reaction log'],
  },
  {
    id: 'scaling-multi',
    keywords: ['scale', 'multi-location', 'multi-unit', 'growth', 'franchise', 'brand', 'expansion', 'multi-event', 'charter', 'voyage', 'roster', 'churn'],
  },
  {
    id: 'delivery-logistics',
    keywords: ['delivery', 'logistics', 'transport', 'packaging', 'temperature', 'routing'],
  },
  {
    id: 'documentation-records',
    keywords: ['document', 'record', 'archive', 'history', 'trail', 'log', 'retention'],
  },
]

const SEVERITY_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 }

// ---------------------------------------------------------------------------
// Known-built features (Ollama false-positive filter)
// Maps common gap keywords to codebase locations. If grep finds these files
// with matching exports/functions, the gap is pre-validated as BUILT.
// ---------------------------------------------------------------------------

const KNOWN_BUILT_FEATURES = [
  { patterns: ['cross.contamination', 'allergen.matrix', 'allergen.conflict'], file: 'lib/dietary/cross-contamination-check.ts', label: 'Allergen cross-contamination check' },
  { patterns: ['knowledge.dietary', 'dietary.flag', 'wikidata.*dietary'], file: 'lib/dietary/knowledge-dietary-check.ts', label: 'Knowledge dietary check' },
  { patterns: ['CompletionResult', 'evaluateCompletion', 'completion.engine'], file: 'lib/completion/engine.ts', label: 'Completion contract engine' },
  { patterns: ['ticket_type', 'purchaseTicket', 'event_ticketing'], file: 'lib/tickets/actions.ts', label: 'Ticketed events' },
  { patterns: ['event.transition', 'EventState', 'event_fsm'], file: 'lib/events/event-transitions.ts', label: 'Event FSM lifecycle' },
  { patterns: ['ledger.entry', 'createLedger', 'financial_summary'], file: 'lib/finance/ledger-actions.ts', label: 'Financial ledger' },
  { patterns: ['plate.cost', 'recipe.cost', 'food_cost'], file: 'lib/culinary/plate-cost-actions.ts', label: 'Recipe costing' },
  { patterns: ['trust.loop', 'post_event_survey', 'wellness_outcome'], file: 'lib/post-event/trust-loop-actions.ts', label: 'Post-event surveys + wellness' },
  { patterns: ['cannabis.action', 'cannabis.event', 'compliance'], file: 'lib/chef/cannabis-actions.ts', label: 'Cannabis compliance' },
  { patterns: ['staff.member', 'staff.action'], file: 'lib/staff/', label: 'Staff management' },
  { patterns: ['equipment.inventory', 'equipment.action'], file: 'lib/equipment/', label: 'Equipment inventory' },
  { patterns: ['contract.generat', 'contract.template'], file: 'lib/ai/contract-generator.ts', label: 'Contract generation' },
  { patterns: ['dinner.circle', 'circle.member'], file: 'lib/circles/', label: 'Dinner circles' },
  { patterns: ['booking.page', 'chefSlug', 'book.page'], file: 'app/book/', label: 'Booking page' },
  { patterns: ['shareToken', 'public.event'], file: 'app/(public)/e/', label: 'Public event pages' },
  { patterns: ['recipe.search', 'recipe.action'], file: 'lib/recipes/', label: 'Recipe management' },
  { patterns: ['menu.health', 'menu.action', 'addDishToMenu'], file: 'lib/menus/actions.ts', label: 'Menu management' },
]

// ---------------------------------------------------------------------------
// Search hint generation
// Extracts grep-able terms from gap titles and descriptions so downstream
// tools (Codex, dashboard validator) can check the codebase without AI.
// ---------------------------------------------------------------------------

const HINT_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'no', 'lack', 'of', 'in', 'a', 'an', 'as',
  'to', 'is', 'are', 'be', 'by', 'on', 'at', 'or', 'not', 'from', 'it',
  'its', 'has', 'was', 'but', 'one', 'that', 'this', 'does', 'any', 'can',
  'will', 'should', 'would', 'could', 'may', 'must', 'need', 'needs',
  'chefflow', 'system', 'feature', 'mode', 'model', 'engine', 'assistant',
  'first-class', 'explicit', 'dedicated', 'native', 'support', 'current',
  'currently', 'existing', 'new', 'level', 'layer', 'based', 'real-time',
])

function generateSearchHints(title, description) {
  const hints = new Set()

  // Extract multi-word technical terms from title
  const titleWords = title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !HINT_STOP_WORDS.has(w))

  // Build bigrams from title (more specific than single words)
  for (let i = 0; i < titleWords.length - 1; i++) {
    const bigram = `${titleWords[i]}.${titleWords[i + 1]}`
    if (!HINT_STOP_WORDS.has(titleWords[i]) && !HINT_STOP_WORDS.has(titleWords[i + 1])) {
      hints.add(bigram)
    }
  }

  // Add important single words from title
  for (const word of titleWords) {
    if (word.length > 4) hints.add(word)
  }

  // Check against known-built patterns
  const combined = `${title} ${description}`.toLowerCase()
  const matchedBuilt = []
  for (const known of KNOWN_BUILT_FEATURES) {
    for (const pat of known.patterns) {
      if (new RegExp(pat, 'i').test(combined)) {
        matchedBuilt.push(known)
        break
      }
    }
  }

  return {
    grep_terms: [...hints].slice(0, 8),
    known_built_matches: matchedBuilt.map(k => ({ file: k.file, label: k.label })),
    likely_false_positive: matchedBuilt.length > 0,
  }
}

// ---------------------------------------------------------------------------
// Phase 1: Extract
// ---------------------------------------------------------------------------

function collectReportFiles(since) {
  if (!existsSync(STRESS_TEST_DIR)) return []
  let entries
  try { entries = readdirSync(STRESS_TEST_DIR) } catch { return [] }

  return entries
    .map((filename) => {
      const match = /^persona-(.+)-(\d{4}-\d{2}-\d{2})\.md$/i.exec(filename)
      if (!match) return null
      const [, slug, date] = match
      if (since && date < since) return null
      return { slug, date, filename, path: join(STRESS_TEST_DIR, filename) }
    })
    .filter(Boolean)
    .sort((a, b) => `${a.date}-${a.slug}`.localeCompare(`${b.date}-${b.slug}`))
}

function extractScore(text) {
  // Pattern 1: ## Score: N/100
  const m1 = /##\s*(?:\d+\)\s*)?Score[:\s]*\**(\d+)\s*\/\s*100\**/i.exec(text)
  if (m1) return parseInt(m1[1], 10)
  // Pattern 2: **N / 100** or **N/100**
  const m2 = /\*\*(\d+)\s*\/\s*100\*\*/i.exec(text)
  if (m2) return parseInt(m2[1], 10)
  return null
}

function extractScoreBreakdown(text) {
  const breakdown = {}
  // Find the score section - everything between Score header and next ## or end
  const scoreSection = text.match(/##\s*(?:\d+\)\s*)?Score[\s\S]*?(?=\n##\s|\n---|\Z)/i)
  if (!scoreSection) return breakdown

  const section = scoreSection[0]
  // Match lines like: - Category Name (range): value or - Category: value/100 or - Category (pct): **value/range**
  const lines = section.split('\n')
  for (const line of lines) {
    // - Workflow Coverage (0-40): 15 -- description
    const m1 = /^-\s+(.+?)\s*\([^)]*\):\s*\**(\d+)/i.exec(line.trim())
    if (m1) {
      const key = slugifyCategory(m1[1])
      breakdown[key] = parseInt(m1[2], 10)
      continue
    }
    // - Category: 60/100
    const m2 = /^-\s+(.+?):\s*\**(\d+)\s*\/\s*\d+\**/i.exec(line.trim())
    if (m2) {
      const key = slugifyCategory(m2[1])
      breakdown[key] = parseInt(m2[1], 10) === breakdown[key] ? breakdown[key] : parseInt(m2[2], 10)
      continue
    }
  }
  return breakdown
}

function slugifyCategory(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function extractGaps(text) {
  const gaps = []

  // Strategy 1: ### Gap N: Title + **Severity:** X + description (Kai format)
  const gapHeaderPattern = /###\s*Gap\s*(\d+):\s*(.+)/gi
  let match
  while ((match = gapHeaderPattern.exec(text)) !== null) {
    const number = parseInt(match[1], 10)
    const title = match[2].trim()
    // Get text after this header until next ### or ## or end
    const afterHeader = text.slice(match.index + match[0].length)
    const endMatch = afterHeader.search(/\n###?\s|\n---/)
    const block = endMatch >= 0 ? afterHeader.slice(0, endMatch) : afterHeader.slice(0, 500)

    const severityMatch = /\*\*Severity:\*\*\s*(HIGH|MEDIUM|LOW)/i.exec(block)
    const severity = severityMatch ? severityMatch[1].toUpperCase() : 'MEDIUM'

    // Description is everything after severity line (or the whole block if no severity)
    let description = block
    if (severityMatch) {
      description = block.slice(severityMatch.index + severityMatch[0].length)
    }
    description = description.trim().split('\n').map(l => l.trim()).filter(Boolean).join(' ')

    const search_hints = generateSearchHints(title, description)
    gaps.push({ number, title, severity, description, categories: [], search_hints })
  }

  if (gaps.length > 0) return gaps

  // Strategy 2: Numbered list under "Top 5 Gaps" section
  // Find the gaps section
  const gapSection = text.match(/##\s*(?:\d+\)\s*)?Top 5 Gaps[\s\S]*?(?=\n##\s)/i)
  if (!gapSection) return gaps

  const section = gapSection[0]
  // Split on numbered items: 1. **Title** or 1. Title
  const itemPattern = /(?:^|\n)\s*(\d+)\.\s+\*\*(.+?)\*\*/g
  let itemMatch
  const items = []
  while ((itemMatch = itemPattern.exec(section)) !== null) {
    items.push({
      number: parseInt(itemMatch[1], 10),
      title: itemMatch[2].trim(),
      startIndex: itemMatch.index,
    })
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const start = item.startIndex + section.slice(item.startIndex).indexOf(item.title) + item.title.length
    const end = i + 1 < items.length ? items[i + 1].startIndex : section.length
    const block = section.slice(start, end)

    // Try to find severity from effort estimate
    const severity = inferSeverity(block)

    // Build description from sub-bullets
    const description = block
      .replace(/\*\*/g, '')
      .split('\n')
      .map(l => l.replace(/^\s*-\s*/, '').trim())
      .filter(l => l.length > 0 && !l.startsWith('#'))
      .join(' ')
      .trim()

    const search_hints = generateSearchHints(item.title, description)
    gaps.push({
      number: item.number,
      title: item.title,
      severity,
      description,
      categories: [],
      search_hints,
    })
  }

  return gaps
}

function inferSeverity(block) {
  const lower = block.toLowerCase()
  // Explicit severity
  const explicit = /\*\*severity:\*\*\s*(HIGH|MEDIUM|LOW)/i.exec(block)
  if (explicit) return explicit[1].toUpperCase()
  // From effort: Large = HIGH, Medium-Large = HIGH, Medium = MEDIUM, Small = LOW
  if (/effort[:\s]*\**(large)\**/i.test(block)) return 'HIGH'
  if (/effort[:\s]*\**medium-large\**/i.test(block)) return 'HIGH'
  if (/effort[:\s]*\**medium\**/i.test(block)) return 'MEDIUM'
  if (/effort[:\s]*\**small\**/i.test(block)) return 'LOW'
  // From keywords
  if (lower.includes('missing') || lower.includes('no ') || lower.includes('not ')) return 'HIGH'
  return 'MEDIUM'
}

function extractQuickWins(text) {
  const wins = []
  const section = text.match(/##\s*(?:\d+\)\s*)?Quick Wins[\s\S]*?(?=\n##\s|\n---)/i)
  if (!section) return wins

  const body = section[0]
  // Match numbered items: 1. **Title** or 1. Title or plain numbered
  const lines = body.split('\n')
  let current = null

  for (const line of lines) {
    const numbered = /^\s*(\d+)\.\s+\**(.+?)\**\s*$/.exec(line)
    if (numbered) {
      if (current) wins.push(current.trim())
      current = numbered[2].replace(/\*\*/g, '').trim()
      continue
    }
    // Continuation lines for context (skip sub-items that are details)
    if (current && /^\s+-/.test(line)) {
      // skip sub-bullets, they're implementation details
      continue
    }
  }
  if (current) wins.push(current.trim())

  return wins
}

function extractVerdict(text) {
  const section = text.match(/##\s*(?:\d+\)\s*)?(?:Two-Sentence\s+)?Verdict[\s\S]*?(?=\n##\s|\n---|\Z)/i)
  if (!section) return ''
  return section[0]
    .replace(/^##[^\n]*\n/, '')
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join(' ')
}

function extractPersonaName(text, slug) {
  // Try: # Persona Stress Test: Name or # Persona Stress Test - Name or with em dash
  const m = /^#\s+Persona Stress Test[\s:—–-]+(.+)$/im.exec(text)
  if (m) {
    let name = m[1].trim()
    // If the captured name looks like a slug (all lowercase, hyphens), titlecase it
    if (/^[a-z0-9-]+$/.test(name)) name = titleCase(name.replace(/-/g, ' '))
    return name
  }
  return titleCase(slug.replace(/-/g, ' '))
}

function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

function parseReport(file) {
  let text
  try { text = readFileSync(file.path, 'utf8') } catch { return null }

  const name = extractPersonaName(text, file.slug)
  const score = extractScore(text)
  const score_breakdown = extractScoreBreakdown(text)
  const gaps = extractGaps(text)
  const quick_wins = extractQuickWins(text)
  const verdict = extractVerdict(text)

  const filteredGaps = gaps.filter(gap => {
    if (isLowQualityGap(gap)) {
      console.log(`${TAG}     [quality-gate] Rejected: "${gap.title}" (from ${file.slug})`)
      return false
    }
    return true
  })

  return {
    slug: file.slug,
    name,
    date: file.date,
    score,
    score_breakdown,
    gaps: filteredGaps,
    quick_wins,
    verdict,
  }
}

// ---------------------------------------------------------------------------
// Phase 2: Categorize
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Gap Quality Gate
// Rejects low-quality gap titles that would pollute synthesis.
// ---------------------------------------------------------------------------

function isLowQualityGap(gap) {
  const title = (gap.title || '').trim()

  // Reject empty or very short titles
  if (title.length < 5) return true

  // Reject titles that are just a single word with optional colon
  // Examples: "Efficiency:", "Automation:", "Traceability:"
  if (/^[A-Za-z]+:?\s*$/.test(title)) return true

  // Reject titles that are just two words with colon
  // Examples: "Manual Tracking:", "Vendor Management:", "Audit Trail:"
  if (/^[A-Za-z]+\s+[A-Za-z]+:?\s*$/.test(title)) return true

  // Reject generic filler titles
  const FILLER_TITLES = [
    'workflow coverage gap',
    'data model gap',
    'manual review required',
    'retry candidate',
    'analyzer incomplete',
    'planner input degraded',
    'report confidence unavailable',
  ]
  if (FILLER_TITLES.includes(title.toLowerCase().replace(/:$/, ''))) return true

  return false
}

function normalizeGapTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function areSimilarGaps(gapA, gapB) {
  const a = normalizeGapTitle(gapA.title)
  const b = normalizeGapTitle(gapB.title)

  if (a === b) return true

  if (a.length > 5 && b.length > 5) {
    if (a.includes(b) || b.includes(a)) return true
  }

  return false
}

function categorizeGaps(personas) {
  for (const persona of personas) {
    for (const gap of persona.gaps) {
      const searchText = `${gap.title} ${gap.description}`.toLowerCase()
      const scores = []

      for (const cat of GAP_CATEGORIES) {
        let hits = 0
        for (const kw of cat.keywords) {
          if (searchText.includes(kw.toLowerCase())) hits++
        }
        if (hits >= 1) scores.push({ id: cat.id, hits })
      }

      if (scores.length === 0) {
        gap.categories = ['uncategorized']
      } else {
        const maxHits = Math.max(...scores.map(s => s.hits))
        gap.categories = scores.filter(s => s.hits === maxHits).map(s => s.id)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 3: Aggregate
// ---------------------------------------------------------------------------

function aggregate(personas) {
  const total_personas = personas.length
  const scores = personas.map(p => p.score).filter(s => s != null)
  const average_score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  // Score distribution
  const score_distribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 }
  for (const s of scores) {
    if (s <= 20) score_distribution['0-20']++
    else if (s <= 40) score_distribution['21-40']++
    else if (s <= 60) score_distribution['41-60']++
    else if (s <= 80) score_distribution['61-80']++
    else score_distribution['81-100']++
  }

  // Build category aggregation
  const categories = {}
  for (const cat of GAP_CATEGORIES) {
    categories[cat.id] = {
      count: 0,
      personas: [],
      severity_breakdown: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      representative_gaps: [],
    }
  }
  categories['uncategorized'] = {
    count: 0,
    personas: [],
    severity_breakdown: { HIGH: 0, MEDIUM: 0, LOW: 0 },
    representative_gaps: [],
  }

  for (const persona of personas) {
    const seenCategories = new Set()
    for (const gap of persona.gaps) {
      for (const catId of gap.categories) {
        if (!categories[catId]) continue
        const cat = categories[catId]
        cat.severity_breakdown[gap.severity] = (cat.severity_breakdown[gap.severity] || 0) + 1
        const representativeGap = {
          title: gap.title,
          from: persona.slug,
          from_name: persona.name,
          severity: gap.severity,
          description: gap.description,
          search_hints: gap.search_hints || null,
        }
        representativeGap.likely_built = gapMatchesKnownBuiltFeature(representativeGap)

        // Deduplication: check if a similar gap already exists in this category
        const existingMatch = cat.representative_gaps.find(existing => areSimilarGaps(existing, representativeGap))
        if (existingMatch) {
          // Merge: keep the higher severity, track additional persona
          if (SEVERITY_WEIGHT[representativeGap.severity] > SEVERITY_WEIGHT[existingMatch.severity]) {
            existingMatch.severity = representativeGap.severity
          }
          if (!existingMatch.also_from) existingMatch.also_from = []
          existingMatch.also_from.push({ slug: persona.slug, name: persona.name })
        } else {
          cat.representative_gaps.push(representativeGap)
        }

        if (!seenCategories.has(catId)) {
          seenCategories.add(catId)
          cat.count++
          cat.personas.push(persona.slug)
        }
      }
    }
  }

  // Saturation tracking
  const allCategoryIds = GAP_CATEGORIES.map(c => c.id)
  const seenCategoriesGlobal = new Set()
  const new_categories_by_persona = []

  for (const persona of personas) {
    const personaCats = new Set()
    for (const gap of persona.gaps) {
      for (const catId of gap.categories) {
        if (catId !== 'uncategorized') personaCats.add(catId)
      }
    }

    const newCats = []
    for (const catId of personaCats) {
      if (!seenCategoriesGlobal.has(catId)) {
        newCats.push(catId)
        seenCategoriesGlobal.add(catId)
      }
    }

    new_categories_by_persona.push({ slug: persona.slug, new_categories: newCats })
  }

  // Count consecutive zero-new from end
  let consecutive_zero_new = 0
  for (let i = new_categories_by_persona.length - 1; i >= 0; i--) {
    if (new_categories_by_persona[i].new_categories.length === 0) {
      consecutive_zero_new++
    } else {
      break
    }
  }

  const categories_never_seen = allCategoryIds.filter(id => !seenCategoriesGlobal.has(id))

  const saturation = {
    new_categories_by_persona,
    consecutive_zero_new,
    saturated: consecutive_zero_new >= 5,
    categories_discovered: seenCategoriesGlobal.size,
    categories_total: allCategoryIds.length,
    categories_never_seen,
  }

  // Priority ranking: count * severity_weight
  const priority_ranking = Object.entries(categories)
    .filter(([, v]) => v.count > 0)
    .map(([catId, v]) => {
      const totalWeight = v.severity_breakdown.HIGH * 3 + v.severity_breakdown.MEDIUM * 2 + v.severity_breakdown.LOW * 1
      const totalGaps = v.severity_breakdown.HIGH + v.severity_breakdown.MEDIUM + v.severity_breakdown.LOW
      const avgSeverity = totalGaps > 0
        ? (v.severity_breakdown.HIGH >= v.severity_breakdown.MEDIUM ? 'HIGH' : 'MEDIUM')
        : 'MEDIUM'
      return {
        category: catId,
        priority_score: totalWeight,
        count: v.count,
        avg_severity: avgSeverity,
      }
    })
    .sort((a, b) => b.priority_score - a.priority_score || b.count - a.count)

  return {
    total_personas,
    average_score,
    score_distribution,
    categories,
    saturation,
    priority_ranking,
    // Extras for report generation
    personas,
  }
}

function gapMatchesKnownBuiltFeature(gap) {
  if (gap.search_hints?.likely_false_positive) return true

  const hintText = [
    ...(gap.search_hints?.grep_terms || []),
    ...(gap.search_hints?.known_built_matches || []).flatMap(match => [match.file, match.label]),
  ]
    .filter(Boolean)
    .join(' ')

  if (!hintText) return false

  return KNOWN_BUILT_FEATURES.some(known =>
    known.patterns.some(pattern => new RegExp(pattern, 'i').test(hintText))
  )
}

function scoreGap(gap, categoryData) {
  const severityWeight = SEVERITY_WEIGHT[gap.severity] || 1
  const personaCount = gap.personas ? gap.personas.length : 1
  const categoryFreq = Math.min((categoryData?.count || 0) / 5, 1)
  const builtPenalty = gap.likely_built ? 0.2 : 1.0

  return Math.round(severityWeight * personaCount * (1 + categoryFreq) * builtPenalty * 100) / 100
}

// ---------------------------------------------------------------------------
// Phase 4: Write outputs
// ---------------------------------------------------------------------------

function collectExistingBuildTasks() {
  const tasks = {}
  if (!existsSync(BUILD_PLANS_DIR)) return tasks

  let slugDirs
  try { slugDirs = readdirSync(BUILD_PLANS_DIR) } catch { return tasks }

  for (const dir of slugDirs) {
    const dirPath = join(BUILD_PLANS_DIR, dir)
    let files
    try { files = readdirSync(dirPath) } catch { continue }
    const taskFiles = files.filter(f => f.endsWith('.md')).map(f => `system/persona-build-plans/${dir}/${f}`)
    if (taskFiles.length > 0) tasks[dir] = taskFiles
  }
  return tasks
}

function categoryLabel(catId) {
  return titleCase(catId.replace(/-/g, ' '))
}

function writeSynthesisReport(data, date) {
  const { total_personas, average_score, score_distribution, priority_ranking, saturation, personas } = data

  const lines = []
  lines.push(`# Persona Batch Synthesis`)
  lines.push('')
  lines.push(`**Date:** ${date}`)
  lines.push(`**Personas analyzed:** ${total_personas}`)
  lines.push(`**Average score:** ${average_score}/100`)
  lines.push('')

  // Priority categories
  lines.push(`## Priority Categories (by cross-persona frequency x severity)`)
  lines.push('')

  for (let i = 0; i < priority_ranking.length; i++) {
    const rank = priority_ranking[i]
    const cat = data.categories[rank.category]
    const label = categoryLabel(rank.category)
    const personaNames = cat.personas.map(slug => {
      const p = personas.find(pp => pp.slug === slug)
      return p ? p.name : titleCase(slug.replace(/-/g, ' '))
    })

    lines.push(`### ${i + 1}. ${label} (${rank.count} persona${rank.count > 1 ? 's' : ''}, avg severity ${rank.avg_severity})`)
    lines.push('')
    lines.push(`**Personas:** ${personaNames.join(', ')}`)
    lines.push(`**Priority score:** ${rank.priority_score}`)
    lines.push('')

    // Find common pattern
    if (cat.representative_gaps.length > 0) {
      lines.push(`**Gaps in this category:**`)
      lines.push('')
      for (const gap of cat.representative_gaps) {
        lines.push(`- ${gap.title} (${gap.from_name}, ${gap.severity})`)
      }
      lines.push('')
    }
  }

  // Saturation status
  lines.push(`## Saturation Status`)
  lines.push('')
  lines.push(`- Categories discovered: ${saturation.categories_discovered}/${saturation.categories_total}`)
  const recentNew = saturation.new_categories_by_persona.slice(-3)
  const recentNewCount = recentNew.reduce((sum, p) => sum + p.new_categories.length, 0)
  lines.push(`- Last ${recentNew.length} personas found ${recentNewCount} new categor${recentNewCount === 1 ? 'y' : 'ies'}`)
  lines.push(`- ${saturation.saturated ? 'SATURATED. Consider stopping.' : 'NOT saturated. Keep generating.'}`)
  if (saturation.categories_never_seen.length > 0) {
    lines.push(`- Categories never triggered: ${saturation.categories_never_seen.join(', ')}`)
  }
  lines.push('')

  // New categories by persona
  lines.push(`### Discovery Timeline`)
  lines.push('')
  for (const entry of saturation.new_categories_by_persona) {
    const p = personas.find(pp => pp.slug === entry.slug)
    const name = p ? p.name : entry.slug
    if (entry.new_categories.length > 0) {
      lines.push(`- **${name}:** +${entry.new_categories.length} (${entry.new_categories.join(', ')})`)
    } else {
      lines.push(`- **${name}:** 0 new categories`)
    }
  }
  lines.push('')

  // Score trends
  lines.push(`## Score Trends`)
  lines.push('')
  const scored = personas.filter(p => p.score != null).sort((a, b) => a.score - b.score)
  if (scored.length > 0) {
    lines.push(`- Lowest: ${scored[0].name} (${scored[0].score})`)
    lines.push(`- Highest: ${scored[scored.length - 1].name} (${scored[scored.length - 1].score})`)
  }
  lines.push(`- Distribution: ${Object.entries(score_distribution).map(([k, v]) => `${k}: ${v}`).join(', ')}`)
  lines.push('')

  return lines.join('\n')
}

function writeBuildPlan(catId, catData, rank, totalRanked, personas, existingTasks) {
  const label = categoryLabel(catId)
  const personaNames = catData.personas.map(slug => {
    const p = personas.find(pp => pp.slug === slug)
    return p ? p.name : titleCase(slug.replace(/-/g, ' '))
  })

  const lines = []
  lines.push(`# Consolidated Build: ${label}`)
  lines.push('')
  lines.push(`**Priority rank:** ${rank} of ${totalRanked}`)
  lines.push(`**Personas affected:** ${catData.count} (${personaNames.join(', ')})`)

  const totalGaps = catData.severity_breakdown.HIGH + catData.severity_breakdown.MEDIUM + catData.severity_breakdown.LOW
  const avgSev = catData.severity_breakdown.HIGH >= catData.severity_breakdown.MEDIUM ? 'HIGH' : 'MEDIUM'
  lines.push(`**Average severity:** ${avgSev}`)
  lines.push('')

  // The pattern
  lines.push(`## The Pattern`)
  lines.push('')
  // Summarize from gaps
  const uniqueTitles = [...new Set(catData.representative_gaps.map(g => g.title))]
  if (uniqueTitles.length === 1) {
    lines.push(`${catData.count} persona(s) independently identified the same gap: ${uniqueTitles[0].toLowerCase()}.`)
  } else {
    lines.push(`${catData.count} persona(s) surfaced ${uniqueTitles.length} related gaps in ${label.toLowerCase()}. ` +
      `The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.`)
  }
  lines.push('')

  // Individual gaps
  lines.push(`## Individual Gaps (deduplicated)`)
  lines.push('')
  const seen = new Set()
  let gapNum = 1
  for (const gap of catData.representative_gaps) {
    const key = gap.title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const fpTag = gap.search_hints?.likely_false_positive ? ' [LIKELY BUILT]' : ''
    lines.push(`${gapNum}. **${gap.title}** - from ${gap.from_name} - ${gap.severity}${fpTag}`)
    if (gap.description) {
      const desc = gap.description.length > 200 ? gap.description.slice(0, 200) + '...' : gap.description
      lines.push(`   ${desc}`)
    }
    if (gap.search_hints?.known_built_matches?.length > 0) {
      for (const match of gap.search_hints.known_built_matches) {
        lines.push(`   > Known built: \`${match.file}\` (${match.label})`)
      }
    }
    if (gap.search_hints?.grep_terms?.length > 0) {
      lines.push(`   > Search hints: ${gap.search_hints.grep_terms.join(', ')}`)
    }
    gapNum++
  }
  lines.push('')

  // Recommended build scope
  lines.push(`## Recommended Build Scope`)
  lines.push('')
  lines.push(`A single consolidated build addressing all ${label.toLowerCase()} gaps should cover:`)
  lines.push('')
  for (const title of uniqueTitles) {
    lines.push(`- ${title}`)
  }
  lines.push('')

  // Existing build tasks
  lines.push(`## Existing Build Tasks`)
  lines.push('')
  const relatedTasks = []
  for (const slug of catData.personas) {
    if (existingTasks[slug]) {
      for (const taskPath of existingTasks[slug]) {
        relatedTasks.push(taskPath)
      }
    }
  }
  if (relatedTasks.length > 0) {
    for (const t of relatedTasks) lines.push(`- \`${t}\``)
  } else {
    lines.push(`No existing build tasks found for this category.`)
  }
  lines.push('')

  // Acceptance criteria
  lines.push(`## Acceptance Criteria (merged from all personas)`)
  lines.push('')
  let criteriaNum = 1
  for (const gap of catData.representative_gaps) {
    const key = gap.title.toLowerCase()
    lines.push(`${criteriaNum}. ${gap.from_name}: ${gap.title} is addressed`)
    criteriaNum++
  }
  lines.push('')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Phase 5: Optional LLM clustering
// ---------------------------------------------------------------------------

async function llmCluster(data, model) {
  const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'

  // Group gaps by category for LLM review
  const catGroups = {}
  for (const [catId, catData] of Object.entries(data.categories)) {
    if (catData.representative_gaps.length < 2) continue
    catGroups[catId] = catData.representative_gaps.map(g => ({
      title: g.title,
      from: g.from_name,
      severity: g.severity,
      description: g.description.slice(0, 200),
    }))
  }

  if (Object.keys(catGroups).length === 0) {
    console.log(`${TAG} No categories with 2+ gaps for LLM clustering.`)
    return null
  }

  const prompt = `You are analyzing gaps found by persona stress tests of a chef operations platform.

These gaps were grouped by keyword matching into categories. For each category below:
1. Are any gaps actually the same problem described differently? Mark duplicates.
2. Are any miscategorized? Suggest reassignment.
3. Write a 1-2 sentence "common pattern" for each category.

Respond as JSON: { "categories": { "category-id": { "pattern": "...", "duplicates": [["title1", "title2"]], "miscategorized": [{"title": "...", "suggested_category": "..."}] } } }

Categories and gaps:
${JSON.stringify(catGroups, null, 2)}`

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: 'json',
      }),
    })

    if (!response.ok) {
      console.log(`${TAG} Ollama returned ${response.status}. Skipping LLM clustering.`)
      return null
    }

    const result = await response.json()
    try {
      return JSON.parse(result.response)
    } catch {
      console.log(`${TAG} LLM response was not valid JSON. Skipping refinement.`)
      return null
    }
  } catch (err) {
    console.log(`${TAG} Ollama not reachable: ${err.message}. Skipping LLM clustering.`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const date = new Date().toISOString().slice(0, 10)

  // Phase 1: Extract
  console.log(`${TAG} Phase 1: Extracting gap reports...`)
  const files = collectReportFiles(options.since)

  if (files.length === 0) {
    console.log(`${TAG} No persona gap reports found in docs/stress-tests/.`)
    process.exit(0)
  }

  console.log(`${TAG} Found ${files.length} report(s): ${files.map(f => f.slug).join(', ')}`)

  const personas = []
  for (const file of files) {
    const parsed = parseReport(file)
    if (parsed) {
      personas.push(parsed)
      console.log(`${TAG}   ${parsed.name}: score=${parsed.score}, gaps=${parsed.gaps.length}, wins=${parsed.quick_wins.length}`)
    } else {
      console.log(`${TAG}   FAILED to parse: ${file.filename}`)
    }
  }

  // Phase 2: Categorize
  console.log(`${TAG} Phase 2: Categorizing ${personas.reduce((s, p) => s + p.gaps.length, 0)} gaps...`)
  categorizeGaps(personas)

  for (const persona of personas) {
    for (const gap of persona.gaps) {
      console.log(`${TAG}   [${persona.slug}] "${gap.title}" -> ${gap.categories.join(', ')} (${gap.severity})`)
    }
  }

  // Phase 3: Aggregate
  console.log(`${TAG} Phase 3: Aggregating...`)
  const data = aggregate(personas)

  console.log(`${TAG}   Average score: ${data.average_score}/100`)
  console.log(`${TAG}   Categories hit: ${data.saturation.categories_discovered}/${data.saturation.categories_total}`)
  console.log(`${TAG}   Saturated: ${data.saturation.saturated ? 'YES' : 'NO'} (${data.saturation.consecutive_zero_new} consecutive zero-new)`)
  console.log(`${TAG}   Top categories:`)
  for (const rank of data.priority_ranking.slice(0, 5)) {
    console.log(`${TAG}     ${rank.category}: score=${rank.priority_score}, count=${rank.count}, severity=${rank.avg_severity}`)
  }

  if (options.saturationOnly) {
    console.log(`${TAG} Saturation-only mode. Done.`)
    console.log(JSON.stringify(data.saturation, null, 2))
    return
  }

  if (options.dryRun) {
    console.log(`${TAG} Dry run. Would write to ${OUTPUT_DIR}/:`)
    console.log(`${TAG}   synthesis-${date}.md`)
    console.log(`${TAG}   saturation.json`)
    const buildCategories = data.priority_ranking.filter(r => data.categories[r.category].count >= 2)
    for (const r of buildCategories) {
      console.log(`${TAG}   build-${r.category}.md`)
    }
    console.log(`${TAG} Full aggregation:`)
    console.log(JSON.stringify({
      total_personas: data.total_personas,
      average_score: data.average_score,
      score_distribution: data.score_distribution,
      saturation: data.saturation,
      priority_ranking: data.priority_ranking,
    }, null, 2))
    return
  }

  // Phase 4: Write outputs
  console.log(`${TAG} Phase 4: Writing outputs...`)
  mkdirSync(OUTPUT_DIR, { recursive: true })

  // 4a: Synthesis report
  const synthesisContent = writeSynthesisReport(data, date)
  const synthesisPath = join(OUTPUT_DIR, `synthesis-${date}.md`)
  writeFileSync(synthesisPath, synthesisContent, 'utf8')
  console.log(`${TAG}   Wrote: system/persona-batch-synthesis/synthesis-${date}.md`)

  // 4b: Priority queue
  const allGaps = Object.entries(data.categories).flatMap(([category, categoryData]) => {
    const personasByTitle = new Map()
    for (const gap of categoryData.representative_gaps) {
      const key = gap.title.toLowerCase()
      if (!personasByTitle.has(key)) personasByTitle.set(key, new Set())
      personasByTitle.get(key).add(gap.from)
    }

    return categoryData.representative_gaps.map(gap => ({
      ...gap,
      category,
      personas: [...(personasByTitle.get(gap.title.toLowerCase()) || new Set([gap.from]))],
    }))
  })
  const priorityQueue = allGaps
    .map(gap => ({
      ...gap,
      priority_score: scoreGap(gap, data.categories[gap.category]),
    }))
    .sort((a, b) => b.priority_score - a.priority_score)

  const queuePath = join(OUTPUT_DIR, 'priority-queue.json')
  writeFileSync(queuePath, JSON.stringify({
    generated_at: new Date().toISOString(),
    queue: priorityQueue,
  }, null, 2) + '\n', 'utf8')
  console.log(`${TAG}   Priority queue: ${priorityQueue.length} gaps ranked -> system/persona-batch-synthesis/priority-queue.json`)

  // 4c: Build plans (only for categories with 2+ personas)
  const existingTasks = collectExistingBuildTasks()
  let buildPlansWritten = 0
  for (let i = 0; i < data.priority_ranking.length; i++) {
    const rank = data.priority_ranking[i]
    const catData = data.categories[rank.category]
    if (catData.count < 2) continue

    const content = writeBuildPlan(rank.category, catData, i + 1, data.priority_ranking.length, personas, existingTasks)
    const buildPath = join(OUTPUT_DIR, `build-${rank.category}.md`)
    writeFileSync(buildPath, content, 'utf8')
    console.log(`${TAG}   Wrote: system/persona-batch-synthesis/build-${rank.category}.md`)
    buildPlansWritten++
  }

  // 4d: Saturation JSON
  // Count likely false positives
  let totalGapsWithHints = 0
  let likelyFalsePositives = 0
  for (const [, catData] of Object.entries(data.categories)) {
    for (const gap of catData.representative_gaps) {
      if (gap.search_hints) {
        totalGapsWithHints++
        if (gap.search_hints.likely_false_positive) likelyFalsePositives++
      }
    }
  }

  const saturationData = {
    generated_at: new Date().toISOString(),
    total_personas: data.total_personas,
    average_score: data.average_score,
    score_distribution: data.score_distribution,
    validation_summary: {
      total_gaps: totalGapsWithHints,
      likely_false_positives: likelyFalsePositives,
      false_positive_rate: totalGapsWithHints > 0 ? Math.round((likelyFalsePositives / totalGapsWithHints) * 100) : 0,
      note: 'Pre-validation via known-built feature registry. Run /api/validate-gaps for live codebase grep.',
    },
    categories: Object.fromEntries(
      Object.entries(data.categories).map(([k, v]) => [k, {
        count: v.count,
        personas: v.personas,
        severity_breakdown: v.severity_breakdown,
        gap_count: v.representative_gaps.length,
        gaps: v.representative_gaps.map(g => ({
          title: g.title,
          from: g.from_name,
          severity: g.severity,
          search_hints: g.search_hints || null,
        })),
      }])
    ),
    saturation: data.saturation,
    priority_ranking: data.priority_ranking,
  }
  const saturationPath = join(OUTPUT_DIR, `saturation.json`)
  writeFileSync(saturationPath, JSON.stringify(saturationData, null, 2) + '\n', 'utf8')
  console.log(`${TAG}   Wrote: system/persona-batch-synthesis/saturation.json`)

  console.log(`${TAG} Phase 4 complete. ${buildPlansWritten} build plan(s), 1 synthesis report, 1 saturation dashboard.`)

  // Phase 5: Optional LLM clustering
  if (options.useLlm) {
    console.log(`${TAG} Phase 5: LLM clustering with ${options.model}...`)
    const refinement = await llmCluster(data, options.model)
    if (refinement) {
      const refinedPath = join(OUTPUT_DIR, `synthesis-${date}-refined.json`)
      writeFileSync(refinedPath, JSON.stringify(refinement, null, 2) + '\n', 'utf8')
      console.log(`${TAG}   Wrote: system/persona-batch-synthesis/synthesis-${date}-refined.json`)

      // Also write a refined markdown report
      const refinedMd = generateRefinedReport(data, refinement, date)
      if (refinedMd) {
        const refinedMdPath = join(OUTPUT_DIR, `synthesis-${date}-refined.md`)
        writeFileSync(refinedMdPath, refinedMd, 'utf8')
        console.log(`${TAG}   Wrote: system/persona-batch-synthesis/synthesis-${date}-refined.md`)
      }
    }
  }

  console.log(`${TAG} Done.`)
}

function generateRefinedReport(data, refinement, date) {
  if (!refinement?.categories) return null

  const lines = []
  lines.push(`# Persona Batch Synthesis (LLM-Refined)`)
  lines.push('')
  lines.push(`**Date:** ${date}`)
  lines.push(`**Base report:** synthesis-${date}.md`)
  lines.push(`**Refinement model:** Ollama`)
  lines.push('')
  lines.push(`## LLM Category Refinements`)
  lines.push('')

  for (const [catId, ref] of Object.entries(refinement.categories)) {
    lines.push(`### ${categoryLabel(catId)}`)
    lines.push('')
    if (ref.pattern) lines.push(`**Pattern:** ${ref.pattern}`)
    if (ref.duplicates?.length > 0) {
      lines.push(`**Duplicates found:**`)
      for (const dup of ref.duplicates) {
        lines.push(`- ${dup.join(' = ')}`)
      }
    }
    if (ref.miscategorized?.length > 0) {
      lines.push(`**Miscategorized:**`)
      for (const mis of ref.miscategorized) {
        lines.push(`- "${mis.title}" -> ${mis.suggested_category}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

main().catch(err => {
  console.error(`${TAG} Fatal:`, err)
  process.exit(1)
})
