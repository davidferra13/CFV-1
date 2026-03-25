// POST /api/prospecting/check-dups
// n8n calls this before importing scraped leads to avoid duplicates.
// Accepts: { prospects: [{ name, city }] }
// Returns: { results: [{ name, city, isDuplicate, existingId? }] }

import { NextResponse } from 'next/server'
import { validateProspectingAuth } from '@/lib/prospecting/api-auth'
import { createServerClient } from '@/lib/db/server'
import { isSimilarName } from '@/lib/prospecting/fuzzy-match'

interface DedupInput {
  name: string
  city?: string | null
}

export async function POST(request: Request) {
  const auth = await validateProspectingAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { prospects: DedupInput[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.prospects) || body.prospects.length === 0) {
    return NextResponse.json({ error: 'prospects array required' }, { status: 400 })
  }

  if (body.prospects.length > 200) {
    return NextResponse.json({ error: 'Max 200 prospects per check' }, { status: 400 })
  }

  const db = createServerClient({ admin: true })

  // Fetch all existing prospect names + cities for this chef (for fuzzy matching)
  const { data: existing } = await db
    .from('prospects' as any)
    .select('id, name, city')
    .eq('chef_id', auth.tenantId)

  const existingList = (existing ?? []) as unknown as {
    id: string
    name: string
    city: string | null
  }[]

  const results = body.prospects.map((input) => {
    const match = existingList.find(
      (e) =>
        isSimilarName(e.name, input.name) &&
        (!input.city || !e.city || isSimilarName(e.city, input.city))
    )
    return {
      name: input.name,
      city: input.city ?? null,
      isDuplicate: !!match,
      existingId: match?.id ?? null,
    }
  })

  return NextResponse.json({ results })
}
