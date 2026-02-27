import { NextRequest, NextResponse } from 'next/server'
import { getFinancialAnalytics } from '@/lib/reports/analytics-service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  try {
    const snapshot = await getFinancialAnalytics({ start, end })
    return NextResponse.json({ success: true, snapshot })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load financial report'
    const status = message.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
