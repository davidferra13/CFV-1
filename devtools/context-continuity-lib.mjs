import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  ensureDir,
  nowStamp,
  readJson,
  readText,
  relative,
  repoRoot,
  shortHash,
  slugify,
  tokenize,
  writeJson,
  writeText,
} from './agent-skill-utils.mjs'

export const canonicalSurfaceFile = path.join(repoRoot, 'system', 'canonical-surfaces.json')
export const continuityReportsRoot = path.join(
  repoRoot,
  'system',
  'agent-reports',
  'context-continuity'
)
export const continuityMemoryRoot = path.join(repoRoot, 'system', 'continuity-memory')
export const continuityDashboardRoot = path.join(
  repoRoot,
  'system',
  'agent-reports',
  'context-continuity-dashboard'
)

const defaultScanDirs = [
  'app',
  'components',
  'lib',
  'docs/specs',
  'docs/changes',
  'docs/app-complete-audit.md',
  'project-map',
  'memory',
  'system/intake',
  'system/agent-reports',
]

const searchStopWords = new Set([
  'about',
  'again',
  'and',
  'agent',
  'agents',
  'build',
  'builds',
  'codex',
  'current',
  'does',
  'doing',
  'everything',
  'feature',
  'features',
  'for',
  'from',
  'have',
  'into',
  'make',
  'more',
  'need',
  'needs',
  'page',
  'same',
  'should',
  'the',
  'that',
  'this',
  'thing',
  'things',
  'what',
  'when',
  'where',
  'with',
  'work',
  'workflow',
])

function safeRead(file, maxBytes = 300000) {
  try {
    const stat = fs.statSync(file)
    if (stat.size > maxBytes) return ''
    return fs.readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}

function runGit(args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function runRgFiles(paths) {
  const existing = paths.filter((item) => fs.existsSync(path.join(repoRoot, item)))
  if (!existing.length) return []
  try {
    return execFileSync('rg', ['--files', ...existing], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    })
      .split(/\r?\n/)
      .map((item) => item.trim().replace(/\\/g, '/'))
      .filter(Boolean)
  } catch {
    return existing.flatMap((item) => listFilesFallback(path.join(repoRoot, item)).map(relative))
  }
}

function listFilesFallback(root) {
  if (!fs.existsSync(root)) return []
  const stat = fs.statSync(root)
  if (stat.isFile()) return [root]
  const ignored = new Set(['node_modules', '.next', '.git', 'obsidian_export'])
  const out = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const full = path.join(root, entry.name)
    if (entry.isDirectory()) out.push(...listFilesFallback(full))
    else out.push(full)
  }
  return out
}

export function extractContinuityTerms(prompt, extraTerms = []) {
  const raw = [
    ...String(prompt || '').matchAll(/[a-zA-Z0-9_/-]{3,}/g),
    ...String(extraTerms.join(' ') || '').matchAll(/[a-zA-Z0-9_/-]{3,}/g),
  ].map((match) => match[0].toLowerCase())
  const terms = []
  for (const token of raw) {
    const normalized = token.replace(/^\/+|\/+$/g, '')
    if (searchStopWords.has(normalized)) continue
    if (/^\d+$/.test(normalized)) continue
    if (!terms.includes(normalized)) terms.push(normalized)
  }
  return terms.slice(0, 24)
}

export function loadCanonicalSurfaces(file = canonicalSurfaceFile) {
  const data = readJson(file, null)
  if (!data || !Array.isArray(data.surfaces)) {
    return {
      generated_at: null,
      policy: {},
      surfaces: [],
    }
  }
  return data
}

function scoreText(text, terms) {
  const lower = String(text || '').toLowerCase()
  let score = 0
  const hits = []
  for (const term of terms) {
    if (!term) continue
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const count = (lower.match(new RegExp(escaped, 'g')) || []).length
    if (count) {
      score += Math.min(count, 5)
      hits.push(term)
    }
  }
  return { score, hits: [...new Set(hits)] }
}

function classifyFile(file) {
  if (file.startsWith('app/')) return 'route'
  if (file.startsWith('components/')) return 'component'
  if (file.startsWith('lib/')) return 'module'
  if (file.startsWith('docs/specs/')) return 'spec'
  if (file.startsWith('docs/changes/')) return 'change-doc'
  if (file.startsWith('project-map/')) return 'project-map'
  if (file.startsWith('system/')) return 'system'
  if (file.startsWith('memory/')) return 'memory'
  return 'other'
}

