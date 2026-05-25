'use server'

import { requireChef } from '@/lib/auth/get-user'
import { sendEmail } from '@/lib/email/send'
import type { ShoppingListItem, ShoppingListResult } from './shopping-list-actions'
import { groupByCategory, splitByVendor } from './shopping-list-actions'
import React from 'react'

// ── Formatting Helpers ───────────────────────────────────────────────────

function formatCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    produce: 'PRODUCE',
    meat_seafood: 'PROTEIN',
    dairy_eggs: 'DAIRY',
    bakery: 'BAKERY',
    deli: 'DELI',
    frozen: 'FROZEN',
    pantry_dry: 'DRY GOODS',
    canned: 'CANNED',
    condiments_sauces: 'CONDIMENTS',
    spices: 'SPICES',
    baking: 'BAKING',
    beverages: 'BEVERAGES',
    bulk: 'BULK',
    international: 'INTERNATIONAL',
    household: 'HOUSEHOLD',
    other: 'OTHER',
  }
  return labels[cat] ?? cat.toUpperCase().replace(/_/g, ' ')
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length)
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str
}

function formatPrice(cents: number): string {
  if (cents === 0) return ''
  return `~$${(cents / 100).toFixed(2)}`
}

// ── Plain Text Export ────────────────────────────────────────────────────

export function formatPlainText(
  result: ShoppingListResult,
  options?: { shortagesOnly?: boolean }
): string {
  const items = options?.shortagesOnly ? result.items.filter((i) => i.toBuy > 0) : result.items

  const grouped = groupByCategory(items)
  const lines: string[] = []

  // Header
  lines.push(`SHOPPING LIST - ${result.startDate} to ${result.endDate}`)
  const eventCount = new Set(items.flatMap((i) => i.eventBreakdown.map((b) => b.eventId))).size
  const guestInfo = eventCount > 0 ? `${eventCount} event${eventCount === 1 ? '' : 's'}` : ''
  if (guestInfo) lines.push(guestInfo)
  lines.push('='.repeat(50))
  lines.push('')

  let noPriceCount = 0

  for (const [category, categoryItems] of grouped) {
    lines.push(formatCategoryLabel(category))

    for (const item of categoryItems) {
      const name = padRight(`  ${item.ingredientName}`, 26)
      const qty = padLeft(`${item.toBuy.toFixed(1)} ${item.unit}`, 14)
      const hasPriceData = item.estimatedCostCents > 0
      const price = hasPriceData ? padLeft(formatPrice(item.estimatedCostCents), 12) : ''
      if (!hasPriceData) noPriceCount++
      const marker = !hasPriceData && item.toBuy > 0 ? ' *' : ''
      lines.push(`${name}${qty}${price}${marker}`)
    }
    lines.push('')
  }

  // Footer
  lines.push('='.repeat(50))
  lines.push(`ESTIMATED TOTAL: ~$${(result.totalEstimatedCostCents / 100).toFixed(2)}`)
  if (noPriceCount > 0) {
    lines.push(`Items without prices: ${noPriceCount} (marked with *)`)
  }
  if (result.incompleteRecipes.length > 0) {
    const uniqueRecipes = [...new Set(result.incompleteRecipes.map((w) => w.recipeName))]
    lines.push(
      `Recipes with missing quantities: ${uniqueRecipes.length} (${uniqueRecipes.join(', ')})`
    )
  }

  return lines.join('\n')
}

// ── Per-Vendor Text Export ───────────────────────────────────────────────

export function formatPerVendorText(
  result: ShoppingListResult,
  options?: { shortagesOnly?: boolean }
): string {
  const items = options?.shortagesOnly ? result.items.filter((i) => i.toBuy > 0) : result.items

  const vendorMap = splitByVendor(items)
  const sections: string[] = []

  for (const [vendor, vendorItems] of vendorMap) {
    const lines: string[] = []
    lines.push(`ORDER FOR: ${vendor}`)
    lines.push('='.repeat(50))

    const grouped = groupByCategory(vendorItems)
    for (const [category, catItems] of grouped) {
      lines.push(formatCategoryLabel(category))
      for (const item of catItems) {
        const name = padRight(`  ${item.ingredientName}`, 26)
        const qty = padLeft(`${item.toBuy.toFixed(1)} ${item.unit}`, 14)
        lines.push(`${name}${qty}`)
      }
      lines.push('')
    }

    const subtotal = vendorItems.reduce((sum, i) => sum + i.estimatedCostCents, 0)
    lines.push('='.repeat(50))
    lines.push(`${vendorItems.length} items    ~$${(subtotal / 100).toFixed(2)}`)
    sections.push(lines.join('\n'))
  }

  return sections.join('\n\n')
}

// ── Vendor Order Summary ─────────────────────────────────────────────────

export type VendorSummary = {
  vendor: string
  itemCount: number
  estimatedCostCents: number
}

export function getVendorOrderSummary(items: ShoppingListItem[]): VendorSummary[] {
  const vendorMap = splitByVendor(items.filter((i) => i.toBuy > 0))
  const summaries: VendorSummary[] = []

  for (const [vendor, vendorItems] of vendorMap) {
    summaries.push({
      vendor,
      itemCount: vendorItems.length,
      estimatedCostCents: vendorItems.reduce((sum, i) => sum + i.estimatedCostCents, 0),
    })
  }

  return summaries
}

// ── Email Share ──────────────────────────────────────────────────────────

export async function emailShoppingList(
  result: ShoppingListResult,
  toEmail: string
): Promise<{ success: boolean }> {
  await requireChef()

  const plainText = formatPlainText(result, { shortagesOnly: true })
  const subject = `Shopping List - ${result.startDate} to ${result.endDate}`

  try {
    await sendEmail({
      to: toEmail,
      subject,
      react: React.createElement('pre', {
        style: {
          fontFamily: 'monospace',
          fontSize: '13px',
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
        },
        children: plainText,
      }),
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
