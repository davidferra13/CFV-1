import { spawnSync } from 'node:child_process'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const publicOnly = args.has('--public-only')

const steps = [
  {
    name: 'public iPhone WebKit smoke',
    command: 'node',
    args: [
      'scripts/run-mobile-audit.mjs',
      'quick',
      'public',
      'iphone-safari',
      '--skip-auth-bootstrap',
    ],
  },
  {
    name: 'authenticated Android Chrome smoke',
    command: 'node',
    args: ['scripts/run-mobile-audit.mjs', 'quick', 'all', 'android-chrome'],
  },
  {
    name: 'authenticated iPhone WebKit smoke',
    command: 'node',
    args: ['scripts/run-mobile-audit.mjs', 'quick', 'all', 'iphone-safari'],
  },
]

const selectedSteps = publicOnly ? steps.slice(0, 1) : steps

console.log('[mobile-release-smoke] Steps:')
for (const step of selectedSteps) {
  console.log(`- ${step.name}: ${step.command} ${step.args.join(' ')}`)
}

if (dryRun) {
  console.log('[mobile-release-smoke] Dry run complete.')
  process.exit(0)
}

for (const step of selectedSteps) {
  console.log(`[mobile-release-smoke] Running ${step.name}`)
  const child = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  })

  if (child.error) {
    console.error(`[mobile-release-smoke] Failed to launch ${step.name}: ${child.error.message}`)
    process.exit(1)
  }

  if (child.status !== 0) {
    console.error(`[mobile-release-smoke] Failed ${step.name} with exit code ${child.status}`)
    process.exit(typeof child.status === 'number' ? child.status : 1)
  }
}

console.log('[mobile-release-smoke] Mobile smoke checks passed.')
