import { isTaxableTaxClass } from '../tax-policy'
import {
  normalizeTaxClass,
  resolveCatalogModifierSelections,
  sanitizeManualModifierSelections,
} from '../checkout-item-normalization'
import type {
  CheckoutItem,
  CheckoutLineComputation,
  NormalizedCheckoutItem,
  ProductProjectionCheckoutRow,
} from './types'

async function loadCheckoutProductsById(ctx: { db: any; tenantId: string; items: CheckoutItem[] }) {
  const productIds = Array.from(
    new Set(
      ctx.items
        .map((item) => String(item.productProjectionId ?? '').trim())
        .filter((id) => id.length > 0)
    )
  )

  const map = new Map<string, ProductProjectionCheckoutRow>()
  if (productIds.length === 0) return map

  const { data: rows } = await (ctx.db
    .from('product_projections')
    .select(
      'id, name, price_cents, tax_class, cost_cents, is_active, track_inventory, available_qty, modifiers'
    )
    .eq('tenant_id', ctx.tenantId)
    .in('id', productIds) as any)

  for (const row of rows ?? []) {
    map.set(String((row as any).id), row as ProductProjectionCheckoutRow)
  }

  for (const productId of productIds) {
    if (!map.has(productId)) {
      throw new Error('One or more products are no longer available for checkout')
    }
  }

  return map
}

export async function normalizeCheckoutItems(ctx: {
  db: any
  tenantId: string
  items: CheckoutItem[]
}): Promise<NormalizedCheckoutItem[]> {
  const productsById = await loadCheckoutProductsById(ctx)
  const normalized: NormalizedCheckoutItem[] = []

  for (const rawItem of ctx.items) {
    const productId = String(rawItem.productProjectionId ?? '').trim() || null
    const quantity = Number(rawItem.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for "${rawItem.name}"`)
    }

    if (productId) {
      const product = productsById.get(productId)
      if (!product || !product.is_active) {
        throw new Error(`Product is inactive or unavailable for checkout`)
      }

      if (
        product.track_inventory &&
        product.available_qty != null &&
        quantity > product.available_qty
      ) {
        throw new Error(`Insufficient stock for "${product.name}"`)
      }

      normalized.push({
        productProjectionId: product.id,
        name: product.name,
        unitPriceCents: product.price_cents,
        quantity,
        taxClass: normalizeTaxClass(product.tax_class),
        taxCents: 0,
        modifiersApplied: resolveCatalogModifierSelections({
          productName: product.name,
          catalogModifiers: product.modifiers,
          selections: rawItem.modifiersApplied,
        }),
        unitCostCents: product.cost_cents ?? undefined,
      })
      continue
    }

    const name = String(rawItem.name ?? '').trim()
    if (!name) {
      throw new Error('Checkout item name is required')
    }
    const unitPriceCents = Number(rawItem.unitPriceCents)
    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
      throw new Error(`Invalid price for "${name}"`)
    }

    const taxCentsRaw = rawItem.taxCents ?? 0
    if (!Number.isInteger(taxCentsRaw) || taxCentsRaw < 0) {
      throw new Error(`Invalid tax amount for "${name}"`)
    }

    let unitCostCents: number | undefined = undefined
    if (rawItem.unitCostCents != null) {
      const parsedUnitCost = Number(rawItem.unitCostCents)
      if (!Number.isInteger(parsedUnitCost) || parsedUnitCost < 0) {
        throw new Error(`Invalid cost for "${name}"`)
      }
      unitCostCents = parsedUnitCost
    }

    normalized.push({
      name,
      unitPriceCents,
      quantity,
      taxClass: normalizeTaxClass(rawItem.taxClass ?? 'standard'),
      taxCents: taxCentsRaw,
      modifiersApplied: sanitizeManualModifierSelections(rawItem.modifiersApplied),
      unitCostCents,
    })
  }

  return normalized
}

export function buildCheckoutLineComputations(
  normalizedItems: NormalizedCheckoutItem[]
): CheckoutLineComputation[] {
  return normalizedItems.map((item, i) => {
    const modifierTotal = (item.modifiersApplied ?? []).reduce(
      (sum, modifier) => sum + modifier.price_delta_cents * item.quantity,
      0
    )
    return {
      key: `line_${i}`,
      taxClass: item.taxClass,
      lineSubtotalCents: item.unitPriceCents * item.quantity + modifierTotal,
    }
  })
}

export function buildCheckoutSaleItemRows(ctx: {
  saleId: string
  tenantId: string
  normalizedItems: NormalizedCheckoutItem[]
  lineComputations: CheckoutLineComputation[]
  lineDiscountsByKey: Record<string, number>
  zipTaxRate: number
}) {
  return ctx.normalizedItems.map((item, i) => {
    const line = ctx.lineComputations[i]
    const discountCents = Math.max(
      0,
      Math.min(line.lineSubtotalCents, ctx.lineDiscountsByKey[line.key] ?? 0)
    )
    const lineTotalCents = line.lineSubtotalCents - discountCents
    const serverTaxCents = isTaxableTaxClass(item.taxClass)
      ? Math.round(lineTotalCents * ctx.zipTaxRate)
      : 0

    return {
      sale_id: ctx.saleId,
      tenant_id: ctx.tenantId,
      product_projection_id: item.productProjectionId ?? null,
      name: item.name,
      unit_price_cents: item.unitPriceCents,
      quantity: item.quantity,
      discount_cents: discountCents,
      line_total_cents: lineTotalCents,
      tax_class: item.taxClass ?? 'standard',
      tax_cents: serverTaxCents,
      modifiers_applied: item.modifiersApplied ?? [],
      unit_cost_cents: item.unitCostCents ?? null,
      sort_order: i,
    }
  })
}
