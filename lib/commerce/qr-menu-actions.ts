// QR Code Digital Menu - Generate, manage, and track QR codes for public menus
// Scan tracking is deterministic (Formula > AI). No LLM involved.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import crypto from 'crypto'

// ─── Types ────────────────────────────────────────────────────────

export type QRCode = {
  id: string
  tenant_id: string
  label: string
  target_url: string
  short_code: string
  qr_image_url: string | null
  scan_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type QRScanStat = {
  date: string
  count: number
}

type QRSize = 200 | 300 | 500

// ─── Helpers ──────────────────────────────────────────────────────

function generateShortCode(): string {
  return crypto.randomBytes(4).toString('hex') // 8 char hex string
}

function buildQRImageUrl(targetUrl: string, size: QRSize = 300): string {
  const encoded = encodeURIComponent(targetUrl)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&format=png`
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://app.cheflowhq.com'
  )
}

// ─── Generate QR Code ─────────────────────────────────────────────

export async function generateMenuQRCode(options?: {
  label?: string
  targetUrl?: string
  size?: QRSize
}) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const shortCode = generateShortCode()
  const baseUrl = getBaseUrl()
  const menuUrl = options?.targetUrl || `${baseUrl}/qr/${shortCode}`
  const size = options?.size || 300
  const label = options?.label || 'Menu QR Code'

  // The QR always points to our redirect endpoint, which tracks scans then redirects
  const qrTargetUrl = `${baseUrl}/qr/${shortCode}`
  const qrImageUrl = buildQRImageUrl(qrTargetUrl, size)

  // The actual destination URL (where the user ends up after scan tracking)
  const finalTargetUrl = options?.targetUrl || `${baseUrl}/menu/public`

  const { data, error } = await supabase
    .from('qr_codes')
    .insert({
      tenant_id: tenantId,
      label,
      target_url: finalTargetUrl,
      short_code: shortCode,
      qr_image_url: qrImageUrl,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create QR code: ${error.message}`)

  revalidatePath('/commerce/qr-menu')
  return { qrCode: data as QRCode, qrImageUrl, menuUrl: qrTargetUrl, shortCode }
}

// ─── Get Active QR Codes ──────────────────────────────────────────

export async function getActiveQRCodes() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load QR codes: ${error.message}`)
  return (data || []) as QRCode[]
}

// ─── Update QR Code ───────────────────────────────────────────────

export async function updateQRCode(
  id: string,
  updates: { label?: string; target_url?: string; is_active?: boolean }
) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('qr_codes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to update QR code: ${error.message}`)
  revalidatePath('/commerce/qr-menu')
}

// ─── Delete QR Code ───────────────────────────────────────────────

export async function deleteQRCode(id: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase.from('qr_codes').delete().eq('id', id).eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to delete QR code: ${error.message}`)
  revalidatePath('/commerce/qr-menu')
}

// ─── Track QR Scan (public, no auth required) ────────────────────

export async function trackQRScan(shortCode: string, userAgent?: string) {
  const supabase: any = createServerClient({ admin: true })

  // Look up the QR code
  const { data: qr, error: lookupError } = await supabase
    .from('qr_codes')
    .select('id, tenant_id, target_url, is_active')
    .eq('short_code', shortCode)
    .single()

  if (lookupError || !qr) return null
  if (!qr.is_active) return { targetUrl: qr.target_url, tracked: false }

  // Record the scan
  try {
    await supabase.from('qr_scans').insert({
      tenant_id: qr.tenant_id,
      qr_code_id: qr.id,
      user_agent: userAgent || null,
    })

    // Increment the counter
    await supabase
      .from('qr_codes')
      .update({ scan_count: (qr.scan_count || 0) + 1 })
      .eq('id', qr.id)
  } catch (err) {
    // Non-blocking: scan tracking failure should not break the redirect
    console.error('[non-blocking] QR scan tracking failed', err)
  }

  return { targetUrl: qr.target_url, tracked: true }
}

// ─── Get QR Scan Stats ────────────────────────────────────────────

export async function getQRScanStats(days: number = 30) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data: scans, error } = await supabase
    .from('qr_scans')
    .select('scanned_at')
    .eq('tenant_id', tenantId)
    .gte('scanned_at', since.toISOString())
    .order('scanned_at', { ascending: true })

  if (error) throw new Error(`Failed to load scan stats: ${error.message}`)

  // Group by date
  const byDate: Record<string, number> = {}
  for (const scan of scans || []) {
    const date = new Date(scan.scanned_at).toISOString().slice(0, 10)
    byDate[date] = (byDate[date] || 0) + 1
  }

  const dailyStats: QRScanStat[] = Object.entries(byDate).map(([date, count]) => ({ date, count }))
  const totalScans = dailyStats.reduce((sum, d) => sum + d.count, 0)

  // Peak day
  let peakDay: QRScanStat | null = null
  for (const stat of dailyStats) {
    if (!peakDay || stat.count > peakDay.count) peakDay = stat
  }

  return { dailyStats, totalScans, peakDay, days }
}
