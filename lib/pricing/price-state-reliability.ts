import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pgClient } from '@/lib/db'
import {
  assessPriceStateReliability,
  getStateFromZip,
  type PriceStateReliabilityAssessment,
  type StateReliabilityReport,
  type StateReliabilityResult,
} from './state-reliability'
import type { LookupResolutionTier } from './universal-price-lookup'

const CACHE_TTL_MS = 15 * 60 * 1000
const SNAPSHOT_TTL_MS = 5 * 60 * 1000
const SNAPSHOT_PATH =
  process.env.PIE_STATE_RELIABILITY_SNAPSHOT ||
  path.join(process.cwd(), 'data', 'pie-state-reliability-snapshot.json')

type CacheEntry = {
  expiresAt: number
  value: StateReliabilityResult | null
}

type SnapshotCacheEntry = {
  expiresAt: number
  value: StateReliabilityReport | null
}

const reliabilityByZipCache = new Map<string, CacheEntry>()
let snapshotCache: SnapshotCacheEntry | null = null

function normalizeZip(zipCode: string | null | undefined): string | null {
  return zipCode?.trim().match(/\d{5}/)?.[0] ?? null
}

async function getCachedStateReliability(zipCode: string | null | undefined) {
  const zip = normalizeZip(zipCode)
  if (!zip) return null

  const cached = reliabilityByZipCache.get(zip)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const state = await getStateFromZip(pgClient, zip)
  const value = state ? await getStateReliabilityFromSnapshot(state) : null
  reliabilityByZipCache.set(zip, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  })
  return value
}

async function getStateReliabilityFromSnapshot(
  state: string
): Promise<StateReliabilityResult | null> {
  const report = await readSnapshot()
  return report?.states.find((row) => row.state === state) ?? null
}

async function readSnapshot(): Promise<StateReliabilityReport | null> {
  if (snapshotCache && snapshotCache.expiresAt > Date.now()) return snapshotCache.value

  try {
    const raw = await readFile(SNAPSHOT_PATH, 'utf8')
    const parsed = JSON.parse(raw) as StateReliabilityReport
    snapshotCache = {
      expiresAt: Date.now() + SNAPSHOT_TTL_MS,
      value: parsed,
    }
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[pie] failed to read state reliability snapshot', error)
    }
    snapshotCache = {
      expiresAt: Date.now() + SNAPSHOT_TTL_MS,
      value: null,
    }
    return null
  }
}

export async function buildPriceStateReliability(input: {
  zipCode: string | null | undefined
  resolutionTier: LookupResolutionTier | null | undefined
  confidenceScore: number
}): Promise<PriceStateReliabilityAssessment> {
  try {
    const stateReliability = await getCachedStateReliability(input.zipCode)
    return assessPriceStateReliability({
      stateReliability,
      resolutionTier: input.resolutionTier,
      confidenceScore: input.confidenceScore,
    })
  } catch (error) {
    console.warn('[pie] failed to build state reliability metadata', error)
    return assessPriceStateReliability({
      stateReliability: null,
      resolutionTier: input.resolutionTier,
      confidenceScore: input.confidenceScore,
    })
  }
}

export function priceStateReliabilityApiShape(assessment: PriceStateReliabilityAssessment) {
  return {
    state: assessment.state,
    status: assessment.status,
    score: assessment.score,
    blockers: assessment.blockers,
    claim_level: assessment.claimLevel,
    can_claim_reliable_local: assessment.canClaimReliableLocal,
    effective_confidence_score: assessment.effectiveConfidenceScore,
    note: assessment.note,
  }
}
