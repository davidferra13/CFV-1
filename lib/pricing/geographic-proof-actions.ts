'use server'

import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import {
  getLatestGeographicPricingProof,
  runGeographicPricingProof,
} from '@/lib/pricing/geographic-proof-query'

const DATA_ENGINE_HEALTH_PATH = ['/admin', 'openclaw', 'health'].join('/')

export async function getGeographicPricingProofLatest() {
  await requireAdmin()
  try {
    const latest = await getLatestGeographicPricingProof()
    return { data: latest, error: null }
  } catch (error) {
    console.error('[geographic-pricing-proof] Failed to load latest proof:', error)
    return { data: null, error: 'Pricing proof could not be loaded.' }
  }
}

export async function runGeographicPricingProofAction(input?: { dryRun?: boolean }) {
  const admin = await requireAdmin()
  try {
    const result = await runGeographicPricingProof({
      write: !input?.dryRun,
      requestedBy: admin.email,
    })

    if (!result.success) {
      return { success: false, error: result.error ?? 'Pricing proof failed.' }
    }

    if (!input?.dryRun) {
      revalidatePath(DATA_ENGINE_HEALTH_PATH)
    }

    return {
      success: true,
      runId: result.runId,
      dryRun: Boolean(input?.dryRun),
      totalRows: result.totalRows,
      expectedRows: result.expectedRows,
      safeToQuoteCount: result.safeToQuoteCount,
      verifyFirstCount: result.verifyFirstCount,
      planningOnlyCount: result.planningOnlyCount,
      notUsableCount: result.notUsableCount,
    }
  } catch (error) {
    console.error('[geographic-pricing-proof] Failed to run proof:', error)
    return { success: false, error: 'Pricing proof could not be run.' }
  }
}

export async function getGeographicQuoteSafetyForMenu(input: {
  geographyCode: string
  ingredientKeys: string[]
}) {
  const user = await requireChef()
  const geographyCode = input.geographyCode?.trim().toUpperCase()
  const ingredientKeys = Array.isArray(input.ingredientKeys)
    ? input.ingredientKeys.map((key) => key.trim()).filter(Boolean)
    : []

  if (!user.tenantId) {
    return { data: null, error: 'Chef account is missing tenant context.' }
  }
  if (!geographyCode) {
    return { data: null, error: 'Geography code is required.' }
  }
  if (ingredientKeys.length === 0) {
    return { data: null, error: 'At least one ingredient key is required.' }
  }

  try {
    const latest = await getLatestGeographicPricingProof()
    const rows = latest.rows.filter(
      (row) => row.geographyCode === geographyCode && ingredientKeys.includes(row.ingredientKey)
    )
    const hasBlockingRow = rows.some(
      (row) => row.quoteSafety === 'planning_only' || row.quoteSafety === 'not_usable'
    )
    const hasVerifyFirstRow = rows.some((row) => row.quoteSafety === 'verify_first')

    return {
      data: {
        geographyCode,
        rows,
        summarySafety: hasBlockingRow
          ? 'planning_only'
          : hasVerifyFirstRow
            ? 'verify_first'
            : 'safe_to_quote',
      },
      error: null,
    }
  } catch (error) {
    console.error('[geographic-pricing-proof] Failed to load menu quote safety:', error)
    return { data: null, error: 'Menu quote safety could not be loaded.' }
  }
}
