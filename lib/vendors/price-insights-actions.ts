'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { broadcastTenantMutation } from '@/lib/realtime/broadcast'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  computeVendorPriceAlerts,
  computeVendorPriceTrends,
  type VendorPriceAlert,
  type VendorPricePoint,
  type VendorPriceTrend,
} from '@/lib/vendors/price-insights'

const DEFAULT_VENDOR_ALERT_THRESHOLD_PERCENT = 5

const GetVendorPriceInsightsSchema = z.object({
  vendorId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  trendItems: z.number().int().min(1).max(40).default(10),
  pointsPerTrend: z.number().int().min(2).max(20).default(8),
  lookbackDays: z.number().int().min(7).max(730).default(180),
  minDeltaPercent: z.number().min(0).max(1000).optional(),
  useVendorThresholdWhenAvailable: z.boolean().default(true),
})

export type VendorPriceInsights = {
  points: VendorPricePoint[]
  alerts: VendorPriceAlert[]
  trends: VendorPriceTrend[]
  thresholdPercent: number
  asOf: string
}

const SetVendorPriceAlertThresholdSchema = z.object({
  vendorId: z.string().uuid(),
  thresholdPercent: z.number().min(0).max(1000),
})

async function assertVendorAccess(db: any, tenantId: string, vendorId: string) {
  const { data, error } = await db
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('chef_id', tenantId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Vendor not found or access denied')
  }
}

async function readVendorAlertThreshold(
  db: any,
  tenantId: string,
  vendorId: string
): Promise<number | null> {
  const { data, error } = await db
    .from('vendor_price_alert_settings')
    .select('price_change_percent_threshold')
    .eq('chef_id', tenantId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (error) {
    console.error('[vendor-price-insights] threshold read error:', error)
    return null
  }

  const value = Number(data?.price_change_percent_threshold)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

function applyAlertThreshold(
  alerts: VendorPriceAlert[],
  thresholdPercent: number
): VendorPriceAlert[] {
  if (thresholdPercent <= 0) return alerts
  return alerts.filter((alert) => Math.abs(alert.delta_percent) >= thresholdPercent)
}

export async function getVendorPriceInsights(input?: z.input<typeof GetVendorPriceInsightsSchema>) {
  const user = await requireChef()
  const db: any = createServerClient()
  const params = GetVendorPriceInsightsSchema.parse(input ?? {})

  if (params.vendorId) {
    await assertVendorAccess(db, user.tenantId!, params.vendorId)
  }

  const sinceIso = new Date(Date.now() - params.lookbackDays * 24 * 60 * 60 * 1000).toISOString()

  let query = (db.from('vendor_price_points') as any)
    .select('vendor_id, item_name, unit, price_cents, recorded_at, vendors(name)')
    .eq('chef_id', user.tenantId!)
    .gte('recorded_at', sinceIso)
    .order('recorded_at', { ascending: false })
    .limit(4000)

  if (params.vendorId) {
    query = query.eq('vendor_id', params.vendorId)
  }

  const { data, error } = await query
  if (error) {
    console.error('[vendor-price-insights] query error:', error)
    throw new Error('Failed to load vendor price insights')
  }

  const points: VendorPricePoint[] = (data ?? []).map((row: any) => ({
    vendor_id: row.vendor_id,
    vendor_name: row.vendors?.name ?? null,
    item_name: String(row.item_name ?? '').trim(),
    unit: String(row.unit ?? '').trim() || 'each',
    price_cents: Number(row.price_cents ?? 0),
    recorded_at: row.recorded_at,
  }))

  const vendorThreshold =
    params.vendorId && params.useVendorThresholdWhenAvailable
      ? await readVendorAlertThreshold(db, user.tenantId!, params.vendorId)
      : null
  const thresholdPercent =
    params.minDeltaPercent ?? vendorThreshold ?? DEFAULT_VENDOR_ALERT_THRESHOLD_PERCENT
  const baseAlerts = computeVendorPriceAlerts(points, params.limit * 4)
  const alerts = applyAlertThreshold(baseAlerts, thresholdPercent).slice(0, params.limit)

  return {
    points,
    alerts,
    trends: computeVendorPriceTrends(points, {
      maxItems: params.trendItems,
      pointsPerItem: params.pointsPerTrend,
    }),
    thresholdPercent,
    asOf: new Date().toISOString(),
  } satisfies VendorPriceInsights
}

export async function getVendorPriceAlertThreshold(vendorId: string): Promise<number> {
  const user = await requireChef()
  const db: any = createServerClient()
  await assertVendorAccess(db, user.tenantId!, vendorId)
  const value = await readVendorAlertThreshold(db, user.tenantId!, vendorId)
  return value ?? DEFAULT_VENDOR_ALERT_THRESHOLD_PERCENT
}

export async function setVendorPriceAlertThreshold(
  input: z.input<typeof SetVendorPriceAlertThresholdSchema>
) {
  const user = await requireChef()
  const db: any = createServerClient()
  const data = SetVendorPriceAlertThresholdSchema.parse(input)
  await assertVendorAccess(db, user.tenantId!, data.vendorId)

  const normalizedThreshold = Number(data.thresholdPercent.toFixed(2))

  const { error } = await db.from('vendor_price_alert_settings').upsert(
    {
      chef_id: user.tenantId!,
      vendor_id: data.vendorId,
      price_change_percent_threshold: normalizedThreshold,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chef_id,vendor_id' }
  )

  if (error) {
    console.error('[vendor-price-insights] threshold upsert error:', error)
    throw new Error('Failed to save alert threshold')
  }

  revalidatePath(`/vendors/${data.vendorId}`)
  revalidatePath('/vendors/price-comparison')

  return { success: true as const, thresholdPercent: normalizedThreshold }
}
