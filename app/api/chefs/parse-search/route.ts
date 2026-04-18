// Public NL Chef Search Parser API
// POST /api/chefs/parse-search
// Takes a natural language search query, returns structured filter params.
// No auth required. Rate-limited by IP.

import { NextResponse, type NextRequest } from 'next/server'
import { parseDirectorySearch } from '@/lib/ai/directory-search-parser'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  entry.count++
  return entry.count > 5
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!text || text.length < 5 || text.length > 200) {
      return NextResponse.json({ error: 'Query must be 5-200 characters' }, { status: 400 })
    }

    const filters = await parseDirectorySearch(text)
    return NextResponse.json(filters)
  } catch {
    return NextResponse.json({ error: 'Could not parse search query' }, { status: 500 })
  }
}
