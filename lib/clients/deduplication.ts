'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface DuplicatePair {
  client1: { id: string; full_name: string; email: string | null; phone: string | null }
  client2: { id: string; full_name: string; email: string | null; phone: string | null }
  matchReason: string
  confidence: 'high' | 'medium'
}

function normalize(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function findDuplicateClients(): Promise<DuplicatePair[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, email, phone')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  if (!clients || clients.length < 2) return []

  const pairs: DuplicatePair[] = []
  const seen = new Set<string>()

  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const c1 = clients[i],
        c2 = clients[j]
      const pairKey = [c1.id, c2.id].sort().join('|')
      if (seen.has(pairKey)) continue

      // Same email
      if (c1.email && c2.email && normalize(c1.email) === normalize(c2.email)) {
        seen.add(pairKey)
        pairs.push({
          client1: c1,
          client2: c2,
          matchReason: 'Same email address',
          confidence: 'high',
        })
        continue
      }
      // Same phone
      if (c1.phone && c2.phone && c1.phone.replace(/\D/g, '') === c2.phone.replace(/\D/g, '')) {
        seen.add(pairKey)
        pairs.push({
          client1: c1,
          client2: c2,
          matchReason: 'Same phone number',
          confidence: 'high',
        })
        continue
      }
      // Very similar name
      if (normalize(c1.full_name) === normalize(c2.full_name)) {
        seen.add(pairKey)
        pairs.push({ client1: c1, client2: c2, matchReason: 'Same name', confidence: 'medium' })
      }
    }
  }

  return pairs.slice(0, 50)
}
