import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { PriceCatalogClient } from '@/app/(admin)/admin/price-catalog/price-catalog-client'

export const metadata = { title: 'Food Catalog' }

export default async function PriceCatalogPage() {
  try {
    await requireChef()
  } catch {
    redirect('/sign-in')
  }

  return <PriceCatalogClient />
}
