import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const KNOWN_REPAIRS = {
  '20260305': {
    action: 'reverted',
    reason:
      'Remote history contains a legacy short version. Local files now use the valid replacement 20260305000010.',
  },
  '20260313000011': {
    action: 'applied',
    reason:
      'This migration overlaps the later purchase order schema and should be recorded as already satisfied instead of executed blindly.',
  },
}

function compareVersions(a, b) {
  const left = BigInt(a)
  const right = BigInt(b)
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortVersions(versions) {
  return [...versions].sort(compareVersions)
}

export function inspectLocalMigrationDirectory(migrationsDir) {
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
  const versions = new Set()
  const invalidFiles = []
  const duplicates = []
  const seen = new Map()

  for (const file of files) {
    const match = /^(\d{14})_/.exec(file)
    if (!match) {
      invalidFiles.push(file)
      continue
    }

    const version = match[1]
    const prior = seen.get(version)
    if (prior) {
      duplicates.push({ version, first: prior, second: file })
      continue
    }

    seen.set(version, file)
    versions.add(version)
  }

  return {
    files,
    versions: sortVersions(versions),
    invalidFiles: invalidFiles.sort(),
    duplicates,
  }
}

export function parseSupabaseMigrationListOutput(text) {
  const localVersions = new Set()
  const remoteVersions = new Set()

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    const match = /^\s*([0-9]+)?\s*\|\s*([0-9]+)?\s*\|/.exec(line)
    if (!match) continue
    if (match[1]) localVersions.add(match[1])
    if (match[2]) remoteVersions.add(match[2])
  }

  return {
    localVersions: sortVersions(localVersions),
    remoteVersions: sortVersions(remoteVersions),
  }
}

export function buildMigrationRepairPlan({ localVersions, remoteVersions }) {
  const localSet = new Set(localVersions)
  const remoteSet = new Set(remoteVersions)
  const remoteOnly = sortVersions(
    remoteVersions.filter((version) => !localSet.has(version))
  )
  const localOnly = sortVersions(
    localVersions.filter((version) => !remoteSet.has(version))
  )

  const remoteHead =
    remoteVersions.length > 0 ? remoteVersions[remoteVersions.length - 1] : null
  const historicalLocalOnly = remoteHead
    ? localOnly.filter((version) => compareVersions(version, remoteHead) < 0)
    : []
  const tailLocalOnly = remoteHead
    ? localOnly.filter((version) => compareVersions(version, remoteHead) > 0)
    : localOnly

  const repairCommands = []
  const warnings = []

  for (const version of remoteOnly) {
    const repair = KNOWN_REPAIRS[version]
    if (repair) {
      repairCommands.push({
        version,
        action: repair.action,
        command: `npx supabase migration repair --linked --status ${repair.action} ${version}`,
        reason: repair.reason,
      })
    } else {
      warnings.push(
        `Remote history contains ${version}, which has no matching local migration file.`
      )
    }
  }

  for (const version of historicalLocalOnly) {
    const repair = KNOWN_REPAIRS[version]
    if (repair?.action === 'applied') {
      repairCommands.push({
        version,
        action: repair.action,
        command: `npx supabase migration repair --linked --status ${repair.action} ${version}`,
        reason: repair.reason,
      })
    }
  }

  const repairedVersions = new Set(repairCommands.map((item) => item.version))
  const pushableLocalOnly = localOnly.filter((version) => !repairedVersions.has(version))

  return {
    localOnly,
    remoteOnly,
    historicalLocalOnly,
    tailLocalOnly,
    repairCommands,
    pushableLocalOnly,
    warnings,
  }
}

function commandRunner() {
  return process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
}

function commandArgs(command) {
  return process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-lc', command]
}

function readCommandOutput(command) {
  return execFileSync(commandRunner(), commandArgs(command), {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  })
}

function readMigrationListFromCli() {
  return readCommandOutput('npx supabase migration list --linked')
}

