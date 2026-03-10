// QR Code redirect endpoint - tracks scan, then redirects to target URL
// This is a public route (no auth required)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest, { params }: { params: { shortCode: string } }) {
  const { shortCode } = params
  const userAgent = request.headers.get('user-agent') || undefined

  // Use admin client since this is a public endpoint (no user auth)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  // Look up the QR code including scan_count for increment
  const { data: qr, error } = await supabase
    .from('qr_codes')
    .select('id, tenant_id, target_url, is_active, scan_count')
    .eq('short_code', shortCode)
    .single()

  if (error || !qr) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Track the scan (non-blocking, don't let tracking failure break the redirect)
  if (qr.is_active) {
    try {
      await supabase.from('qr_scans').insert({
        tenant_id: qr.tenant_id,
        qr_code_id: qr.id,
        user_agent: userAgent || null,
      })

      // Increment scan count directly
      await supabase
        .from('qr_codes')
        .update({ scan_count: ((qr as any).scan_count || 0) + 1 })
        .eq('id', qr.id)
    } catch (err) {
      console.error('[non-blocking] QR scan tracking failed', err)
    }
  }

  return NextResponse.redirect(qr.target_url)
}
