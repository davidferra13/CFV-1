#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { access, cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { resolveBuildSurfaceManifest } from './build-surface-manifest.mjs'

const require = createRequire(import.meta.url)

function withHeapOption(existingOptions, heapMb) {
  if (existingOptions.includes('--max-old-space-size=')) {
    return existingOptions
  }

  const heapFlag = `--max-old-space-size=${heapMb}`
  return [existingOptions, heapFlag].filter(Boolean).join(' ').trim()
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
    // Best effort shutdown for child build process.
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

function resolveManifestSourcePath(rootDir, appBackupDir, relativePath) {
  if (relativePath === 'app') {
    return appBackupDir
  }

  if (relativePath.startsWith('app/')) {
    return join(appBackupDir, relativePath.slice('app/'.length))
  }

  return join(rootDir, relativePath)
}

async function stageBuildSurface(rootDir, surfaceName) {
  const manifest = resolveBuildSurfaceManifest(surfaceName)
  if (!manifest) {
    return null
  }

  const appDir = join(rootDir, 'app')
  const backupDir = join(rootDir, `.app-build-backup-${surfaceName}-${process.pid}-${Date.now()}`)

  if (!(await pathExists(appDir))) {
    throw new Error(`[run-next-build] Cannot stage build surface "${surfaceName}" because /app is missing.`)
  }

  console.log(
    `[run-next-build] Staging build surface "${surfaceName}": ${manifest.description}`
  )

  await rename(appDir, backupDir)

  const restore = async () => {
    await rm(appDir, { recursive: true, force: true })
    await rename(backupDir, appDir)
  }

  try {
    await mkdir(appDir, { recursive: true })

    for (const relativePath of manifest.include) {
      const sourcePath = resolveManifestSourcePath(rootDir, backupDir, relativePath)
      const destinationPath = join(rootDir, relativePath)
      await mkdir(dirname(destinationPath), { recursive: true })
      await cp(sourcePath, destinationPath, { recursive: true, force: true })
    }

    if (manifest.overlayAppDir) {
      const overlayAppDir = join(rootDir, manifest.overlayAppDir)
      if (!(await pathExists(overlayAppDir))) {
        throw new Error(
          `[run-next-build] Build surface "${surfaceName}" is missing overlay directory ${manifest.overlayAppDir}.`
        )
      }

      await cp(overlayAppDir, appDir, { recursive: true, force: true })
    }

    return restore
  } catch (error) {
    await restore()
    throw error
  }
}

async function main() {
  const forwardedArgs = process.argv.slice(2)
  const nextCliPath = require.resolve('next/dist/bin/next')
  const maxOldSpaceSizeMb = String(process.env.NEXT_BUILD_MAX_OLD_SPACE_SIZE || '12288').trim()
  const nodeOptions = withHeapOption(
    String(process.env.NODE_OPTIONS || '').trim(),
    maxOldSpaceSizeMb
  )
  const tempTsconfigPath = resolve('.next-build.tsconfig.json')
  const buildSurface = String(process.env.NEXT_BUILD_SURFACE || '').trim()
  const restoreBuildSurface = await stageBuildSurface(process.cwd(), buildSurface)
  let exitCode = 1

  try {
    const child = spawn(process.execPath, [nextCliPath, 'build', ...forwardedArgs], {
      stdio: 'inherit',
      shell: false,
      detached: process.platform !== 'win32',
      env: {
        ...process.env,
        NODE_OPTIONS: nodeOptions,
        NEXT_TSCONFIG_PATH: tempTsconfigPath,
      },
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

    exitCode = await new Promise((resolve, reject) => {
      child.on('exit', (code, signal) => {
        if (signal) {
          reject(new Error(`next build terminated by signal ${signal}`))
          return
        }

        resolve(code ?? 1)
      })

      child.on('error', (error) => {
        reject(error)
      })
    })

  } finally {
    if (restoreBuildSurface) {
      await restoreBuildSurface()
    }
  }

  process.exitCode = exitCode
}

await main().catch((error) => {
  console.error('[run-next-build] Failed to run Next build:', error)
  process.exit(1)
})
