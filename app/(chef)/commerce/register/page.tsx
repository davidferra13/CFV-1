// POS Register Page — product grid + cart + payment
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listProducts } from '@/lib/commerce/product-actions'
import { getCurrentRegisterSession } from '@/lib/commerce/register-actions'
import { PosRegister } from '@/components/commerce/pos-register'

export const metadata: Metadata = { title: 'POS Register — ChefFlow' }

export default async function RegisterPage() {
  await requireChef()

  const [productsData, registerSession] = await Promise.all([
    listProducts({ activeOnly: true }),
    getCurrentRegisterSession(),
  ])

  return <PosRegister products={productsData.products} registerSession={registerSession} />
}
