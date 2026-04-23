import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const RELEASE_ATTESTATION_CONTRACT_VERSION = 'release-gate.v1'
export const DEFAULT_RELEASE_ATTESTATION_DIR = join('builds', 'release-attestations')

export function resolveReleaseProfile(env = process.env) {
  const value = String(env.NEXT_PUBLIC_RELEASE_PROFILE || env.CF_RELEASE_PROFILE || 'full').trim()
  return value || 'full'
}

export function resolveReleaseAttestationPath({ profile = resolveReleaseProfile(), env = process.env } = {}) {
  const override = String(env.CF_RELEASE_ATTESTATION_PATH || '').trim()
  if (override) {
    return override
  }

  return join(DEFAULT_RELEASE_ATTESTATION_DIR, `${profile}.json`)
}

export function resolveLatestReleaseAttestationPath(env = process.env) {
  const override = String(env.CF_RELEASE_ATTESTATION_PATH || '').trim()
  if (override) {
    return override
  }

  return join(DEFAULT_RELEASE_ATTESTATION_DIR, 'latest.json')
}

export function buildDirtyFingerprint(dirtyPaths) {
  const normalized = Array.isArray(dirtyPaths)
    ? dirtyPaths.map((entry) => String(entry).trim()).filter(Boolean)
    : []

  if (normalized.length === 0) {
    return 'clean'
  }

  return createHash('sha256').update(normalized.join('\n')).digest('hex').slice(0, 16)
}

function runGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim()
}

export function getCurrentGitSnapshot({ cwd = process.cwd() } = {}) {
  try {
    const gitHead = runGit(['rev-parse', 'HEAD'], cwd)
    const gitShortHead = runGit(['rev-parse', '--short', 'HEAD'], cwd)
    const rawStatus = runGit(['status', '--short'], cwd)
    const dirtyPaths = rawStatus.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)

    return {
      dirty: dirtyPaths.length > 0,
      dirtyFingerprint: buildDirtyFingerprint(dirtyPaths),
      dirtyPaths,
      gitHead,
      gitShortHead,
      recordedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function readReleaseAttestation({ profile = resolveReleaseProfile(), env = process.env } = {}) {
  const attestationPath = resolveReleaseAttestationPath({ profile, env })

  try {
    const raw = await readFile(attestationPath, 'utf8')
    return {
      attestation: JSON.parse(raw),
      attestationPath,
    }
  } catch {
    return {
      attestation: null,
      attestationPath,
    }
  }
}

export function evaluateReleaseAttestation(attestation, { expectedProfile, currentSnapshot = null } = {}) {
  const advisoryCount = Number(attestation?.summary?.advisoryCount ?? attestation?.advisories?.length ?? 0)
  const blockerCount = Number(attestation?.summary?.blockerCount ?? attestation?.blockers?.length ?? 0)
  const profile = typeof attestation?.profile === 'string' ? attestation.profile : null
  const runId = typeof attestation?.runId === 'string' ? attestation.runId : null
  const verifiedAt =
    typeof attestation?.completedAt === 'string'
      ? attestation.completedAt
      : typeof attestation?.verifiedAt === 'string'
        ? attestation.verifiedAt
        : null

  const base = {
    advisoryCount,
    blockerCount,
    matchesCurrentSnapshot: null,
    profile,
    runId,
    snapshotComparable: currentSnapshot !== null,
    verifiedAt,
  }

  if (!attestation) {
    return {
      ...base,
      message: 'No release attestation is available for the expected profile.',
      reason: 'missing_attestation',
      status: 'missing',
    }
  }

  if (expectedProfile && profile && profile !== expectedProfile) {
    return {
      ...base,
      message: `Latest release attestation targets profile "${profile}" instead of "${expectedProfile}".`,
      reason: 'profile_mismatch',
      status: 'stale',
    }
  }

  if (attestation.status !== 'passed') {
    return {
      ...base,
      message: 'Latest release attestation did not pass the release gate.',
      reason: 'failed_attestation',
      status: 'failed',
    }
  }

  if (!currentSnapshot) {
    return {
      ...base,
      message: 'Release attestation exists, but the current git snapshot could not be compared.',
      reason: 'snapshot_unavailable',
      status: 'unknown',
    }
  }

  const attestedSnapshot = attestation.snapshot && typeof attestation.snapshot === 'object'
    ? attestation.snapshot
    : null
  const attestedHead =
    typeof attestedSnapshot?.gitHead === 'string' ? attestedSnapshot.gitHead : null
  const attestedDirtyFingerprint =
    typeof attestedSnapshot?.dirtyFingerprint === 'string'
      ? attestedSnapshot.dirtyFingerprint
      : null

  if (!attestedHead || !attestedDirtyFingerprint) {
    return {
      ...base,
      message: 'Release attestation is missing git snapshot metadata required for comparison.',
      reason: 'missing_snapshot_metadata',
      status: 'unknown',
    }
  }

  const matchesCurrentSnapshot =
    attestedHead === currentSnapshot.gitHead &&
    attestedDirtyFingerprint === currentSnapshot.dirtyFingerprint

  if (!matchesCurrentSnapshot) {
    return {
      ...base,
      matchesCurrentSnapshot,
      message: 'Latest release attestation does not match the current checkout snapshot.',
      reason: 'snapshot_mismatch',
      status: 'stale',
    }
  }

  return {
    ...base,
    matchesCurrentSnapshot,
    message: 'Latest release attestation matches the current checkout snapshot.',
    reason: null,
    status: 'verified',
  }
}

export async function getReleaseGateHealthSummary({
  cwd = process.cwd(),
  env = process.env,
  profile = resolveReleaseProfile(env),
} = {}) {
  const { attestation, attestationPath } = await readReleaseAttestation({ env, profile })
  const currentSnapshot = getCurrentGitSnapshot({ cwd })
  const summary = evaluateReleaseAttestation(attestation, {
    currentSnapshot,
    expectedProfile: profile,
  })

  return {
    ...summary,
    attestationPath,
    currentSnapshotAvailable: currentSnapshot !== null,
  }
}

export async function writeReleaseAttestation(report, { env = process.env } = {}) {
  const primaryPath = resolveReleaseAttestationPath({
    env,
    profile: report?.profile || resolveReleaseProfile(env),
  })
  const latestPath = resolveLatestReleaseAttestationPath(env)
  const payload = `${JSON.stringify(report, null, 2)}\n`

  await mkdir(dirname(primaryPath), { recursive: true })
  await writeFile(primaryPath, payload, 'utf8')

  if (latestPath !== primaryPath) {
    await mkdir(dirname(latestPath), { recursive: true })
    await writeFile(latestPath, payload, 'utf8')
  }

  return {
    latestPath,
    primaryPath,
  }
}
