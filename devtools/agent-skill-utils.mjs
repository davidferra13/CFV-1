import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

export const repoRoot = process.cwd()
export const projectSkillRoot = path.join(repoRoot, '.claude', 'skills')
export const learningInboxRoot = path.join(repoRoot, 'system', 'agent-learning-inbox')
export const guidanceInboxRoot = path.join(repoRoot, 'system', 'external-guidance-inbox')
export const reportsRoot = path.join(repoRoot, 'system', 'agent-reports')
export const flightRecordsRoot = path.join(reportsRoot, 'flight-records')
export const skillMaturityFile = path.join(repoRoot, 'system', 'agent-skill-maturity.json')

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export function readText(file) {
  return fs.readFileSync(file, 'utf8')
}

export function writeText(file, text) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, text)
}

export function slugify(input) {
  return String(input || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item'
}

export function nowStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export function shortHash(input) {
  return crypto.createHash('sha1').update(String(input)).digest('hex').slice(0, 10)
}

export function listSkillFiles(skillRoot = projectSkillRoot) {
  if (!fs.existsSync(skillRoot)) return []
  const entries = fs.readdirSync(skillRoot, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(skillRoot, entry.name)
      const upper = path.join(dir, 'SKILL.md')
      const lower = path.join(dir, 'skill.md')
      if (fs.existsSync(upper)) return upper
      if (fs.existsSync(lower)) return lower
      return null
    })
    .filter(Boolean)
    .sort()
}

export function parseSkillFile(file) {
  const raw = readText(file)
  const folderName = path.basename(path.dirname(file))
  const result = {
    file,
    folderName,
    raw,
    frontmatter: {},
    body: raw,
    name: null,
    description: null,
    errors: [],
    warnings: [],
  }

  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    result.errors.push('missing frontmatter fence')
    return result
  }

  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    result.errors.push('malformed frontmatter fence')
    return result
  }

  const frontmatterText = match[1]
  result.body = match[2] || ''
  for (const line of frontmatterText.split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!pair) continue
    const key = pair[1]
    let value = pair[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result.frontmatter[key] = value
  }

  result.name = result.frontmatter.name || null
  result.description = result.frontmatter.description || null
  return result
}

export function loadSkills(skillRoot = projectSkillRoot) {
  return listSkillFiles(skillRoot).map(parseSkillFile)
}

export function tokenize(text) {
  const stop = new Set([
    'the',
    'and',
    'for',
    'with',
    'when',
    'that',
    'this',
    'from',
    'into',
    'use',
    'uses',
    'using',
    'skill',
    'skills',
    'chef',
    'chefflow',
    'codex',
    'agent',
    'task',
    'work',
    'file',
    'files',
  ])
  return new Set(
    String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !stop.has(token)),
  )
}

export function jaccard(a, b) {
  if (!a.size || !b.size) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection += 1
  }
  const union = a.size + b.size - intersection
  return union ? intersection / union : 0
}

export function relative(file) {
  return path.relative(repoRoot, file).replace(/\\/g, '/')
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(readText(file))
  } catch {
    return fallback
  }
}

export function writeJson(file, data) {
  writeText(file, `${JSON.stringify(data, null, 2)}\n`)
}

export function splitCsv(input) {
  return String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function currentBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

export function loadSkillMaturity() {
  const manifest = readJson(skillMaturityFile, null)
  if (!manifest || typeof manifest !== 'object') {
    return {
      generated_at: null,
      default_state: 'active',
      skills: {},
    }
  }
  return {
    generated_at: manifest.generated_at || null,
    default_state: manifest.default_state || 'active',
    skills: manifest.skills && typeof manifest.skills === 'object' ? manifest.skills : {},
  }
}

export function skillMaturityState(skillName, manifest = loadSkillMaturity()) {
  const row = manifest.skills?.[skillName]
  return row?.state || manifest.default_state || 'active'
}

export function updateSkillMaturity(skillName, patch) {
  const manifest = loadSkillMaturity()
  const previous = manifest.skills[skillName] || {}
  manifest.generated_at = new Date().toISOString()
  manifest.skills[skillName] = {
    ...previous,
    ...patch,
    updated_at: new Date().toISOString(),
  }
  writeJson(skillMaturityFile, manifest)
  return manifest.skills[skillName]
}

export function readStdin() {
  if (process.stdin.isTTY) return ''
  return fs.readFileSync(0, 'utf8')
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      args._.push(arg)
      continue
    }
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      i += 1
    }
  }
  return args
}
