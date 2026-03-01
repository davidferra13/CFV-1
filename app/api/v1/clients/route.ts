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
  const rawLimit = Number(url.searchParams.get('limit') ?? '100')
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : 100

  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, email, phone, status, created_at')
    .eq('chef_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 })
  return NextResponse.json({ data, count: data?.length ?? 0 })
}
