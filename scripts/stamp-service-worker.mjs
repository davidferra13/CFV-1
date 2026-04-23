import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BUILD_VERSION_PATTERN = /(const BUILD_VERSION = ')[^']+(')/

export async function stampServiceWorker(rootDir, distDirName = '.next') {
  const buildIdPath = join(rootDir, distDirName, 'BUILD_ID')
  const serviceWorkerPath = join(rootDir, 'public', 'sw.js')

  const buildId = (await readFile(buildIdPath, 'utf8')).trim()
  if (!buildId) {
    throw new Error(`[stamp-service-worker] ${buildIdPath} is empty.`)
  }

  const currentServiceWorker = await readFile(serviceWorkerPath, 'utf8')
  const stampedServiceWorker = currentServiceWorker.replace(
    BUILD_VERSION_PATTERN,
    `$1${buildId}$2`
  )

  if (stampedServiceWorker === currentServiceWorker) {
    if (currentServiceWorker.includes(`const BUILD_VERSION = '${buildId}'`)) {
      return { buildId, changed: false, serviceWorkerPath }
    }

    throw new Error(
      `[stamp-service-worker] Could not find BUILD_VERSION constant in ${serviceWorkerPath}.`
    )
  }

  await writeFile(serviceWorkerPath, stampedServiceWorker, 'utf8')
  return { buildId, changed: true, serviceWorkerPath }
}
