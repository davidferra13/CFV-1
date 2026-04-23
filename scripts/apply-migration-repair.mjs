import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createMigrationRepairReport } from './plan-migration-repair.mjs'

const DEFAULT_TEST_COMMAND = [
  'node',
  '--test',
  '--import',
  'tsx',
  'tests/unit/db-migration-plan.test.ts',
  'tests/unit/db-migration-versions.test.ts',
  'tests/unit/runtime-log-regressions.test.ts',
]

function parseArgs(argv) {
  const args = {
    fromFile: null,
    skipBackup: false,
    skipPush: false,
    skipTypes: false,
    skipTests: false,
    printOnly: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--from-file') {
      args.fromFile = argv[index + 1] ?? null
      index += 1
      continue
    }
    if (!arg.startsWith('-') && !args.fromFile) {
      args.fromFile = arg
      continue
    }
    if (arg === '--skip-backup') {
      args.skipBackup = true
      continue
    }
    if (arg === '--skip-push') {
      args.skipPush = true
      continue
    }
    if (arg === '--skip-types') {
      args.skipTypes = true
      continue
    }
    if (arg === '--skip-tests') {
      args.skipTests = true
      continue
    }
    if (arg === '--print-only') {
      args.printOnly = true
    }
  }

  return args
}

function commandRunner() {
  return process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'
}

function commandArgs(command) {
  return process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-lc', command]
}

function bashCommand() {
  if (process.platform !== 'win32') {
    return 'bash'
  }

  const windowsBashCandidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  ]

  for (const candidate of windowsBashCandidates) {
    if (existsSync(candidate)) {
      return `"${candidate}"`
    }
  }

  return 'bash.exe'
}

function readCommandOutput(command) {
  return execFileSync(commandRunner(), commandArgs(command), {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  })
}

function readMigrationList(fromFile) {
  if (fromFile) {
    return readFileSync(resolve(fromFile), 'utf8')
  }

  return readCommandOutput('npx database migration list --linked')
}

export function buildApplyExecutionPlan(report, options = {}) {
  const plan = []
  const errors = []
  const planData = {
    remoteOnly: [],
    repairCommands: [],
    pushableLocalOnly: [],
    warnings: [],
    ...(report.plan ?? {}),
  }

  if (report.invalidFiles.length > 0) {
    errors.push(`Invalid migration filenames: ${report.invalidFiles.join(', ')}`)
  }

  if (report.duplicates.length > 0) {
    errors.push(
      `Duplicate migration versions: ${report.duplicates
        .map((item) => `${item.version} (${item.first}, ${item.second})`)
        .join('; ')}`
    )
  }

  if (planData.warnings.length > 0) {
    errors.push(...planData.warnings)
  }

  if (planData.remoteOnly.length > planData.repairCommands.length) {
    errors.push(
      `Unresolved remote-only versions remain: ${planData.remoteOnly.join(', ')}`
    )
  }

  if (errors.length > 0) {
    return { ok: false, errors, steps: [] }
  }

  if (!options.skipBackup) {
    plan.push({
      label: 'backup',
      command: `${bashCommand()} scripts/backup-db.sh --quiet`,
    })
  }

  for (const repair of planData.repairCommands) {
    plan.push({
      label: `repair:${repair.version}`,
      command: repair.command,
    })
  }

  if (!options.skipPush && planData.pushableLocalOnly.length > 0) {
    plan.push({
      label: 'push',
      command: 'npx database push --linked --include-all',
    })
  }

  if (!options.skipTypes) {
    plan.push({
      label: 'types',
      command: 'npm run typecheck',
    })
  }

  if (!options.skipTests) {
    plan.push({
      label: 'tests',
      command: DEFAULT_TEST_COMMAND.join(' '),
    })
  }

  return { ok: true, errors: [], steps: plan }
}

function printPlan(executionPlan) {
  console.log('Execution plan:')
  for (const step of executionPlan.steps) {
    console.log(`- [${step.label}] ${step.command}`)
  }
}

function runCommand(command, projectRoot) {
  execFileSync(commandRunner(), commandArgs(command), {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  })
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const scriptPath = fileURLToPath(import.meta.url)
  const projectRoot = join(dirname(scriptPath), '..')
  const migrationListOutput = readMigrationList(args.fromFile)
  const report = createMigrationRepairReport({
    migrationsDir: join(projectRoot, 'database', 'migrations'),
    migrationListOutput,
  })
  const executionPlan = buildApplyExecutionPlan(report, args)

  if (!executionPlan.ok) {
    for (const error of executionPlan.errors) {
      console.error(error)
    }
    process.exitCode = 1
    return
  }

  printPlan(executionPlan)

  if (args.printOnly) {
    return
  }

  for (const step of executionPlan.steps) {
    runCommand(step.command, projectRoot)
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
const scriptPath = resolve(fileURLToPath(import.meta.url))
if (invokedPath && invokedPath === scriptPath) {
  main()
}
