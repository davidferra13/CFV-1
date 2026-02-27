import { NextRequest, NextResponse } from 'next/server'
import { getSchedulingAvailability } from '@/lib/scheduling/time-blocks'

function normalizeDate(input: string | null): string {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input
  return new Date().toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const date = normalizeDate(request.nextUrl.searchParams.get('date'))

  try {
    const availability = await getSchedulingAvailability(date)
    return NextResponse.json({ success: true, availability })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load availability'
    const status = message.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
