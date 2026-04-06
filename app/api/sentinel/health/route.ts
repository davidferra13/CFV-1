import { NextResponse } from 'next/server'

const startTime = new Date().toISOString()

export async function GET() {
  return NextResponse.json({
    ok: true,
    upSince: startTime,
    timestamp: new Date().toISOString(),
  })
}
