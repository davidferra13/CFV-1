import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import KDSPageClient from './kds-page-client'

export const metadata = {
  title: 'Kitchen Display System | ChefFlow',
}

export default async function KDSPage() {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  // Load stations and current PIN in parallel
  const [{ data: stations }, { data: chef }] = await Promise.all([
    supabase
      .from('stations')
      .select('id, name, display_order')
      .eq('chef_id', user.tenantId!)
      .order('display_order', { ascending: true }),
    supabase.from('chefs').select('kds_pin').eq('id', user.tenantId!).single(),
  ])

  return (
    <KDSPageClient
      stations={(stations ?? []).map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
      }))}
      currentPin={(chef as any)?.kds_pin ?? null}
      tenantId={user.tenantId!}
    />
  )
}
