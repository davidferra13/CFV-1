import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)

const mode = args[0] && !args[0].startsWith('-') ? args[0] : 'quick'
const scope = args[1] && !args[1].startsWith('-') ? args[1] : 'all'
const profile = args[2] && !args[2].startsWith('-') ? args[2] : 'responsive'
const skipAuthBootstrap = args.includes('--skip-auth-bootstrap')

const passthroughArgs = args.filter((arg, index) => {
  if (index === 0 && !arg.startsWith('-')) return false
  if (index === 1 && !arg.startsWith('-')) return false
  if (index === 2 && !arg.startsWith('-')) return false
  if (arg === '--skip-auth-bootstrap') return false
  return true
})

const env = {
  ...process.env,
  MOBILE_AUDIT_MODE: mode,
  MOBILE_AUDIT_SCOPE: scope,
  MOBILE_AUDIT_DEVICE_PROFILE: profile,
}

if (skipAuthBootstrap) {
  env.PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP = 'true'
}

const normalizedProfile = profile.trim().toLowerCase()
const project =
  normalizedProfile === 'ios' ||
  normalizedProfile === 'iphone' ||
  normalizedProfile === 'safari' ||
  normalizedProfile === 'iphone-safari'
    ? 'mobile-audit-webkit'
    : 'mobile-audit'

const command = `npx playwright test --project=${project} ${passthroughArgs.join(' ')}`.trim()
const child = spawnSync(command, {
  stdio: 'inherit',
  env,
  shell: true,
})

if (child.error) {
  console.error('[run-mobile-audit] Failed to launch Playwright:', child.error.message)
  process.exit(1)
}

if (typeof child.status === 'number') {
  process.exit(child.status)
}

process.exit(1)
