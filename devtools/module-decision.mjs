#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { MODULES, decideModuleOwnership } from '../scripts/unified-build-queue/generate.mjs'

export function decideModule({
  root = process.cwd(),
  prompt = '',
  sourcePath = '',
  title = '',
  summary = '',
} = {}) {
  const normalizedSourcePath = slash(sourcePath)
  const candidates = loadCandidates(root)
  const exactCandidate = normalizedSourcePath
    ? candidates.find((candidate) => slash(candidate.sourcePath) === normalizedSourcePath)
    : null

  if (exactCandidate) {
    return decisionFromCandidate(exactCandidate, 'queue-source-path')
  }

  const ownership = decideModuleOwnership({
    title,
    summary,
    sourcePath,
    text: prompt,
  })
  const text = [prompt, title, summary, sourcePath].join('\n').toLowerCase()
  const scored = MODULES.map((module) => {
    const hits = module.keywords.filter((keyword) => text.includes(keyword.toLowerCase()))
    return { module, hits, score: hits.length }
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.module.id.localeCompare(right.module.id))

  const best = scored.find((entry) => entry.module.id === ownership.module.id)
  if (!best) {
    return {
      status: 'module_review_required',
      module: ownership.module,
      submodule: ownership.submodule,
      assignment: ownership.assignment,
      confidence: 'none',
      evidence: [],
      reason: 'No queue candidate or module keyword evidence matched this work.',
      nextAction: 'Route to module review before implementation.',
    }
  }

  const tied = scored.filter((entry) => entry.score === best.score)
  const confidence = best.score >= 2 && tied.length === 1 ? 'high' : 'medium'
  return {
    status: 'module_owner_found',
    module: ownership.module,
    submodule: ownership.submodule,
    assignment: ownership.assignment,
    confidence,
    evidence: best.hits.map((hit) => ({ type: 'keyword', value: hit })),
    alternates: tied.filter((entry) => entry.module.id !== best.module.id).slice(0, 3).map((entry) => ({
      module: { id: entry.module.id, label: entry.module.label },
      hits: entry.hits,
    })),
    reason: `Matched ${best.hits.length} module keyword(s).`,
    nextAction: 'Verify against code truth, then name interface, invariants, and test surface before implementation.',
  }
}

function decisionFromCandidate(candidate, evidenceType) {
  const module = candidate.module ?? { id: 'unassigned', label: 'Unassigned' }
  const submodule = candidate.submodule ?? { id: 'unassigned', label: 'Unassigned' }
  const assignment = candidate.assignment ?? (module.id === 'unassigned' ? 'unassigned' : 'proposed')
  const unassigned = module.id === 'unassigned'
  return {
    status: unassigned ? 'module_review_required' : 'module_owner_found',
    module,
    submodule,
    assignment,
    confidence: 'queue',
    evidence: [
      {
        type: evidenceType,
        source: candidate.source,
        sourcePath: slash(candidate.sourcePath),
        title: candidate.title,
        classification: candidate.classification,
        approvalState: candidate.approvalState,
      },
    ],
    reason: unassigned
      ? 'Queue evidence exists, but the candidate is unassigned.'
      : 'Queue evidence already assigned this work to a module.',
    nextAction: unassigned
      ? 'Route to module review before implementation.'
      : 'Verify against code truth, then name interface, invariants, and test surface before implementation.',
  }
}

function loadCandidates(root) {
  const file = path.join(root, 'system', 'unified-build-queue', 'candidates.json')
  if (!existsSync(file)) return []
  return JSON.parse(readFileSync(file, 'utf8'))
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [], root: process.cwd() }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--root') args.root = argv[++index]
    else if (arg === '--prompt' || arg === '-p') args.prompt = argv[++index]
    else if (arg === '--source-path' || arg === '--sourcePath') args.sourcePath = argv[++index]
    else if (arg === '--title') args.title = argv[++index]
    else if (arg === '--summary') args.summary = argv[++index]
    else if (arg === '--help') args.help = true
    else args._.push(arg)
  }
  if (!args.prompt && args._.length) args.prompt = args._.join(' ')
  return args
}

function printUsage() {
  console.log(`Usage:
  node devtools/module-decision.mjs --prompt "pricing export confidence"
  node devtools/module-decision.mjs --source-path docs/specs/example.md

Returns a module decision or module_review_required. Always verify against code truth before building.`)
}

function slash(value) {
  return String(value ?? '').replace(/\\/g, '/')
}

async function main() {
  const args = parseArgs()
  if (args.help) {
    printUsage()
    return
  }

  const decision = decideModule(args)
  console.log(JSON.stringify(decision, null, 2))
  if (decision.status === 'module_review_required') process.exitCode = 2
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
const modulePath = fileURLToPath(import.meta.url)
if (invokedPath && pathToFileURL(invokedPath).href === pathToFileURL(modulePath).href) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
