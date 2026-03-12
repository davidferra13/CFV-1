// Client Duplicate Detection
// Fuzzy matching on name + email + phone to find potential duplicates.
// Pure deterministic logic, no AI.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────────────────

export type DuplicateCandidate = {
  clientId: string
  matchedClientId: string
  clientName: string
  matchedName: string
  clientEmail: string | null
  matchedEmail: string | null
  clientPhone: string | null
  matchedPhone: string | null
  matchScore: number // 0-100
  matchReasons: string[]
}

export type DuplicateGroup = {
  clients: Array<{
    id: string
    fullName: string
    email: string | null
    phone: string | null
    eventCount: number
    createdAt: string
  }>
  matchScore: number
  matchReasons: string[]
}

// ── Similarity Functions ─────────────────────────────────────────────────

/**
 * Normalize a name for comparison: lowercase, trim, remove extra spaces,
 * strip common prefixes/suffixes.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(mr|mrs|ms|dr|prof)\.?\s+/i, '')
    .replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, '')
}

/**
 * Normalize a phone number for comparison: digits only, strip country code.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // Strip leading 1 (US country code) if 11 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  return digits
}

/**
 * Simple Levenshtein distance (edit distance between two strings).
 */
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Name similarity score (0-100).
 * Exact match = 100, close match = 60-99, no match = 0.
 */
function nameSimilarity(a: string, b: string): number {
  const normA = normalizeName(a)
  const normB = normalizeName(b)

  if (normA === normB) return 100

  // Check if one contains the other (partial match)
  if (normA.includes(normB) || normB.includes(normA)) return 80

  // Check word overlap (first/last name swap, middle name difference)
  const wordsA = normA.split(' ')
  const wordsB = normB.split(' ')
  const overlap = wordsA.filter((w) => wordsB.includes(w)).length
  const maxWords = Math.max(wordsA.length, wordsB.length)
  if (overlap > 0 && overlap >= maxWords - 1) return 70

  // Levenshtein distance for typos
  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen === 0) return 0
  const distance = levenshtein(normA, normB)
  const similarity = Math.round(((maxLen - distance) / maxLen) * 100)

  // Only consider as potential match if > 75% similar
  return similarity >= 75 ? similarity : 0
}

// ── Detection Engine ─────────────────────────────────────────────────────

/**
 * Find potential duplicate clients for the authenticated chef.
 * Returns groups of clients that appear to be duplicates.
 */
export async function findDuplicateClients(): Promise<DuplicateGroup[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch all active clients
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, full_name, email, phone, created_at')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (error || !clients || clients.length < 2) return []

  // Get event counts per client
  const clientIds = clients.map((c: any) => c.id)
  const { data: eventCounts } = await supabase
    .from('events')
    .select('client_id')
    .eq('tenant_id', user.tenantId!)
    .in('client_id', clientIds)

  const countMap = new Map<string, number>()
  for (const e of eventCounts ?? []) {
    countMap.set(e.client_id, (countMap.get(e.client_id) ?? 0) + 1)
  }

  const groups: DuplicateGroup[] = []
  const alreadyGrouped = new Set<string>()

  for (let i = 0; i < clients.length; i++) {
    if (alreadyGrouped.has(clients[i].id)) continue

    const matches: Array<{ idx: number; score: number; reasons: string[] }> = []

    for (let j = i + 1; j < clients.length; j++) {
      if (alreadyGrouped.has(clients[j].id)) continue

      const a = clients[i]
      const b = clients[j]
      let score = 0
      const reasons: string[] = []

      // Email match (strongest signal)
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
        score += 50
        reasons.push('Same email')
      }

      // Phone match
      if (a.phone && b.phone) {
        const phoneA = normalizePhone(a.phone)
        const phoneB = normalizePhone(b.phone)
        if (phoneA.length >= 7 && phoneA === phoneB) {
          score += 40
          reasons.push('Same phone')
        }
      }

      // Name similarity
      if (a.full_name && b.full_name) {
        const nameSim = nameSimilarity(a.full_name, b.full_name)
        if (nameSim >= 70) {
          score += Math.round(nameSim * 0.4) // Max 40 points from name
          reasons.push(
            nameSim === 100
              ? 'Exact name match'
              : nameSim >= 80
                ? 'Very similar name'
                : 'Similar name'
          )
        }
      }

      // Only consider as duplicate if score >= 50
      if (score >= 50) {
        matches.push({ idx: j, score, reasons })
      }
    }

    if (matches.length > 0) {
      const group: DuplicateGroup = {
        clients: [
          {
            id: clients[i].id,
            fullName: clients[i].full_name,
            email: clients[i].email,
            phone: clients[i].phone,
            eventCount: countMap.get(clients[i].id) ?? 0,
            createdAt: clients[i].created_at,
          },
        ],
        matchScore: Math.max(...matches.map((m) => m.score)),
        matchReasons: [...new Set(matches.flatMap((m) => m.reasons))],
      }

      for (const match of matches) {
        const c = clients[match.idx]
        group.clients.push({
          id: c.id,
          fullName: c.full_name,
          email: c.email,
          phone: c.phone,
          eventCount: countMap.get(c.id) ?? 0,
          createdAt: c.created_at,
        })
        alreadyGrouped.add(c.id)
      }

      alreadyGrouped.add(clients[i].id)
      groups.push(group)
    }
  }

  // Sort by score descending
  return groups.sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * Check if a new client would be a duplicate before creation.
 * Returns potential matches for inline warning.
 */
