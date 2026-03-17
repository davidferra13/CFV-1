#!/usr/bin/env node

import { access, readFile, rm, stat } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function resolveProjectPath(args) {
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if ((value === '-p' || value === '--project') && args[index + 1]) {
      return args[index + 1]
    }
  }

  return 'tsconfig.json'
}

async function removeIfPresent(filePath) {
  try {
    await access(filePath, fsConstants.F_OK)
    await rm(filePath, { force: true })
  } catch {
    // Best effort cleanup for stale TypeScript state.
  }
}

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

async function shouldResetBuildInfo(buildInfoPath, projectDir, configPaths) {
  if (!(await exists(buildInfoPath))) {
    return false
  }

  try {
    const buildInfoStat = await stat(buildInfoPath)
    for (const configPath of configPaths) {
      if (!(await exists(configPath))) {
        continue
      }

      const configStat = await stat(configPath)
      if (configStat.mtimeMs > buildInfoStat.mtimeMs) {
        return true
      }
    }

    const contents = await readFile(buildInfoPath, 'utf8')
    if (contents.includes('./.next-dev-pw-')) {
      return true
    }

    const markers = [
      { marker: './.next/types/', dir: path.join(projectDir, '.next', 'types') },
      { marker: './.next-dev/types/', dir: path.join(projectDir, '.next-dev', 'types') },
    ]

    for (const { marker, dir } of markers) {
      if (contents.includes(marker) && !(await exists(dir))) {
        return true
      }
    }

    return false
  } catch {
    return true
  }
}

function stopChildTree(child, signal = 'SIGTERM') {
  if (child.exitCode !== null || child.killed) {
    return
  }

  if (process.platform === 'win32') {
    try {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      })
      return
    } catch {
      // Fall through to direct child kill if taskkill is unavailable.
    }
  }

  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal)
      return
    } catch {
      // Fall back to direct child kill when process-group termination is unavailable.
    }
  }

  try {
    child.kill(signal)
  } catch {
    // Best effort shutdown for child compiler process.
  }
}

async function main() {
  const forwardedArgs = process.argv.slice(2)
  const hasIncrementalFlag = forwardedArgs.includes('--incremental')
  const hasNoEmitFlag = forwardedArgs.includes('--noEmit')
  const hasSkipLibCheckFlag = forwardedArgs.includes('--skipLibCheck')
  const hasPrettyFlag = forwardedArgs.includes('--pretty')

  const projectPath = resolveProjectPath(forwardedArgs)
  const absoluteProjectPath = path.resolve(projectPath)
  const projectDir = path.dirname(absoluteProjectPath)
  const projectBaseName = path.basename(projectPath, path.extname(projectPath))
  const configPaths = [absoluteProjectPath]
  const rootTsconfigPath = path.resolve(projectDir, 'tsconfig.json')

  if (rootTsconfigPath !== absoluteProjectPath) {
    configPaths.push(rootTsconfigPath)
  }

  const buildInfoPaths = [
    path.join(projectDir, 'tsconfig.tsbuildinfo'),
    path.join(projectDir, `${projectBaseName}.tsbuildinfo`),
  ]

  await Promise.all(
    buildInfoPaths.map(async (buildInfoPath) => {
      if (await shouldResetBuildInfo(buildInfoPath, projectDir, configPaths)) {
        await removeIfPresent(buildInfoPath)
      }
    })
  )

  const args = []
  if (!hasNoEmitFlag) args.push('--noEmit')
  if (!hasSkipLibCheckFlag) args.push('--skipLibCheck')
  if (!hasPrettyFlag) args.push('--pretty', 'false')
  args.push(...forwardedArgs)
  if (!hasIncrementalFlag) args.push('--incremental')

  const tscCliPath = require.resolve('typescript/bin/tsc')
  const maxOldSpaceSizeMb = String(process.env.TSC_MAX_OLD_SPACE_SIZE || '8192').trim()

  const child = spawn(process.execPath, [`--max-old-space-size=${maxOldSpaceSizeMb}`, tscCliPath, ...args], {
    stdio: 'inherit',
    shell: false,
    detached: process.platform !== 'win32',
    env: process.env,
  })

  const stopChild = (signal = 'SIGTERM') => {
    stopChildTree(child, signal)
  }

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
    process.on(signal, () => {
      stopChild(signal === 'SIGBREAK' ? 'SIGTERM' : signal)
      setTimeout(() => stopChild('SIGKILL'), 5_000).unref()
    })
  }

  process.on('exit', () => {
    stopChild('SIGTERM')
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(1)
      return
    }
    process.exit(code ?? 1)
  })

  child.on('error', (error) => {
    console.error('[run-typecheck] Failed to start TypeScript:', error)
    process.exit(1)
  })
}

await main()
