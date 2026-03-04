import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'

function npmCommand() {
  return process.platform === 'win32' ? 'npm' : 'npm'
}

function runStep(step) {
  return new Promise((resolve, reject) => {
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
}

async function main() {
  console.log('[verify:release] Cleaning previous build artifacts...')
  await rm('.next', { recursive: true, force: true })

  const steps = [
    {
      name: 'build',
      args: ['run', 'build'],
      env: { NODE_OPTIONS: '--max-old-space-size=8192' },
    },
    {
      name: 'test:all',
      args: ['run', 'test:all'],
    },
    {
      name: 'lint',
      args: ['run', 'lint'],
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
