import { join } from 'node:path'
import { claimRecordSchema, type ClaimRecord } from './types'
import { readJsonFiles, resolveBuilderPath, toFileStamp, writeJsonFileOnce } from './store'

export type ClaimState = {
  ok: boolean
  activeClaim: ClaimRecord | null
  staleClaims: ClaimRecord[]
  claims: ClaimRecord[]
  errors: string[]
}

export async function readClaims(root = process.cwd()) {
  return readJsonFiles(resolveBuilderPath('claims', root), claimRecordSchema)
}

export async function getClaimState(root = process.cwd(), now = new Date()): Promise<ClaimState> {
  const result = await readClaims(root)
  const claims = result.records
  const latestByTask = new Map<string, ClaimRecord>()
  for (const claim of claims) {
    const current = latestByTask.get(claim.taskId)
    if (!current || new Date(claim.claimedAt).getTime() >= new Date(current.claimedAt).getTime()) {
      latestByTask.set(claim.taskId, claim)
    }
  }
  const activeClaims = [...latestByTask.values()].filter((claim) => claim.status === 'claimed')
  const fresh = activeClaims
    .filter((claim) => new Date(claim.expiresAt).getTime() > now.getTime())
    .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())
  const staleClaims = activeClaims.filter((claim) => new Date(claim.expiresAt).getTime() <= now.getTime())

  return {
    ok: result.ok,
    activeClaim: fresh[0] ?? null,
    staleClaims,
    claims,
    errors: result.errors,
  }
}

export async function writeClaim(claim: ClaimRecord, root = process.cwd(), now = new Date()) {
  const safeTaskId = claim.taskId.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = join(resolveBuilderPath('claims', root), `${toFileStamp(now)}-${safeTaskId}-${claim.status}.json`)
  await writeJsonFileOnce(path, claimRecordSchema, claim)
  return path
}
