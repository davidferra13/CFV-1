import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  ALLOWED_RECOVERY_SCRIPTS,
  createRecoveryEnvironment,
  isAllowedRecoveryScript,
} from '../lib/recovery/runtime-safety.mjs'

const [, , scriptName, ...forwardedArgs] = process.argv

if (!scriptName) {
  console.error('Usage: npm run recovery:run -- <allowed-script> [arguments]')
  process.exit(2)
}

if (!isAllowedRecoveryScript(scriptName)) {
  console.error(`Recovery script is not allowed: ${scriptName}`)
  console.error(`Allowed scripts: ${ALLOWED_RECOVERY_SCRIPTS.join(', ')}`)
  process.exit(2)
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const preflightPath = path.join(scriptDirectory, 'cheflo-recovery-preflight.mjs')
const preflight = spawnSync(process.execPath, [preflightPath], {
  stdio: 'inherit',
  env: process.env,
})

if (preflight.status !== 0) {
  console.error('Recovery command was not started because preflight did not pass.')
  process.exit(preflight.status ?? 1)
}

const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const result = spawnSync(npmExecutable, ['run', scriptName, ...forwardedArgs], {
  stdio: 'inherit',
  env: createRecoveryEnvironment(process.env),
  shell: false,
})

process.exit(result.status ?? 1)
