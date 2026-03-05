import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { VirtualTerminalForm } from '@/components/commerce/virtual-terminal-form'

export const metadata: Metadata = { title: 'Virtual Terminal - ChefFlow' }

export default async function VirtualTerminalPage() {
  const user = await requireChef()
  await requirePro('commerce')

  const supabase: any = createServerClient()
  let defaultTaxZip: string | undefined

  try {
    const { data: chef } = await supabase
      .from('chefs')
      .select('zip')
      .eq('id', user.tenantId!)
      .single()

    const zip = String((chef as any)?.zip ?? '').trim()
    if (zip) defaultTaxZip = zip
  } catch {
    // non-blocking: terminal can still operate without prefilled ZIP
  }

  return <VirtualTerminalForm defaultTaxZip={defaultTaxZip} />
}
