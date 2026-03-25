import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { VirtualTerminalForm } from '@/components/commerce/virtual-terminal-form'

export const metadata: Metadata = { title: 'Virtual Terminal - ChefFlow' }

export default async function VirtualTerminalPage() {
  const user = await requireChef()
  await requirePro('commerce')

  const db: any = createServerClient()
  let defaultTaxZip: string | undefined

  try {
    const { data: chef } = await db.from('chefs').select('zip').eq('id', user.tenantId!).single()

    const zip = String((chef as any)?.zip ?? '').trim()
    if (zip) defaultTaxZip = zip
  } catch {
    // non-blocking: terminal can still operate without prefilled ZIP
  }

  return <VirtualTerminalForm defaultTaxZip={defaultTaxZip} />
}
