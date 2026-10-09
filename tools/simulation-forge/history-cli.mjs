#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve, relative, isAbsolute, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import {
  compileHistory,
  importGmailThreads,
  importReferenceFixtures,
  replayHistoryThroughForge,
  branchHistory,
} from './history.mjs'
import { findingsToCareerHistory, runCareerReplay } from './career-replay.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const usage =
  'history-cli.mjs import|replay|branch|career --input <private JSON> --output <new private JSON>'
const pathOutsideWorktree = (path) => {
  const target = resolve(path),
    rel = relative(root, target)
  if (!rel || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep)))
    throw Error('Historical client output must be outside the Git worktree')
  return target
}
const revision = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}
const save = async (path, value) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
}

/** One canonical archive entrypoint. Career is its explicit structured-workflow layer. */
export async function main(argv = process.argv.slice(2)) {
  const args = {},
    command = argv[0]
  if (command === '--help') {
    console.log(usage)
    return 0
  }
  if (!['import', 'replay', 'branch', 'career'].includes(command)) throw Error(usage)
  const flags = new Set([
    '--input',
    '--output',
    '--checkpoint',
    '--save-checkpoint',
    '--max-events',
    '--max-batches',
    '--max-ms',
    '--id',
  ])
  for (let i = 1; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--findings') {
      args.findings = true
      continue
    }
    if (!flags.has(flag) || !argv[i + 1] || argv[i + 1].startsWith('--'))
      throw Error(`Unknown or missing argument: ${flag}`)
    if (args[flag]) throw Error(`Duplicate argument: ${flag}`)
    args[flag] = argv[++i]
  }
  if (!args['--input'] || !args['--output']) throw Error(usage)
  const inputPath = resolve(args['--input']),
    outputPath = pathOutsideWorktree(args['--output'])
  const checkpointPath = args['--checkpoint'] ? resolve(args['--checkpoint']) : null
  const savePath = args['--save-checkpoint'] ? pathOutsideWorktree(args['--save-checkpoint']) : null
  if (
    inputPath === outputPath ||
    inputPath === savePath ||
    checkpointPath === outputPath ||
    outputPath === savePath ||
    (checkpointPath && checkpointPath === savePath)
  )
    throw Error('Use distinct input, report, and checkpoint paths')
  if (
    command !== 'career' &&
    (args.findings || checkpointPath || savePath || args['--max-batches'])
  )
    throw Error('Findings/checkpoint options apply only to the career workflow adapter')
  const maxEvents = Number(args['--max-events'] ?? 25),
    maxMs = Number(args['--max-ms'] ?? 30000)
  if (
    !Number.isInteger(maxEvents) ||
    maxEvents < 1 ||
    maxEvents > 100 ||
    !Number.isFinite(maxMs) ||
    maxMs <= 0 ||
    maxMs > 30000
  )
    throw Error('Invalid bounded replay budget')
  const raw = await readFile(inputPath, 'utf8')
  if (raw.length > 10 * 1024 * 1024) throw Error('Archive byte budget exceeded')
  const source = JSON.parse(raw.replace(/^\uFEFF/, ''))
  let result,
    code = 0
  if (command === 'import') {
    if (Array.isArray(source.fixtures)) {
      result = importReferenceFixtures(source, { id: args['--id'] ?? 'reference-archive' })
      code = result.quarantined.length ? 2 : 0
    } else {
      if (!Array.isArray(source.cases) || source.cases.length > 5000)
        throw Error('Import cases required within archive budget')
      result = source.cases.map((c) =>
        c.threads ? importGmailThreads(c.threads, c.options) : compileHistory(c)
      )
    }
  } else if (command === 'branch') {
    result = branchHistory(source.case, source.sourceId, source.replacements)
  } else if (command === 'career') {
    const input = args.findings
      ? findingsToCareerHistory(Array.isArray(source) ? source : source.findings, {
          id: args['--id'] ?? 'gmail-business-history',
        })
      : source
    const maxBatches = Number(args['--max-batches'] ?? 1)
    if (!Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > 10)
      throw Error('Batch count budget exceeded (1-10)')
    let checkpoint = checkpointPath ? JSON.parse(await readFile(checkpointPath, 'utf8')) : null
    const runs = [],
      started = performance.now(),
      commit = revision()
    for (let batch = 0; batch < maxBatches; batch++) {
      const remaining = maxMs - (performance.now() - started)
      if (remaining <= 0) throw Error('Career replay time budget exceeded')
      result = await runCareerReplay(input, {
        maxEvents,
        checkpoint,
        commit,
        budget: { maxMs: remaining },
      })
      if (result.run) runs.push(result.run)
      checkpoint = result.checkpoint
      if (result.status !== 'checkpointed') break
    }
    result = { ...result, run: undefined, runs }
    code = result.status === 'blocked' || result.gaps.length ? 2 : result.remainingEvents ? 3 : 0
    await save(outputPath, result)
    if (savePath) await save(savePath, checkpoint)
    console.log(
      JSON.stringify({
        command,
        status: result.status,
        mode: input.mode,
        batches: runs.length,
        observedSources: checkpoint.state.observedSources,
        remainingEvents: result.remainingEvents,
        workflowGaps: result.gaps.length,
        quarantined: result.quarantined.length,
        proof: result.proof,
      })
    )
    return code
  } else {
    const cases = Array.isArray(source)
      ? source
      : Array.isArray(source.cases)
        ? source.cases
        : [source]
    if (cases.reduce((count, c) => count + (c.events?.length ?? 0), 0) > 5000)
      throw Error('Archive source budget exceeded')
    result = {
      generatedAt: new Date().toISOString(),
      commit: revision(),
      cases: [],
      sourceCoverage: source.coverage ?? null,
      quarantined: source.quarantined ?? [],
    }
    const started = performance.now()
    for (const c of cases) {
      const remaining = maxMs - (performance.now() - started)
      if (remaining <= 0) throw Error('History replay time budget exceeded')
      const record = await replayHistoryThroughForge(c, {
        commit: result.commit,
        maxBatchEvents: maxEvents,
        maxMs: remaining,
      })
      result.cases.push(record)
      if (record.violations.length) {
        code = 2
        break
      }
    }
    if (result.quarantined.length) code = 2
  }
  await save(outputPath, result)
  console.log(
    JSON.stringify({
      command,
      cases: Array.isArray(result) ? result.length : (result.cases?.length ?? 1),
      recordsReplayed: result.cases?.reduce((count, c) => count + (c.recordsReplayed ?? 0), 0) ?? 0,
      quarantined: result.quarantined?.length ?? 0,
      scope: 'offline_record_replay',
      productBehaviorVerified: false,
      modelTrainingPerformed: false,
    })
  )
  return code
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
    .then((code) => {
      process.exitCode = code
    })
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
