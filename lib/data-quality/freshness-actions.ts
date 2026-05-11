'use server'

// Data Freshness Server Actions
// Auth-gated wrappers around freshness engine functions.

import { requireChef } from '@/lib/auth/get-user'
import {
  checkPriceFreshness,
  checkClientFreshness,
  checkRecipeFreshness,
  getFreshnessReport,
  type PriceFreshnessResult,
  type ClientFreshnessResult,
  type RecipeFreshnessResult,
  type FreshnessReport,
} from './freshness'

export async function getPriceFreshness(ingredientId: string): Promise<PriceFreshnessResult> {
  const user = await requireChef()
  if (!ingredientId) throw new Error('ingredientId is required')
  return checkPriceFreshness(user.tenantId!, ingredientId)
}

export async function getClientFreshness(clientId: string): Promise<ClientFreshnessResult> {
  const user = await requireChef()
  if (!clientId) throw new Error('clientId is required')
  return checkClientFreshness(user.tenantId!, clientId)
}

export async function getRecipeFreshness(recipeId: string): Promise<RecipeFreshnessResult> {
  const user = await requireChef()
  if (!recipeId) throw new Error('recipeId is required')
  return checkRecipeFreshness(user.tenantId!, recipeId)
}

export async function getDataFreshnessReport(): Promise<FreshnessReport> {
  const user = await requireChef()
  return getFreshnessReport(user.tenantId!)
}
