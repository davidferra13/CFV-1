// Server-side Supabase client with cookie handling
// Used in Server Components, Server Actions, and API Routes

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type LooseSupabaseClient = SupabaseClient<any, 'public', any>
type ServerCookie = {
  name: string
  value: string
  options?: Record<string, unknown>
}

export function createServerClient({
  admin = false,
}: { admin?: boolean } = {}): LooseSupabaseClient {
  // Use service role key for admin operations (webhooks, signup)
  // Keep service-role clients intentionally loose: the fully generated database
  // query types create pathological TS performance across admin/server actions.
  if (admin) {
    return createSupabaseClient<any, 'public', any>(
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

  const cookieStore = cookies()

  return createSupabaseServerClient<any, 'public'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: ServerCookie[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export const createClient = createServerClient
