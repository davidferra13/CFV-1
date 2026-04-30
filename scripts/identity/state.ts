import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { PlatformClassification, PlatformJob } from './platforms'

export type ClaimStatus = 'complete' | 'partial' | 'failed' | 'awaiting_human_action' | 'deferred'
export type VerificationStatus = 'verified' | 'pending' | 'not_started' | 'not_required' | 'unknown'

export type HumanAction = {
  platform: string
  selectedUsername: string | null
  currentStatus: string
  exactRequiredAction: string
  directUrl: string
  resumeInstruction: string
}

export type ClaimRecord = {
  platformName: string
  platformId: string
  classification: PlatformClassification
  finalHandle: string | null
  status: ClaimStatus
  verificationStatus: VerificationStatus
  credentialsStored: boolean
  notes: string
  directUrl: string | null
  humanAction?: HumanAction
  updatedAt: string
}

export type ClaimState = {
  createdAt: string
  updatedAt: string
  records: Record<string, ClaimRecord>
}

export const IDENTITY_DIR = join('system', 'identity-claims')
export const STATE_PATH = join(IDENTITY_DIR, 'state.json')
export const REPORT_PATH = join(IDENTITY_DIR, 'identity-claim-report.md')

export function nowIso(): string {
  return new Date().toISOString()
}

export function loadState(): ClaimState {
  if (!existsSync(STATE_PATH)) {
    const now = nowIso()
    return { createdAt: now, updatedAt: now, records: {} }
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf8')) as ClaimState
}

export function saveState(state: ClaimState): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true })
  state.updatedAt = nowIso()
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

export function recordFromJob(job: PlatformJob, partial: Partial<ClaimRecord>): ClaimRecord {
  return {
    platformName: job.name,
    platformId: job.id,
    classification: job.classification,
    finalHandle: partial.finalHandle ?? null,
    status: partial.status ?? 'deferred',
    verificationStatus: partial.verificationStatus ?? 'not_started',
    credentialsStored: partial.credentialsStored ?? false,
    notes: partial.notes ?? job.notes,
    directUrl: partial.directUrl ?? job.signupUrl,
    humanAction: partial.humanAction,
    updatedAt: nowIso(),
  }
}

export function formatHumanAction(action: HumanAction): string {
  return [
    `Platform: ${action.platform}`,
    `Username: ${action.selectedUsername ?? 'not selected yet'}`,
    `Status: ${action.currentStatus}`,
    `Action: ${action.exactRequiredAction}`,
    `URL: ${action.directUrl}`,
    action.resumeInstruction,
  ].join('\n')
}

export function renderReport(records: ClaimRecord[]): string {
  const rows = records
    .sort((a, b) => a.platformName.localeCompare(b.platformName))
    .map((record) =>
      [
        record.platformName,
        record.classification,
        record.finalHandle ?? '',
        record.status,
        record.verificationStatus,
        record.credentialsStored ? 'yes' : 'no',
        record.notes.replace(/\n/g, ' '),
      ].join(' | ')
    )

  return [
    '# ChefFlow Identity Claim Report',
    '',
    `Updated: ${nowIso()}`,
    '',
    '| Platform name | Classification | Final handle | Status | Verification status | Credentials stored | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row} |`),
    '',
  ].join('\n')
}

export function writeReport(state: ClaimState): void {
  mkdirSync(dirname(REPORT_PATH), { recursive: true })
  writeFileSync(REPORT_PATH, renderReport(Object.values(state.records)))
}
