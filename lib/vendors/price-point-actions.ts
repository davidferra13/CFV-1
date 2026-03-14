'use server'

function cleanString(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function deriveVendorItemUnit(
  unitMeasure: string | null | undefined,
  unitSize: number | string | null | undefined
): string {
  const measure = cleanString(unitMeasure)?.toLowerCase() ?? 'each'
  const parsedSize =
    typeof unitSize === 'string' ? Number(unitSize) : typeof unitSize === 'number' ? unitSize : NaN

  if (Number.isFinite(parsedSize) && parsedSize > 0) {
    const roundedSize = Number(parsedSize.toFixed(3))
    return `${roundedSize} ${measure}`
  }

  return measure
}

export async function recordVendorPricePoint(params: {
  supabase: any
  tenantId: string
  vendorId: string
  ingredientId?: string | null
  itemName: string
  unitMeasure?: string | null
  unitSize?: number | string | null
  priceCents: number
  notes?: string | null
  force?: boolean
}): Promise<{ inserted: boolean; reason?: string }> {
  const normalizedItemName = cleanString(params.itemName)
  if (!normalizedItemName) {
    return { inserted: false, reason: 'missing_item_name' }
  }

  if (!Number.isFinite(params.priceCents) || params.priceCents < 0) {
    return { inserted: false, reason: 'invalid_price' }
  }

  const unit = deriveVendorItemUnit(params.unitMeasure ?? null, params.unitSize ?? null)

  const { data: latest, error: latestError } = await (
    params.supabase.from('vendor_price_points') as any
  )
    .select('price_cents')
    .eq('chef_id', params.tenantId)
    .eq('vendor_id', params.vendorId)
    .eq('item_name', normalizedItemName)
    .eq('unit', unit)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestError) {
    throw new Error(`Failed to check vendor price history: ${latestError.message}`)
  }

  if (!params.force && latest && Number(latest.price_cents) === Math.round(params.priceCents)) {
    return { inserted: false, reason: 'unchanged_price' }
  }

  const { error: insertError } = await (params.supabase.from('vendor_price_points') as any).insert({
    chef_id: params.tenantId,
    vendor_id: params.vendorId,
    ingredient_id: params.ingredientId ?? null,
    item_name: normalizedItemName,
    unit,
    price_cents: Math.round(params.priceCents),
    notes: cleanString(params.notes),
    recorded_at: new Date().toISOString(),
  })

  if (insertError) {
    throw new Error(`Failed to record vendor price history: ${insertError.message}`)
  }

  return { inserted: true }
}
