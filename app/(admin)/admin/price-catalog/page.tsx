import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Price Catalog | Admin',
}

export default async function PriceCatalogPage() {
  redirect('/culinary/price-catalog')
}
