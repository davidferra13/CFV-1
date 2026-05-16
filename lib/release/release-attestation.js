import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const RELEASE_ATTESTATION_CONTRACT_VERSION = 'release-attestation.v1'

function tryGit(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

export function getCurrentGitSnapshot({ cwd = process.cwd() } = {}) {
  return {
    branch: tryGit(['branch', '--show-current'], cwd),
    commit: tryGit(['rev-parse', 'HEAD'], cwd),
    dirty: (tryGit(['status', '--short'], cwd) ?? '').length > 0,
  }
}

export async function writeReleaseAttestation(report, { env = process.env } = {}) {
  const primaryPath =
    env.CF_RELEASE_ATTESTATION_PATH ||
    path.join(
      process.cwd(),
      '.agents',
      'release-attestations',
      `${report.profile}-${report.runId}.json`
    )
  const latestPath =
    env.CF_RELEASE_ATTESTATION_LATEST_PATH ||
    path.join(path.dirname(primaryPath), `${report.profile}-latest.json`)
  const payload = `${JSON.stringify(report, null, 2)}\n`

  await mkdir(path.dirname(primaryPath), { recursive: true })
  await mkdir(path.dirname(latestPath), { recursive: true })
  await Promise.all([
    writeFile(primaryPath, payload, 'utf8'),
    writeFile(latestPath, payload, 'utf8'),
  ])

  return { latestPath, primaryPath }
}

export default {
  RELEASE_ATTESTATION_CONTRACT_VERSION,
  getCurrentGitSnapshot,
  writeReleaseAttestation,
}
