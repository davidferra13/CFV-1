import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function runTsRunner(name) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', join(__dirname, `${name}-runner.ts`), ...process.argv.slice(2)],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    },
  )

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}
