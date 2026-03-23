// Server-side database client (Drizzle compatibility layer)
// Drop-in replacement for the old Supabase client.
// All 1,000+ consumer files continue to work unchanged.

import { createCompatClient, type CompatClient } from '@/lib/db/compat'

export function createServerClient(_opts?: { admin?: boolean }): CompatClient {
  return createCompatClient()
}
