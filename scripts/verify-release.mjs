import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'

function npmCommand() {
  return process.platform === 'win32' ? 'npm' : 'npm'
}

function runStep(step) {
  const maxAttempts = (step.retries ?? 0) + 1
  let attempt = 0

  const execute = () =>
    new Promise((resolve, reject) => {
      const command = `${npmCommand()} ${step.args.join(' ')}`
      const child = spawn(command, [], {
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          ...step.env,
        },
      })

      child.on('error', reject)
      child.on('exit', (code) => {
        if (code === 0) {
          resolve()
          return
        }
        reject(new Error(`Step "${step.name}" failed with exit code ${code ?? 'unknown'}.`))
      })
    })

  const run = async () => {
    while (attempt < maxAttempts) {
      attempt += 1
      try {
        await execute()
        return
      } catch (error) {
        if (attempt >= maxAttempts) {
          throw error
        }
        console.warn(
          `[verify:release] Step "${step.name}" failed (attempt ${attempt}/${maxAttempts}); retrying...`,
        )
      }
    }
  }

  return run()
}

async function main() {
  const runId = process.env.CF_VERIFY_RUN_ID || `verify-${process.pid}-${Date.now()}`
  const buildDistDir = process.env.NEXT_BUILD_DIST_DIR || `.next-verify-${runId}`
  const smokeBaseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3110'
  const smokeServerCommand =
    process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npx next start -p 3110'
  const sharedStepEnv = {
    PLAYWRIGHT_RUN_ID: runId,
    PLAYWRIGHT_OUTPUT_DIR: process.env.PLAYWRIGHT_OUTPUT_DIR || `test-results/${runId}`,
    APP_ENV: process.env.APP_ENV || 'development',
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  }

  console.log(`[verify:release] Run ID: ${runId}`)
  console.log(`[verify:release] Build dist dir: ${buildDistDir}`)
  console.log(`[verify:release] Smoke base URL: ${smokeBaseUrl}`)
  console.log('[verify:release] Cleaning previous run artifacts...')
  await rm(buildDistDir, { recursive: true, force: true })

  const steps = [
    {
      name: 'verify:secrets',
      args: ['run', 'verify:secrets'],
      env: sharedStepEnv,
    },
    {
      name: 'typecheck',
      args: ['run', 'typecheck'],
      env: sharedStepEnv,
    },
    {
      name: 'lint:strict',
      args: ['run', 'lint:strict'],
      env: sharedStepEnv,
    },
    {
      name: 'test:critical',
      args: ['run', 'test:critical'],
      env: sharedStepEnv,
    },
    {
      name: 'test:unit',
      args: ['run', 'test:unit'],
      env: sharedStepEnv,
    },
    {
      name: 'build',
      args: ['run', 'build'],
      env: {
        ...sharedStepEnv,
        NEXT_DIST_DIR: buildDistDir,
        NODE_OPTIONS: '--max-old-space-size=8192',
      },
      retries: 1,
    },
    {
      name: 'test:e2e:smoke:release',
      args: ['run', 'test:e2e:smoke:release'],
      env: {
        ...sharedStepEnv,
        NEXT_DIST_DIR: buildDistDir,
        PLAYWRIGHT_BASE_URL: smokeBaseUrl,
        PLAYWRIGHT_WEB_SERVER_COMMAND: smokeServerCommand,
        PLAYWRIGHT_REUSE_SERVER: process.env.PLAYWRIGHT_REUSE_SERVER || 'false',
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || smokeBaseUrl,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || smokeBaseUrl,
      },
      retries: 1,
    },
  ]

  console.log('[verify:release] Starting release verification...')
  for (const step of steps) {
    console.log(`[verify:release] Running ${step.name}...`)
    await runStep(step)
  }
  console.log('[verify:release] Release verification passed.')
}

main().catch((error) => {
  console.error('[verify:release] FAILED:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
