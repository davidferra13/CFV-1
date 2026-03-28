import { requireAdmin } from '@/lib/auth/admin'
import { PriceCatalogClient } from './price-catalog-client'

export const metadata = {
  title: 'Price Catalog | Admin',
}

export default async function PriceCatalogPage() {
  await requireAdmin()
  return <PriceCatalogClient />
}
