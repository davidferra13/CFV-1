import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

import type { ChefFlowCapability } from './types'

export const CAPABILITY_PROOF_STATES = [
  'MISSING',
  'INVALID',
  'STALE',
  'INCOMPLETE',
  'VERIFIED',
] as const

export type CapabilityProofState = (typeof CAPABILITY_PROOF_STATES)[number]

export interface CapabilityProofEvidence {
  path: string
  sha256: string
}

export interface CapabilityProofReceipt {
  schemaVersion: 2
  capabilityId: string
  verifiedAt: string
  verifierVersion: string
  implementationEvidence: CapabilityProofEvidence[]
  testEvidence: CapabilityProofEvidence[]
  runtimeEvidence: CapabilityProofEvidence[]
  stackElimination: {
    scenario: string
    completedInsideChefFlow: boolean
    externalAppSwitches: string[]
  }
  liveRun?: {
    revision: string
    buildId: string
    baseUrl: string
    observedAt: string
    runId: string
    specPath: string
    phone: { actions: string[]; result: string; tapsBefore: number; tapsAfter: number }
    desktop: { actions: string[]; result: string }
  }
}

export interface CapabilityProofEvaluation {
  state: CapabilityProofState
  reasons: string[]
  receiptPath: string
  receipt?: CapabilityProofReceipt
}

const HASH_PATTERN = /^[a-f0-9]{64}$/
const REVISION_PATTERN = /^[a-f0-9]{40}$/
const RUN_ID_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/
const PROOF_DIR = '.agents/capability-proofs'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function receiptPathFor(capabilityId: string): string {
  return `${PROOF_DIR}/${capabilityId}.json`
}

function validEvidence(value: unknown): value is CapabilityProofEvidence {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    value.path.trim().length > 0 &&
    typeof value.sha256 === 'string' &&
    HASH_PATTERN.test(value.sha256)
  )
}

function validReceiptShape(value: unknown): value is CapabilityProofReceipt {
  if (!isRecord(value)) return false
  if (value.schemaVersion !== 2) return false
  if (typeof value.capabilityId !== 'string' || !value.capabilityId.trim()) return false
  if (typeof value.verifiedAt !== 'string' || !value.verifiedAt.trim()) return false
  if (!Number.isFinite(Date.parse(value.verifiedAt))) return false
  if (typeof value.verifierVersion !== 'string' || !value.verifierVersion.trim()) return false

  for (const key of ['implementationEvidence', 'testEvidence', 'runtimeEvidence'] as const) {
    const evidence = value[key]
    if (!Array.isArray(evidence) || evidence.length === 0 || !evidence.every(validEvidence))
      return false
  }

  const allPaths = [
    ...(value.implementationEvidence as CapabilityProofEvidence[]),
    ...(value.testEvidence as CapabilityProofEvidence[]),
    ...(value.runtimeEvidence as CapabilityProofEvidence[]),
  ].map((item) => item.path)
  if (new Set(allPaths).size !== allPaths.length) return false
  if (!isRecord(value.stackElimination)) return false
  if (
    typeof value.stackElimination.scenario !== 'string' ||
    !value.stackElimination.scenario.trim()
  )
    return false
  if (typeof value.stackElimination.completedInsideChefFlow !== 'boolean') return false
  if (!Array.isArray(value.stackElimination.externalAppSwitches)) return false
  if (!value.stackElimination.externalAppSwitches.every((item) => typeof item === 'string')) return false
  const run = value.liveRun
  if (!value.stackElimination.completedInsideChefFlow && run === undefined) return true
  if (!isRecord(run) || typeof run.revision !== 'string' || !REVISION_PATTERN.test(run.revision)) return false
  if (typeof run.buildId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(run.buildId)) return false
  if (typeof run.baseUrl !== 'string' || !/^https:\/\/[^/]+$/.test(run.baseUrl)) return false
  if (typeof run.observedAt !== 'string' || !Number.isFinite(Date.parse(run.observedAt))) return false
  if (typeof run.runId !== 'string' || !RUN_ID_PATTERN.test(run.runId)) return false
  if (typeof run.specPath !== 'string' || !/^[a-z0-9-]+$/.test(value.capabilityId as string) || run.specPath !== `tests/capability-proofs/${value.capabilityId}.spec.ts`) return false
  for (const device of ['phone', 'desktop'] as const) {
    const flow = run[device]
    if (!isRecord(flow) || !Array.isArray(flow.actions) || flow.actions.length < 2 || !flow.actions.every((action) => typeof action === 'string' && action.trim().length > 0) || typeof flow.result !== 'string' || !flow.result.trim()) return false
  }
  if (!Number.isInteger((run.phone as Record<string, unknown>).tapsBefore) || !Number.isInteger((run.phone as Record<string, unknown>).tapsAfter)) return false
  return true
}

