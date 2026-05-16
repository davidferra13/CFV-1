import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

function resolvePort(baseUrl) {
  try {
    const url = new URL(baseUrl)
    if (url.port) return url.port
    return url.protocol === 'https:' ? '443' : '80'
  } catch {
    return '3100'
  }
}

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const port = resolvePort(baseUrl)
const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
const allowIsolatedRuntime =
  process.env.PLAYWRIGHT_ALLOW_ISOLATED_RUNTIME === '1' ||
  process.env.PLAYWRIGHT_ALLOW_ISOLATED_RUNTIME === 'true'

if (port !== '3100' && !allowIsolatedRuntime) {
  console.error(
    `Refusing to start noncanonical ChefFlow Playwright dev server on port ${port}. ` +
      'Use localhost:3100 or set PLAYWRIGHT_ALLOW_ISOLATED_RUNTIME=1 with a cleanup plan.'
  )
  process.exit(1)
}

const child = spawn(process.execPath, [nextBin, 'dev', '-p', port, '-H', '0.0.0.0'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || `.next-dev-playwright-${port}`,
    DISABLE_BACKGROUND_JOBS_FOR_E2E: 'true',
  },
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal)
  })
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
