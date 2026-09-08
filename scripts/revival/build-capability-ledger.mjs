import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const CAPABILITIES = [
  ['inquiry-intake', /inquir|intake|lead/i],
  ['client-memory', /client|household|guest/i],
  ['quote-contract', /quote|proposal|contract|estimate/i],
  ['booking-event', /booking|event|ticket/i],
  ['payment-ledger', /payment|invoice|stripe|ledger|refund/i],
  ['menu-recipe', /menu|recipe|dish|component/i],
  ['costing-profit', /cost|pricing|price|margin|profit|pie/i],
  ['procurement', /shopping|grocery|vendor|supplier|ingredient/i],
  ['prep-logistics', /prep|checklist|task|timeline|logistics/i],
  ['schedule-travel', /calendar|schedule|travel|route|parking/i],
  ['service-execution', /service|execution|callsheet|day-of/i],
  ['closeout-learning', /closeout|post-event|feedback|review|rebook/i],
  ['network-referral', /network|referral|handoff|circle|collab/i],
]

function runGit(repoPath, args) {
  try {
    return execFileSync('git', ['-C', repoPath, ...args], {
      encoding: 'utf8',
      timeout: 15000,
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

export function classifyTrackedFiles(files, capabilities = CAPABILITIES) {
  const sortedFiles = [...new Set(files.filter(Boolean))].sort()
  return capabilities.map(([id, matcher]) => {
    const matches = sortedFiles.filter((file) => matcher.test(file))
    return {
      id,
      evidence_state: matches.length ? 'candidate-evidence' : 'no-tracked-evidence',
      matched_file_count: matches.length,
      sample_files: matches.slice(0, 8),
    }
  })
}

export function resolveScanPath(project, repoRoot) {
  if (!project.scan_path) return null
  return path.isAbsolute(project.scan_path)
    ? path.normalize(project.scan_path)
    : path.resolve(repoRoot, project.scan_path)
}

export function inspectProject(project, repoRoot) {
  const scanPath = resolveScanPath(project, repoRoot)
  if (!scanPath) {
    return {
      ...project,
      inspection_state: 'unresolved',
      git: null,
      capabilities: CAPABILITIES.map(([id]) => ({
        id,
        evidence_state: 'unresolved',
        matched_file_count: 0,
        sample_files: [],
      })),
    }
  }

  if (!existsSync(scanPath)) {
    return {
      ...project,
      inspection_state: 'path-not-found',
      inspected_path: scanPath,
      git: null,
      capabilities: CAPABILITIES.map(([id]) => ({
        id,
        evidence_state: 'unresolved',
        matched_file_count: 0,
        sample_files: [],
      })),
    }
  }

  const gitRoot = runGit(scanPath, ['rev-parse', '--show-toplevel'])
  if (!gitRoot) {
    return {
      ...project,
      inspection_state: 'path-verified-no-git',
      inspected_path: scanPath,
      git: null,
      capabilities: CAPABILITIES.map(([id]) => ({
        id,
        evidence_state: 'unresolved',
        matched_file_count: 0,
        sample_files: [],
      })),
    }
  }

  const trackedOutput = runGit(scanPath, ['ls-files'])
  const statusOutput = runGit(scanPath, ['status', '--short'])
  const trackedFiles = trackedOutput === null ? null : trackedOutput.split(/\r?\n/).filter(Boolean)
  const statusLines = statusOutput === null ? null : statusOutput.split(/\r?\n/).filter(Boolean)
  return {
    ...project,
    inspection_state: 'git-verified',
    inspected_path: scanPath,
    git: {
      root: gitRoot,
      branch: runGit(scanPath, ['branch', '--show-current']) || null,
      head: runGit(scanPath, ['rev-parse', 'HEAD']),
      dirty: statusLines === null ? null : statusLines.length > 0,
      changed_path_count: statusLines?.length ?? null,
      tracked_file_count: trackedFiles?.length ?? null,
    },
    capabilities: trackedFiles === null
      ? CAPABILITIES.map(([id]) => ({
        id,
        evidence_state: 'inspection-failed',
        matched_file_count: 0,
        sample_files: [],
      }))
      : classifyTrackedFiles(trackedFiles),
  }
}

export function validateManifest(manifest) {
  if (manifest?.schema_version !== 1) throw new Error('Unsupported product role manifest schema')
  if (!manifest.decision_id || !Array.isArray(manifest.projects) || manifest.projects.length === 0) {
    throw new Error('Manifest requires a decision id and at least one project')
  }
  const ids = manifest.projects.map((project) => project.id)
  if (ids.some((id) => !id)) throw new Error('Every project requires an id')
  if (new Set(ids).size !== ids.length) throw new Error('Project ids must be unique')
  if (manifest.projects.filter((project) => project.role === 'canonical-platform').length !== 1) {
    throw new Error('Manifest requires exactly one canonical platform')
  }
  for (const project of manifest.projects) {
    if (!project.name || !project.role || !project.path_status || !project.integration_rule) {
      throw new Error(`Project ${project.id} is missing required product truth`)
    }
    if (!project.scan_path && !project.path_status.includes('unresolved')) {
      throw new Error(`Project ${project.id} has no scan path but is not marked unresolved`)
    }
  }
  return manifest
}

export function buildLedger(manifest, options = {}) {
  const repoRoot = options.repoRoot || process.cwd()
  validateManifest(manifest)
  return {
    schema_version: 1,
    source_decision_id: manifest.decision_id,
    evidence_warning: 'File-name matches are candidate evidence only. They do not prove a feature works.',
    projects: manifest.projects.map((project) => inspectProject(project, repoRoot)),
  }
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]))
}

export function stableJson(value) {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`
}

export function renderMarkdown(ledger) {
  const lines = [
    '# ChefFlow Cross-Project Capability Ledger',
    '',
    '> File-name matches are candidate evidence. They do not prove a feature works.',
    '',
    '| Project | Permanent role | Path state | Git | Dirty | Tracked files |',
    '| --- | --- | --- | --- | ---: | ---: |',
  ]
  for (const project of ledger.projects) {
    lines.push(`| ${project.name} | ${project.role} | ${project.inspection_state} | ${project.git?.head?.slice(0, 12) || 'unresolved'} | ${project.git?.dirty ?? 'unknown'} | ${project.git?.tracked_file_count ?? 'unknown'} |`)
  }
  lines.push('', '## Capability evidence', '')
  for (const project of ledger.projects) {
    lines.push(`### ${project.name}`, '', '| Capability | Evidence state | Matches |', '| --- | --- | ---: |')
    for (const capability of project.capabilities) {
      lines.push(`| ${capability.id} | ${capability.evidence_state} | ${capability.matched_file_count} |`)
    }
    lines.push('')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

function parseArgs(argv) {
  const result = { mode: 'summary' }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--write') result.mode = 'write'
    else if (argv[index] === '--check') result.mode = 'check'
    else if (argv[index] === '--manifest') result.manifest = argv[++index]
    else if (argv[index] === '--output-dir') result.outputDir = argv[++index]
  }
  return result
}

export function main(argv = process.argv.slice(2), repoRoot = process.cwd()) {
  const args = parseArgs(argv)
  const manifestPath = path.resolve(repoRoot, args.manifest || 'docs/revival/product-role-manifest.json')
  const outputDir = path.resolve(repoRoot, args.outputDir || 'docs/revival/generated')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const ledger = buildLedger(manifest, { repoRoot })
  const json = stableJson(ledger)
  const markdown = renderMarkdown(ledger)
  const jsonPath = path.join(outputDir, 'capability-ledger.json')
  const markdownPath = path.join(outputDir, 'capability-ledger.md')

  if (args.mode === 'write') {
    mkdirSync(outputDir, { recursive: true })
    writeFileSync(jsonPath, json)
    writeFileSync(markdownPath, markdown)
  } else if (args.mode === 'check') {
    if (!existsSync(jsonPath) || !existsSync(markdownPath)) throw new Error('Generated ledger files are missing')
    if (readFileSync(jsonPath, 'utf8') !== json || readFileSync(markdownPath, 'utf8') !== markdown) {
      throw new Error('Generated capability ledger has drifted')
    }
  }

  return {
    mode: args.mode,
    project_count: ledger.projects.length,
    verified_git_projects: ledger.projects.filter((project) => project.inspection_state === 'git-verified').length,
    unresolved_projects: ledger.projects.filter((project) => project.inspection_state !== 'git-verified').map((project) => project.id),
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isCli) {
  try {
    console.log(JSON.stringify(main()))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