function scanFiles(terms, dirs = defaultScanDirs, limit = 30) {
  const files = runRgFiles(dirs)
  const scored = []
  for (const file of files) {
    const full = path.join(repoRoot, file)
    const pathScore = scoreText(file, terms)
    const content = pathScore.score ? safeRead(full) : safeRead(full, 100000)
    const contentScore = scoreText(content.slice(0, 100000), terms)
    const score = pathScore.score * 4 + contentScore.score
    if (score <= 0) continue
    scored.push({
      file,
      kind: classifyFile(file),
      score,
      hits: [...new Set([...pathScore.hits, ...contentScore.hits])].slice(0, 10),
    })
  }
  return scored.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file)).slice(0, limit)
}

function recentCommitMatches(terms, limit = 30) {
  return runGit(['log', `--oneline`, `-${limit}`])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const result = scoreText(line, terms)
      return result.score
        ? {
            line,
            score: result.score,
            hits: result.hits,
          }
        : null
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

function dirtyMatches(terms) {
  return runGit(['status', '--short'])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const file = line.slice(3).trim()
      const result = scoreText(`${line} ${file}`, terms)
      return result.score
        ? {
            line,
            file,
            score: result.score,
            hits: result.hits,
          }
        : null
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}

function claimMatches(terms) {
  const dir = path.join(repoRoot, 'system', 'agent-claims')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const file = path.join(dir, name)
      const data = readJson(file, null)
      const text = JSON.stringify(data || {})
      const result = scoreText(text, terms)
      return result.score
        ? {
            file: relative(file),
            score: result.score,
            hits: result.hits,
            prompt: data?.prompt || null,
            owned: data?.owned || [],
            status: data?.status || null,
          }
        : null
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
}

function surfaceMatches(terms, registry = loadCanonicalSurfaces()) {
  return registry.surfaces
    .map((surface) => {
      const text = [
        surface.id,
        surface.label,
        surface.description,
        ...(surface.keywords || []),
        ...(surface.canonical_routes || []),
        ...(surface.canonical_files || []),
        ...(surface.sandbox_routes || []),
      ].join(' ')
      const result = scoreText(text, terms)
      return result.score
        ? {
            id: surface.id,
            label: surface.label,
            score: result.score,
            hits: result.hits,
            canonical_routes: surface.canonical_routes || [],
            canonical_files: surface.canonical_files || [],
            sandbox_routes: surface.sandbox_routes || [],
            duplicate_policy: surface.duplicate_policy || null,
          }
        : null
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

function buildDuplicateRisks(report) {
  const risks = []
  const homepageTerms = new Set(['homepage', 'homepages', 'landing', 'public'])
  const preventionTerms = new Set([
    'continuity',
    'prevention',
    'guard',
    'scanner',
    'detector',
    'duplicate-prevention',
  ])
  const variantTerms = new Set(['another', 'variant', 'version', 'clone', 'new'])
  const isHomepageTooling =
    report.terms.some((term) => homepageTerms.has(term)) &&
    report.terms.some((term) => preventionTerms.has(term)) &&
    !report.terms.some((term) => variantTerms.has(term))
  if (report.terms.some((term) => homepageTerms.has(term)) && !isHomepageTooling) {
    risks.push({
      level: 'high',
      reason: 'Homepage work is capped to the production homepage and one sandbox duplicate.',
      owner: 'public-homepage',
    })
  }
  if (report.canonical_surfaces.length > 1 && report.canonical_surfaces[1].score >= 2) {
    risks.push({
      level: 'medium',
      reason: 'Multiple canonical surfaces matched the prompt.',
      owners: report.canonical_surfaces.slice(0, 3).map((item) => item.id),
    })
  }
  if (report.dirty_matches.length) {
    risks.push({
      level: 'medium',
      reason: 'Dirty files already exist in this domain and may be another agent active work.',
      files: report.dirty_matches.slice(0, 5).map((item) => item.file),
    })
  }
  if (report.claim_matches.length) {
    risks.push({
      level: 'medium',
      reason: 'Active or recorded claims overlap this domain.',
      claims: report.claim_matches.slice(0, 3).map((item) => item.file),
    })
  }
  return risks
}

function decide(report) {
  if (report.duplicate_risks.some((risk) => risk.level === 'high')) {
    return {
      decision: 'merge-candidate',
      stop_required: true,
      reason: 'High duplicate risk requires a canonical owner decision before coding.',
    }
  }
  if (report.canonical_surfaces.length) {
    return {
      decision: report.dirty_matches.length || report.claim_matches.length ? 'attach' : 'extend',
      stop_required: false,
      reason: `Matched canonical surface ${report.canonical_surfaces[0].id}.`,
    }
  }
  if (report.related_files.length) {
    return {
      decision: 'attach',
      stop_required: false,
      reason: 'Related files exist without a stronger canonical registry match.',
    }
  }
  return {
    decision: 'new',
    stop_required: false,
    reason: 'No credible existing owner found by the continuity scan.',
  }
}

export function buildContinuityReport({
  prompt,
  terms: explicitTerms = [],
  dirs = defaultScanDirs,
  limit = 30,
  write = false,
} = {}) {
  const terms = extractContinuityTerms(prompt, explicitTerms)
  const report = {
    generated_at: new Date().toISOString(),
    prompt: String(prompt || ''),
    terms,
    scanned_dirs: dirs,
    canonical_surfaces: surfaceMatches(terms),
    related_files: scanFiles(terms, dirs, limit),
    recent_commits: recentCommitMatches(terms),
    dirty_matches: dirtyMatches(terms),
    claim_matches: claimMatches(terms),
    duplicate_risks: [],
    continuity: null,
  }
  report.duplicate_risks = buildDuplicateRisks(report)
  report.continuity = decide(report)
  if (write) {
    ensureDir(continuityReportsRoot)
    const file = path.join(continuityReportsRoot, `${nowStamp()}-${slugify(prompt)}.json`)
    writeJson(file, report)
    report.report_path = relative(file)
  }
  return report
}

export function collectContinuityDocuments(
  dirs = ['docs/specs', 'docs/changes', 'app', 'components', 'lib']
) {
  const files = runRgFiles(dirs).filter((file) => /\.(md|mdx|ts|tsx|js|jsx|mjs|json)$/.test(file))
  return files
    .filter((file) => !file.startsWith('docs/specs/auto-repair/'))
    .map((file) => {
      const full = path.join(repoRoot, file)
      const text = safeRead(full, 160000)
      if (!text.trim()) return null
      return {
        file,
        kind: classifyFile(file),
        tokens: tokenize(`${file}\n${text.slice(0, 40000)}`),
      }
    })
    .filter(Boolean)
}

export function findNearDuplicateClusters({ threshold = 0.42, maxFiles = 500 } = {}) {
  const docs = collectContinuityDocuments().slice(0, maxFiles)
  const pairs = []
  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const a = docs[i]
      const b = docs[j]
      if (a.kind === 'module' && b.kind === 'module') continue
      const intersection = [...a.tokens].filter((token) => b.tokens.has(token)).length
      const union = a.tokens.size + b.tokens.size - intersection
      const score = union ? intersection / union : 0
      if (score >= threshold) {
        pairs.push({
          a: a.file,
          b: b.file,
          score: Number(score.toFixed(3)),
          shared_terms: [...a.tokens].filter((token) => b.tokens.has(token)).slice(0, 12),
        })
      }
    }
  }
  return {
    generated_at: new Date().toISOString(),
    threshold,
    scanned_count: docs.length,
    pair_count: pairs.length,
    pairs: pairs.sort((a, b) => b.score - a.score).slice(0, 100),
  }
}

export function buildFeatureFamilyMap(registry = loadCanonicalSurfaces()) {
  const files = runRgFiles(['app', 'components', 'lib', 'docs/specs', 'docs/changes'])
  const nodes = []
  const edges = []
  for (const surface of registry.surfaces) {
    nodes.push({
      id: surface.id,
      type: 'canonical-surface',
      label: surface.label,
      routes: surface.canonical_routes || [],
      files: surface.canonical_files || [],
    })
    for (const file of surface.canonical_files || []) {
      edges.push({
        source: surface.id,
        target: file,
        type: 'owns-file',
      })
    }
    for (const route of surface.canonical_routes || []) {
      edges.push({
        source: surface.id,
        target: route,
        type: 'owns-route',
      })
    }
  }
  for (const file of files.slice(0, 2000)) {
    const terms = tokenize(file)
    const matched = registry.surfaces.find((surface) =>
      (surface.keywords || []).some((keyword) => terms.has(String(keyword).toLowerCase()))
    )
    if (matched) {
      if (!nodes.some((node) => node.id === file)) {
        nodes.push({ id: file, type: classifyFile(file), label: path.basename(file) })
      }
      edges.push({ source: matched.id, target: file, type: 'keyword-match' })
    }
  }
  return {
    generated_at: new Date().toISOString(),
    node_count: nodes.length,
    edge_count: edges.length,
    nodes,
    edges,
  }
}

export function writeMemoryPacket({
  title,
  userIntent,
  canonicalHome,
  duplicateRisk,
  existingRelatedSurfaces = [],
  followUpQuestion = '',
  links = [],
  vault = null,
  dir = continuityMemoryRoot,
} = {}) {
  const safeTitle = title || 'Context Continuity Packet'
  const packetDate = new Date().toISOString().slice(0, 10)
  const lines = [
    `# ${safeTitle}`,
    '',
    `- Date: ${packetDate}`,
    '- Source: Codex session',
    `- User intent: ${userIntent || ''}`,
    `- Existing related surfaces: ${existingRelatedSurfaces.join(', ') || ''}`,
    `- Canonical home: ${canonicalHome || ''}`,
    `- Duplicate risk: ${duplicateRisk || ''}`,
    `- Follow-up question: ${followUpQuestion || ''}`,
    `- Links: ${links.join(', ') || ''}`,
    '',
  ]
  const file = path.join(dir, `${slugify(safeTitle)}-${shortHash(lines.join('\n'))}.md`)
  writeText(file, lines.join('\n'))
  const resolvedVault = vault ? resolveObsidianVault(vault) : null
  let vaultFile = null
  let indexFiles = []
  if (resolvedVault) {
    vaultFile = path.join(resolvedVault, `${obsidianNoteName(safeTitle)}.md`)
    writeText(vaultFile, renderObsidianPacket(lines, safeTitle, existingRelatedSurfaces))
    indexFiles = ensureObsidianIndexes({
      vault: resolvedVault,
      packetTitle: safeTitle,
      packetDate,
      userIntent,
      canonicalHome,
      existingRelatedSurfaces,
      links,
    })
  }
  return {
    file: relative(file).startsWith('..') ? file : relative(file),
    vault_used: Boolean(vaultFile),
    vault_file: vaultFile,
    index_files: indexFiles,
  }
}

export function resolveObsidianVault(vault = null) {
  if (vault && vault !== true) return path.resolve(String(vault))
  const candidates = [
    process.env.OBSIDIAN_VAULT,
    'D:\\Obsidian Vault\\AI Research',
    'F:\\OpenClaw-Vault',
    '/mnt/d/Obsidian Vault/AI Research',
  ].filter(Boolean)
  const found = candidates.find((candidate) => fs.existsSync(candidate))
  return found ? path.resolve(found) : null
}

function obsidianNoteName(title) {
  return String(title || 'Context Continuity Packet')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function renderObsidianPacket(lines, title, relatedSurfaces) {
  const related = [
    '[[ChefFlow Index]]',
    '[[Codex Workflow Index]]',
    '[[ChefFlow Decisions]]',
    ...relatedSurfaces.map((surface) => `[[${surface}]]`),
  ]
  return [
    ...lines,
    '## Related',
    ...[...new Set(related)].map((link) => `- ${link}`),
    '',
  ].join('\n')
}

function ensureObsidianIndexes({
  vault,
  packetTitle,
  packetDate,
  userIntent,
  canonicalHome,
  existingRelatedSurfaces,
  links,
}) {
  const packetLink = `[[${obsidianNoteName(packetTitle)}]]`
  const indexFiles = [
    upsertObsidianIndex({
      vault,
      name: 'ChefFlow Index',
      baseLines: [
        '# ChefFlow Index',
        '',
        '- [[ChefFlow Decisions]]',
        '- [[Codex Workflow Index]]',
        '',
        '## Canonical Repo Surfaces',
        '- `system/canonical-surfaces.json`',
        '- `.claude/skills/context-continuity/SKILL.md`',
        '- `devtools/obsidian-memory-packet.mjs`',
        '',
        '## Memory Packets',
      ],
      line: `- ${packetLink}`,
    }),
    upsertObsidianIndex({
      vault,
      name: 'Codex Workflow Index',
      baseLines: [
        '# Codex Workflow Index',
        '',
        '- [[ChefFlow Index]]',
        '- [[ChefFlow Decisions]]',
        '',
        '## Core Workflow',
        '- `docs/AGENT-WORKFLOW.md`',
        '- `.claude/skills/omninet/SKILL.md`',
        '- `.claude/skills/context-continuity/SKILL.md`',
        '- `.claude/skills/skill-garden/SKILL.md`',
        '',
        '## Memory Packets',
      ],
      line: `- ${packetLink}`,
    }),
    upsertObsidianIndex({
      vault,
      name: 'ChefFlow Decisions',
      baseLines: [
        '# ChefFlow Decisions',
        '',
        '- [[ChefFlow Index]]',
        '- [[Codex Workflow Index]]',
        '',
        '## Decisions',
      ],
      line: `- ${packetDate} - ${packetLink}: ${decisionSummary({
        userIntent,
        canonicalHome,
        existingRelatedSurfaces,
        links,
      })}`,
    }),
  ]
  return indexFiles
}

function upsertObsidianIndex({ vault, name, baseLines, line }) {
  const file = path.join(vault, `${name}.md`)
  const existing = fs.existsSync(file) ? readText(file) : `${baseLines.join('\n')}\n`
  const text = appendUniqueLine(existing, line)
  writeText(file, text)
  return file
}

function appendUniqueLine(text, line) {
  const normalized = text.endsWith('\n') ? text : `${text}\n`
  if (normalized.split(/\r?\n/).includes(line)) return normalized
  return `${normalized}${line}\n`
}

function decisionSummary({ userIntent, canonicalHome, existingRelatedSurfaces, links }) {
  const parts = [
    userIntent,
    canonicalHome ? `home ${canonicalHome}` : '',
    existingRelatedSurfaces?.length ? `surfaces ${existingRelatedSurfaces.join(', ')}` : '',
    links?.length ? `links ${links.join(', ')}` : '',
  ].filter(Boolean)
  return parts.join('; ') || 'Captured continuity packet'
}

export function renderContinuityDashboard({ scan, duplicates, featureMap }) {
  const rows = (items, columns) =>
    items
      .map(
        (item) =>
          `<tr>${columns.map((column) => `<td>${escapeHtml(String(item[column] ?? ''))}</td>`).join('')}</tr>`
      )
      .join('\n')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ChefFlow Context Continuity</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2933; background: #f7f8fa; }
    h1, h2 { margin: 0 0 12px; }
    section { background: #fff; border: 1px solid #d9dee7; border-radius: 8px; padding: 18px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #e6e9ef; padding: 8px; text-align: left; vertical-align: top; }
    .pill { display: inline-block; border: 1px solid #9aa6b2; border-radius: 999px; padding: 2px 8px; margin: 2px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>ChefFlow Context Continuity</h1>
  <section>
    <h2>Latest Scan</h2>
    <p><strong>Decision:</strong> ${escapeHtml(scan?.continuity?.decision || 'unknown')}</p>
    <p><strong>Reason:</strong> ${escapeHtml(scan?.continuity?.reason || '')}</p>
    <p>${(scan?.terms || []).map((term) => `<span class="pill">${escapeHtml(term)}</span>`).join('')}</p>
  </section>
  <section>
    <h2>Canonical Surfaces</h2>
    <table><thead><tr><th>ID</th><th>Score</th><th>Routes</th></tr></thead><tbody>${rows(
      scan?.canonical_surfaces || [],
      ['id', 'score', 'canonical_routes']
    )}</tbody></table>
  </section>
  <section>
    <h2>Related Files</h2>
    <table><thead><tr><th>File</th><th>Kind</th><th>Score</th></tr></thead><tbody>${rows(
      scan?.related_files || [],
      ['file', 'kind', 'score']
    )}</tbody></table>
  </section>
  <section>
    <h2>Near Duplicates</h2>
    <p>${duplicates?.pair_count || 0} possible pairs found.</p>
    <table><thead><tr><th>A</th><th>B</th><th>Score</th></tr></thead><tbody>${rows(
      duplicates?.pairs?.slice(0, 25) || [],
      ['a', 'b', 'score']
    )}</tbody></table>
  </section>
  <section>
    <h2>Feature Family Map</h2>
    <p>${featureMap?.node_count || 0} nodes, ${featureMap?.edge_count || 0} edges.</p>
  </section>
</body>
</html>
`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
