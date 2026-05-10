'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type VendorMatch = {
  vendorId: string
  vendorName: string
  confidence: number
  matchType: 'exact' | 'prefix' | 'contains'
}

// ============================================
// NORMALIZATION
// ============================================

// Suffixes stripped during normalization (case-insensitive)
const STRIP_SUFFIXES = [
  'inc',
  'llc',
  'corp',
  'corporation',
  'co',
  'company',
  'ltd',
  'limited',
  'lp',
  'llp',
]

/**
 * Normalize a store name for fuzzy comparison:
 * - lowercase
 * - strip store/location numbers (e.g. #123, No. 456)
 * - strip business suffixes (Inc, LLC, Corp, etc.)
 * - collapse extra whitespace
 * - trim
 */
function normalizeStoreName(name: string): string {
  let normalized = name.toLowerCase()

  // Strip store/location numbers: "#123", "No. 456", "Store 789"
  normalized = normalized.replace(/#\s*\d+/g, '')
  normalized = normalized.replace(/\bno\.?\s*\d+/g, '')
  normalized = normalized.replace(/\bstore\s*\d+/g, '')

  // Strip trailing punctuation that often accompanies suffixes
  normalized = normalized.replace(/[.,]+/g, ' ')

  // Strip business suffixes
  const suffixPattern = new RegExp(`\\b(${STRIP_SUFFIXES.join('|')})\\.?\\b`, 'g')
  normalized = normalized.replace(suffixPattern, '')

  // Collapse whitespace and trim
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

// ============================================
// MATCHING
// ============================================

/**
 * Match a receipt store name to an existing vendor record.
 *
 * Matching tiers (in order of confidence):
 * 1. Exact match on normalized names (confidence 1.0)
 * 2. Prefix match: one normalized name starts with the other (confidence 0.9)
 * 3. Containment match: one contains the other, minimum 4 chars overlap (confidence 0.75)
 *
 * Returns the best match or null if no match found.
 */
export async function matchReceiptToVendor(
  storeName: string,
  tenantId?: string
): Promise<VendorMatch | null> {
  const resolvedTenantId = tenantId ?? (await requireChef()).tenantId!
  const db = createServerClient()

  const { data: vendors, error } = await db
    .from('vendors')
    .select('id, name')
    .eq('chef_id', resolvedTenantId)

  if (error) {
    throw new Error(`Failed to fetch vendors for matching: ${error.message}`)
  }

  if (!vendors || vendors.length === 0) {
    return null
  }

  const normalizedReceipt = normalizeStoreName(storeName)

  if (!normalizedReceipt) {
    return null
  }

  // Tier 1: exact match on normalized name
  for (const vendor of vendors) {
    const normalizedVendor = normalizeStoreName(vendor.name)
    if (normalizedReceipt === normalizedVendor) {
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        confidence: 1.0,
        matchType: 'exact',
      }
    }
  }

  // Tier 2: prefix match (either direction)
  for (const vendor of vendors) {
    const normalizedVendor = normalizeStoreName(vendor.name)
    if (
      normalizedReceipt.startsWith(normalizedVendor) ||
      normalizedVendor.startsWith(normalizedReceipt)
    ) {
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        confidence: 0.9,
        matchType: 'prefix',
      }
    }
  }

  // Tier 3: containment match (minimum 4 character overlap)
  const MIN_OVERLAP = 4
  for (const vendor of vendors) {
    const normalizedVendor = normalizeStoreName(vendor.name)
    if (normalizedVendor.length < MIN_OVERLAP && normalizedReceipt.length < MIN_OVERLAP) {
      continue
    }
    if (
      normalizedReceipt.includes(normalizedVendor) ||
      normalizedVendor.includes(normalizedReceipt)
    ) {
      return {
        vendorId: vendor.id,
        vendorName: vendor.name,
        confidence: 0.75,
        matchType: 'contains',
      }
    }
  }

  return null
}

// ============================================
// GET OR CREATE
// ============================================

/**
 * Attempt to match a receipt store name to an existing vendor.
 * If no match is found, create a new vendor with the store name.
 */
export async function getOrCreateVendorFromReceipt(
  storeName: string
): Promise<{ vendorId: string; created: boolean }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Try matching first
  const match = await matchReceiptToVendor(storeName, tenantId)

  if (match) {
    return { vendorId: match.vendorId, created: false }
  }

  // No match; create a new vendor with the receipt store name
  const db = createServerClient()

  const { data: vendor, error } = await db
    .from('vendors')
    .insert({
      name: storeName.trim(),
      chef_id: tenantId,
      category: 'other',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create vendor from receipt: ${error.message}`)
  }

  revalidatePath('/vendors')

  return { vendorId: vendor.id, created: true }
}
