import { spawnSync } from 'node:child_process'

const rawArgs = process.argv.slice(2)
const args = new Set(rawArgs)
const dryRun = args.has('--dry-run')
const publicOnly = args.has('--public-only')
const runCloud = args.has('--run')

const baseUrlArg = rawArgs.find((arg) => arg.startsWith('--base-url='))
const baseUrl =
  baseUrlArg?.slice('--base-url='.length) ||
  process.env.PLAYWRIGHT_BASE_URL ||
  'http://localhost:3100'
const scope = publicOnly ? 'public' : 'all'
const buildName =
  process.env.BROWSERSTACK_BUILD_NAME || `ChefFlow Mobile Smoke ${new Date().toISOString()}`

const command = [
  'npx',
  'browserstack-node-sdk',
  'npx',
  'playwright',
  'test',
  '--project=mobile-audit-webkit',
  'tests/mobile/mobile-visual-audit.spec.ts',
]

const env = {
  ...process.env,
  PLAYWRIGHT_BASE_URL: baseUrl,
  MOBILE_AUDIT_MODE: 'quick',
  MOBILE_AUDIT_SCOPE: scope,
  MOBILE_AUDIT_DEVICE_PROFILE: 'iphone-safari',
  BROWSERSTACK_BUILD_NAME: buildName,
}

if (publicOnly) {
  env.PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP = 'true'
}

console.log('[browserstack-ios-smoke] Real iPhone Safari smoke')
console.log(`- baseURL: ${baseUrl}`)
console.log(`- scope: ${scope}`)
console.log(`- buildName: ${buildName}`)
console.log(`- command: ${command.join(' ')}`)

if (dryRun || !runCloud) {
  if (!runCloud) {
    console.log('[browserstack-ios-smoke] Add --run to start a BrowserStack cloud session.')
  }
  console.log('[browserstack-ios-smoke] Dry run complete.')
  process.exit(0)
}

const missingCredentials = ['BROWSERSTACK_USERNAME', 'BROWSERSTACK_ACCESS_KEY'].filter(
  (name) => !env[name]
)

if (missingCredentials.length > 0) {
  console.error(
    `[browserstack-ios-smoke] Missing required environment variables: ${missingCredentials.join(', ')}`
  )
  process.exit(1)
}

const child = spawnSync(command[0], command.slice(1), {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
})

if (child.error) {
  console.error(
    `[browserstack-ios-smoke] Failed to launch BrowserStack run: ${child.error.message}`
  )
  process.exit(1)
}

process.exit(typeof child.status === 'number' ? child.status : 1)
