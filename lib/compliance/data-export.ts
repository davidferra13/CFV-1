'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export async function exportMyData(): Promise<Record<string, unknown>> {
  const user = await requireChef()
  const supabase = createServerClient()

  const [events, clients, expenses, recipes] = await Promise.all([
    supabase.from('events').select('*').eq('tenant_id', user.entityId).then(r => r.data || []),
    supabase.from('clients').select('*').eq('chef_id', user.entityId).then(r => r.data || []),
    supabase.from('expenses').select('*').eq('tenant_id', user.entityId).then(r => r.data || []),
    supabase.from('recipes').select('id, name, cuisine_type, course_type, created_at').eq('chef_id', user.entityId).then(r => r.data || []),
  ])

  return {
    exported_at: new Date().toISOString(),
    chef_id: user.entityId,
    events,
    clients: clients.map(c => ({ ...c, email: c.email, phone: c.phone })),
    expenses,
    recipes,
  }
}