export async function checkForDuplicatesBeforeCreate(input: {
  fullName: string
  email?: string
  phone?: string
}): Promise<
  Array<{
    id: string
    fullName: string
    email: string | null
    phone: string | null
    matchScore: number
    matchReasons: string[]
  }>
> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('tenant_id', user.tenantId!)
    .limit(500)

  if (!clients) return []

  const matches: Array<{
    id: string
    fullName: string
    email: string | null
    phone: string | null
    matchScore: number
    matchReasons: string[]
  }> = []

  for (const c of clients) {
    let score = 0
    const reasons: string[] = []

    // Email match
    if (input.email && c.email && input.email.toLowerCase() === c.email.toLowerCase()) {
      score += 50
      reasons.push('Same email')
    }

    // Phone match
    if (input.phone && c.phone) {
      const newPhone = normalizePhone(input.phone)
      const existingPhone = normalizePhone(c.phone)
      if (newPhone.length >= 7 && newPhone === existingPhone) {
        score += 40
        reasons.push('Same phone')
      }
    }

    // Name similarity
    if (input.fullName && c.full_name) {
      const sim = nameSimilarity(input.fullName, c.full_name)
      if (sim >= 70) {
        score += Math.round(sim * 0.4)
        reasons.push(sim === 100 ? 'Exact name match' : 'Similar name')
      }
    }

    if (score >= 40) {
      matches.push({
        id: c.id,
        fullName: c.full_name,
        email: c.email,
        phone: c.phone,
        matchScore: score,
        matchReasons: reasons,
      })
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5)
}

// ── Merge Clients ────────────────────────────────────────────────────────

/**
 * Merge a source client into a target client.
 * Moves all events, inquiries, and ledger entries from source to target.
 * Then soft-deletes the source client.
 */
export async function mergeClients(
  targetClientId: string,
  sourceClientId: string
): Promise<{ success: boolean; movedEvents: number; movedInquiries: number }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Verify both clients belong to this tenant
  const { data: target } = await supabase
    .from('clients')
    .select('id')
    .eq('id', targetClientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { data: source } = await supabase
    .from('clients')
    .select('id')
    .eq('id', sourceClientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!target || !source) {
    throw new Error('Both clients must belong to your account')
  }

  // Move events from source to target
  const { data: movedEvents } = await supabase
    .from('events')
    .update({ client_id: targetClientId })
    .eq('client_id', sourceClientId)
    .eq('tenant_id', user.tenantId!)
    .select('id')

  // Move inquiries from source to target
  const { data: movedInquiries } = await supabase
    .from('inquiries')
    .update({ client_id: targetClientId })
    .eq('client_id', sourceClientId)
    .eq('tenant_id', user.tenantId!)
    .select('id')

  // Move ledger entries from source to target
  await supabase
    .from('ledger_entries')
    .update({ client_id: targetClientId })
    .eq('client_id', sourceClientId)
    .eq('tenant_id', user.tenantId!)

  // Move conversations
  await supabase
    .from('conversations')
    .update({ client_id: targetClientId })
    .eq('client_id', sourceClientId)
    .eq('tenant_id', user.tenantId!)

  // Soft-delete source client (mark as merged)
  const softDeleteUpdate: Record<string, unknown> = {
    notes: `[Merged into client ${targetClientId} on ${new Date().toISOString().split('T')[0]}]`,
  }
  // Try deleted_at first, fall back to archived approach
  const { error: deleteError } = await supabase
    .from('clients')
    .update({ ...softDeleteUpdate, deleted_at: new Date().toISOString() } as any)
    .eq('id', sourceClientId)
    .eq('tenant_id', user.tenantId!)

  if (deleteError) {
    // If deleted_at doesn't exist, just update notes
    await supabase
      .from('clients')
      .update(softDeleteUpdate)
      .eq('id', sourceClientId)
      .eq('tenant_id', user.tenantId!)
  }

  const { revalidatePath } = await import('next/cache')
  revalidatePath('/clients')
  revalidatePath(`/clients/${targetClientId}`)

  return {
    success: true,
    movedEvents: movedEvents?.length ?? 0,
    movedInquiries: movedInquiries?.length ?? 0,
  }
}
