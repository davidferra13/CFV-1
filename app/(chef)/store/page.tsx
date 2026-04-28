import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'

export default async function StoreAliasPage() {
  await requireChef()
  redirect('/commerce/storefront')
}

export const dynamic = 'force-dynamic'
