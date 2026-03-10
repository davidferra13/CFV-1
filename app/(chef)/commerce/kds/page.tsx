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

  // Load stations for the selector
  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, display_order')
    .eq('chef_id', user.tenantId!)
    .order('display_order', { ascending: true })

  return (
    <KDSPageClient
      stations={(stations ?? []).map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
      }))}
    />
  )
}
