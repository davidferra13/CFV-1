import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync } from 'node:fs'
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
  schemaVersion: 1
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
}

export interface CapabilityProofEvaluation {
  state: CapabilityProofState
  reasons: string[]
  receiptPath: string
  receipt?: CapabilityProofReceipt
}

const HASH_PATTERN = /^[a-f0-9]{64}$/
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
  if (value.schemaVersion !== 1) return false
  if (typeof value.capabilityId !== 'string' || !value.capabilityId.trim()) return false
  if (typeof value.verifiedAt !== 'string' || !value.verifiedAt.trim()) return false
  if (!Number.isFinite(Date.parse(value.verifiedAt))) return false
  if (typeof value.verifierVersion !== 'string' || !value.verifierVersion.trim()) return false

  for (const key of ['implementationEvidence', 'testEvidence', 'runtimeEvidence'] as const) {
    const evidence = value[key]
    if (!Array.isArray(evidence) || evidence.length === 0 || !evidence.every(validEvidence))
      return false
  }

  if (!isRecord(value.stackElimination)) return false
  if (
    typeof value.stackElimination.scenario !== 'string' ||
    !value.stackElimination.scenario.trim()
  )
    return false
  if (typeof value.stackElimination.completedInsideChefFlow !== 'boolean') return false
  if (!Array.isArray(value.stackElimination.externalAppSwitches)) return false
  return value.stackElimination.externalAppSwitches.every((item) => typeof item === 'string')
}

function safeEvidencePath(repoRoot: string, candidate: string): string | null {
  if (isAbsolute(candidate)) return null
  const resolved = resolve(repoRoot, candidate)
  const rel = relative(resolve(repoRoot), resolved)
  if (!rel || rel === '.') return null
  if (rel === '..' || rel.startsWith(`..\\`) || rel.startsWith('../') || isAbsolute(rel))
    return null
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
  rawReceipt: unknown
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
  if (incomplete.length)
    return { state: 'INCOMPLETE', reasons: incomplete, receiptPath, receipt: rawReceipt }

  return { state: 'VERIFIED', reasons: [], receiptPath, receipt: rawReceipt }
}

export function evaluateCapabilityProofFile(
  capability: ChefFlowCapability,
  repoRoot: string
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
      JSON.parse(readFileSync(absoluteReceiptPath, 'utf8'))
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