function parseArgs(argv) {
  const args = { fromFile: null, json: false }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--from-file') {
      args.fromFile = argv[index + 1] ?? null
      index += 1
      continue
    }
    if (arg === '--json') {
      args.json = true
      continue
    }
    if (!arg.startsWith('-') && !args.fromFile) {
      args.fromFile = arg
    }
  }

  return args
}

function printHumanReport(report) {
  console.log(`Local migrations: ${report.localCount}`)
  console.log(`Remote migrations: ${report.remoteCount}`)
  console.log(`Local only: ${report.plan.localOnly.length}`)
  console.log(`Remote only: ${report.plan.remoteOnly.length}`)
  console.log('')

  if (report.invalidFiles.length > 0) {
    console.log('Invalid local filenames:')
    for (const file of report.invalidFiles) {
      console.log(`- ${file}`)
    }
    console.log('')
  }

  if (report.duplicates.length > 0) {
    console.log('Duplicate local versions:')
    for (const duplicate of report.duplicates) {
      console.log(
        `- ${duplicate.version}: ${duplicate.first} and ${duplicate.second}`
      )
    }
    console.log('')
  }

  if (report.plan.remoteOnly.length > 0) {
    console.log('Remote only versions:')
    for (const version of report.plan.remoteOnly) {
      console.log(`- ${version}`)
    }
    console.log('')
  }

  if (report.plan.historicalLocalOnly.length > 0) {
    console.log('Historical local only versions:')
    for (const version of report.plan.historicalLocalOnly) {
      console.log(`- ${version}`)
    }
    console.log('')
  }

  if (report.plan.tailLocalOnly.length > 0) {
    console.log('Tail local only versions:')
    for (const version of report.plan.tailLocalOnly) {
      console.log(`- ${version}`)
    }
    console.log('')
  }

  if (report.plan.repairCommands.length > 0) {
    console.log('Repair commands:')
    for (const repair of report.plan.repairCommands) {
      console.log(`- ${repair.command}`)
      console.log(`  ${repair.reason}`)
    }
    console.log('')
  }

  if (report.plan.pushableLocalOnly.length > 0) {
    console.log('Push command after repairs:')
    console.log('- npx supabase db push --linked --include-all')
    console.log('')
  }

  if (report.plan.warnings.length > 0) {
    console.log('Warnings:')
    for (const warning of report.plan.warnings) {
      console.log(`- ${warning}`)
    }
  }
}

export function createMigrationRepairReport({
  migrationsDir,
  migrationListOutput,
}) {
  const local = inspectLocalMigrationDirectory(migrationsDir)
  const remote = parseSupabaseMigrationListOutput(migrationListOutput)
  const plan = buildMigrationRepairPlan({
    localVersions: local.versions,
    remoteVersions: remote.remoteVersions,
  })

  return {
    localCount: local.versions.length,
    remoteCount: remote.remoteVersions.length,
    invalidFiles: local.invalidFiles,
    duplicates: local.duplicates,
    localVersions: local.versions,
    remoteVersions: remote.remoteVersions,
    plan,
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const scriptPath = fileURLToPath(import.meta.url)
  const projectRoot = join(dirname(scriptPath), '..')
  const migrationsDir = join(projectRoot, 'supabase', 'migrations')
  const migrationListOutput = args.fromFile
    ? readFileSync(args.fromFile, 'utf8')
    : readMigrationListFromCli()
  const report = createMigrationRepairReport({
    migrationsDir,
    migrationListOutput,
  })

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHumanReport(report)
  }

  if (report.invalidFiles.length > 0 || report.duplicates.length > 0) {
    process.exitCode = 1
    return
  }

  if (report.plan.remoteOnly.length > report.plan.repairCommands.length) {
    process.exitCode = 1
    return
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
const scriptPath = resolve(fileURLToPath(import.meta.url))
if (invokedPath && invokedPath === scriptPath) {
  main()
}
