import { NextRequest, NextResponse } from 'next/server'
import { getFinancialAnalytics } from '@/lib/reports/analytics-service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  try {
    const snapshot = await getFinancialAnalytics({ start, end })
    return NextResponse.json(
      { success: true, snapshot },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[financial-report] Error:', error)
    const message = error instanceof Error ? error.message : ''
    const status = message.includes('Unauthorized') ? 401 : 500
    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Failed to load financial report' },
      { status }
    )
  }
}
