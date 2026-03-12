import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  // Service-role/admin clients stay intentionally loose to keep TS query-builder
  // inference from dominating full-repo builds.
  return createClient<any, 'public', any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