function safeEvidencePath(repoRoot: string, candidate: string): string | null {
  if (isAbsolute(candidate)) return null
  const resolved = resolve(repoRoot, candidate)
  const rel = relative(resolve(repoRoot), resolved)
  if (!rel || rel === '.') return null
  if (rel === '..' || rel.startsWith(`..\\`) || rel.startsWith('../') || isAbsolute(rel))
    return null
  if (existsSync(resolved)) {
    const actual = realpathSync(resolved)
    const actualRelative = relative(realpathSync(repoRoot), actual)
    if (actualRelative === '..' || actualRelative.startsWith('..\\') || actualRelative.startsWith('../') || isAbsolute(actualRelative)) return null
  }
  return resolved
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function evaluateEvidence(repoRoot: string, groups: CapabilityProofEvidence[][]): string[] {
  const stale: string[] = []
  for (const evidence of groups.flat()) {
    const path = safeEvidencePath(repoRoot, evidence.path)
    if (!path) return [`unsafe evidence path: ${evidence.path}`]
    if (!existsSync(path)) {
      stale.push(`missing evidence: ${evidence.path}`)
      continue
    }
    const stat = lstatSync(path)
    if (!stat.isFile()) {
      stale.push(`evidence is not a regular file: ${evidence.path}`)
      continue
    }
    if (sha256File(path) !== evidence.sha256) stale.push(`hash changed: ${evidence.path}`)
  }
  return stale
}

export function evaluateCapabilityProof(
  capability: ChefFlowCapability,
  repoRoot: string,
  rawReceipt: unknown,
  confirmedRunId?: string
): CapabilityProofEvaluation {
  const receiptPath = receiptPathFor(capability.id)
  if (rawReceipt === undefined)
    return { state: 'MISSING', reasons: ['proof receipt missing'], receiptPath }
  if (!validReceiptShape(rawReceipt))
    return { state: 'INVALID', reasons: ['invalid proof receipt shape'], receiptPath }
  if (rawReceipt.capabilityId !== capability.id) {
    return {
      state: 'INVALID',
      reasons: [`capability id mismatch: ${rawReceipt.capabilityId}`],
      receiptPath,
    }
  }

  const allEvidence = [
    rawReceipt.implementationEvidence,
    rawReceipt.testEvidence,
    rawReceipt.runtimeEvidence,
  ]
  const stale = evaluateEvidence(repoRoot, allEvidence)
  const unsafe = stale.filter((reason) => reason.startsWith('unsafe evidence path:'))
  if (unsafe.length) return { state: 'INVALID', reasons: unsafe, receiptPath, receipt: rawReceipt }
  if (stale.length) return { state: 'STALE', reasons: stale, receiptPath, receipt: rawReceipt }

  const incomplete: string[] = []
  if (!rawReceipt.stackElimination.completedInsideChefFlow)
    incomplete.push('scenario did not complete inside ChefFlow')
  const switches = rawReceipt.stackElimination.externalAppSwitches.filter(
    (item) => item.trim().length > 0
  )
  if (switches.length) incomplete.push(`external app switches remain: ${switches.join(', ')}`)
  if (capability.strategy === 'LAUNCH_ONLY') incomplete.push('LAUNCH_ONLY remains product debt')
  const run = rawReceipt.liveRun
  if (!run) {
    incomplete.push('live run not recorded')
    return { state: 'INCOMPLETE', reasons: incomplete, receiptPath, receipt: rawReceipt }
  }
  if (run.observedAt !== rawReceipt.verifiedAt) incomplete.push('run timestamp and receipt timestamp differ')
  const observedAge = Date.now() - Date.parse(run.observedAt)
  if (observedAge < -300_000 || observedAge > 7 * 24 * 60 * 60 * 1000) incomplete.push('live observation is not current')
  try {
    const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (revision !== run.revision) incomplete.push('implementation revision changed since live observation')
  } catch {
    incomplete.push('implementation revision could not be verified')
  }
  if (!rawReceipt.testEvidence.some((evidence) => evidence.path === run.specPath)) incomplete.push('replayed flow spec is not in test evidence')
  if (confirmedRunId !== run.runId) incomplete.push('live flow replay has not passed in this gate run')
  if (incomplete.length)
    return { state: 'INCOMPLETE', reasons: incomplete, receiptPath, receipt: rawReceipt }

  return { state: 'VERIFIED', reasons: [], receiptPath, receipt: rawReceipt }
}

export function evaluateCapabilityProofFile(
  capability: ChefFlowCapability,
  repoRoot: string,
  confirmedRunId?: string
): CapabilityProofEvaluation {
  const receiptPath = receiptPathFor(capability.id)
  const absoluteReceiptPath = safeEvidencePath(repoRoot, receiptPath)
  if (!absoluteReceiptPath || !existsSync(absoluteReceiptPath)) {
    return { state: 'MISSING', reasons: ['proof receipt missing'], receiptPath }
  }
  try {
    return evaluateCapabilityProof(
      capability,
      repoRoot,
      JSON.parse(readFileSync(absoluteReceiptPath, 'utf8')),
      confirmedRunId
    )
  } catch {
    return { state: 'INVALID', reasons: ['proof receipt is not valid JSON'], receiptPath }
  }
}

export function applyCapabilityProof(
  capability: ChefFlowCapability,
  evaluation: CapabilityProofEvaluation
): ChefFlowCapability {
  if (evaluation.state !== 'VERIFIED' || capability.strategy === 'LAUNCH_ONLY') {
    return { ...capability }
  }
  return {
    ...capability,
    buildStatus: 'VERIFIED',
    testStatus: 'VERIFIED',
    externalInteractionRemaining: '',
    productDebt: false,
  }
}
