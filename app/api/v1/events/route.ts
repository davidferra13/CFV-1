import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api/auth-api-key'
import { checkRateLimit } from '@/lib/api/rate-limit'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const ctx = await validateApiKey(authHeader)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success } = await checkRateLimit(`api:${ctx.tenantId}`)
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = createServerClient({ admin: true })
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const rawLimit = Number(url.searchParams.get('limit') ?? '50')
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 50

  let query = supabase
    .from('events')
    .select(
      'id, status, occasion, event_date, guest_count, quoted_price_cents, created_at, client:clients(id, full_name, email)'
    )
    .eq('tenant_id', ctx.tenantId)
    .order('event_date', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status as any)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })

  return NextResponse.json({ data, count: data?.length ?? 0 })
}
