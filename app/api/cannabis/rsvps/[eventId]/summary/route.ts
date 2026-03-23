import { NextResponse } from 'next/server'

// Cannabis feature is disabled.
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
