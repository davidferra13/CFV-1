// POS Register Page — product grid + cart + payment
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { listProducts } from '@/lib/commerce/product-actions'
import { getCurrentRegisterSession } from '@/lib/commerce/register-actions'
import { PosRegister } from '@/components/commerce/pos-register'

export const metadata: Metadata = { title: 'POS Register — ChefFlow' }

export default async function RegisterPage() {
  const user = await requireChef()
  await requirePro('commerce')

  const [productsData, registerSession] = await Promise.all([
    listProducts({ activeOnly: true }),
    getCurrentRegisterSession(),
  ])

  // Fetch chef's zip for default tax calculation
  let defaultTaxZip: string | undefined
  try {
    const supabase = createServerClient()
    const { data: chef } = await supabase
      .from('chefs')
      .select('zip')
      .eq('id', user.tenantId!)
      .single()
    if (chef && (chef as any).zip) {
      defaultTaxZip = (chef as any).zip
    }
  } catch {
    // non-blocking — POS works without tax zip
  }

  return (
    <PosRegister
      products={productsData.products}
      registerSession={registerSession}
      defaultTaxZip={defaultTaxZip}
    />
  )
}
