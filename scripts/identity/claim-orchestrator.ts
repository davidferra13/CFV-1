import dotenv from 'dotenv'
import { PLATFORM_JOBS, getDeferredJobs, getRunnableJobs, type PlatformJob } from './platforms'
import { runBrowserJob, resumeBrowserJob } from './browser-runner'
import { loadState, recordFromJob, saveState, writeReport, type ClaimRecord } from './state'
import { readIdentityInputs, storeCredential } from './vault'

dotenv.config({ path: '.env.local' })
dotenv.config()

type Command = 'plan' | 'run' | 'resume' | 'report'

type Args = {
  command: Command
  includeReserve: boolean
  platformId: string | null
  concurrency: number
  rateLimitMs: number
}

function parseArgs(argv: string[]): Args {
  const command = (argv[2] ?? 'plan') as Command
  const platformIndex = argv.indexOf('--platform')
  const concurrencyIndex = argv.indexOf('--concurrency')
  const rateLimitIndex = argv.indexOf('--rate-limit-ms')
  return {
    command,
    includeReserve: !argv.includes('--claim-now-only'),
    platformId: platformIndex >= 0 ? (argv[platformIndex + 1] ?? null) : null,
    concurrency: Math.max(1, Math.min(2, Number(argv[concurrencyIndex + 1] ?? '2'))),
    rateLimitMs: Math.max(
      5000,
      Number(argv[rateLimitIndex + 1] ?? process.env.CHEFFLOW_IDENTITY_RATE_LIMIT_MS ?? '30000')
    ),
  }
}

function missingInputsRecord(job: PlatformJob): ClaimRecord {
  return recordFromJob(job, {
    status: 'awaiting_human_action',
    verificationStatus: 'not_started',
    credentialsStored: false,
    directUrl: job.signupUrl,
    humanAction: {
      platform: job.name,
      selectedUsername: null,
      currentStatus: 'Missing operator inputs',
      exactRequiredAction:
        'Set CHEFFLOW_IDENTITY_EMAIL, CHEFFLOW_IDENTITY_PASSWORD, CHEFFLOW_IDENTITY_PHONE, and CHEFFLOW_IDENTITY_VAULT_KEY',
      directUrl: job.signupUrl ?? 'local CLI',
      resumeInstruction: 'Then run: npx tsx scripts/identity/claim-orchestrator.ts run',
    },
    notes: 'The runner cannot create or reserve identities until the required inputs are set.',
  })
}

function deferredRecord(job: PlatformJob): ClaimRecord {
  return recordFromJob(job, {
    status: 'deferred',
    verificationStatus: job.classification === 'DO_NOT_CREATE' ? 'not_required' : 'not_started',
    credentialsStored: false,
    directUrl: job.signupUrl,
    notes: job.notes,
  })
}

function internalRecord(job: PlatformJob): ClaimRecord {
  const inputs = readIdentityInputs()
  if (!inputs) return missingInputsRecord(job)

  storeCredential({
    platformId: job.id,
    platformName: job.name,
    username: 'ChefFlow',
    email: inputs.email,
    phone: inputs.phone,
    password: inputs.password,
    capturedAt: new Date().toISOString(),
    status: 'internal-credential-captured',
  })

  return recordFromJob(job, {
    finalHandle: 'ChefFlow',
    status: 'partial',
    verificationStatus: 'pending',
    credentialsStored: true,
    directUrl: null,
    humanAction: {
      platform: job.name,
      selectedUsername: 'ChefFlow',
      currentStatus: 'Credential captured, application account not provisioned by this safe runner',
      exactRequiredAction:
        'Provision this internal account through the ChefFlow admin account setup path',
      directUrl: 'local ChefFlow admin',
      resumeInstruction: `Then run: npx tsx scripts/identity/claim-orchestrator.ts resume --platform ${job.id}`,
    },
    notes: `${job.notes} Credentials are captured, but DB account creation is intentionally paused until the exact internal role mapping is confirmed.`,
  })
}

async function runWithLimit<T>(
  jobs: PlatformJob[],
  concurrency: number,
  rateLimitMs: number,
  task: (job: PlatformJob) => Promise<T>
): Promise<T[]> {
  const results: T[] = []
  let cursor = 0
  let nextStartAt = 0

  async function worker(): Promise<void> {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]
      const waitMs = Math.max(0, nextStartAt - Date.now())
      nextStartAt = Math.max(Date.now(), nextStartAt) + rateLimitMs
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs))
      results.push(await task(job))
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker()))
  return results
}

async function run(args: Args): Promise<void> {
  const state = loadState()
  for (const job of getDeferredJobs()) state.records[job.id] = deferredRecord(job)

  const runnable = getRunnableJobs(args.includeReserve).filter(
    (job) => !args.platformId || job.id === args.platformId
  )
  const inputs = readIdentityInputs()

  const records = !inputs
    ? runnable.map((job) => missingInputsRecord(job))
    : await runWithLimit(runnable, args.concurrency, args.rateLimitMs, async (job) => {
        if (job.kind === 'internal') return internalRecord(job)
        return runBrowserJob(job, inputs)
      })

  for (const record of records) state.records[record.platformId] = record
  saveState(state)
  writeReport(state)
  console.log(`Stored report at system/identity-claims/identity-claim-report.md`)
}

async function resume(args: Args): Promise<void> {
  const state = loadState()
  const candidates = PLATFORM_JOBS.filter(
    (job) => !args.platformId || job.id === args.platformId
  ).filter((job) => job.kind !== 'deferred')
  const records = await runWithLimit(
    candidates,
    args.concurrency,
    args.rateLimitMs,
    async (job) => {
      if (job.kind === 'internal') return internalRecord(job)
      return resumeBrowserJob(job)
    }
  )
  for (const record of records) state.records[record.platformId] = record
  saveState(state)
  writeReport(state)
  console.log(`Stored report at system/identity-claims/identity-claim-report.md`)
}

async function plan(): Promise<void> {
  const state = loadState()
  for (const job of PLATFORM_JOBS) {
    if (!state.records[job.id]) {
      state.records[job.id] =
        job.kind === 'deferred'
          ? deferredRecord(job)
          : recordFromJob(job, {
              status: 'partial',
              verificationStatus: 'not_started',
              credentialsStored: false,
              directUrl: job.signupUrl,
              notes: `${job.notes} Planned, not executed.`,
            })
    }
  }
  saveState(state)
  writeReport(state)
  console.log(`Stored plan at system/identity-claims/identity-claim-report.md`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  if (args.command === 'plan') return plan()
  if (args.command === 'run') return run(args)
  if (args.command === 'resume') return resume(args)
  if (args.command === 'report') {
    const state = loadState()
    writeReport(state)
    console.log(`Stored report at system/identity-claims/identity-claim-report.md`)
    return
  }
  throw new Error(`Unknown command: ${args.command}`)
}

main().catch((err) => {
  console.error(`[identity] ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
