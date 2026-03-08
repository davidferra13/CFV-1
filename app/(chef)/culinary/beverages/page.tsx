import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getBeverages } from '@/lib/beverages/actions'
import { BeverageLibraryClient } from './beverage-library-client'

export const metadata: Metadata = { title: 'Beverage Library - ChefFlow' }

export default async function BeveragesPage() {
  await requireChef()
  const beverages = await getBeverages()

  return <BeverageLibraryClient initialBeverages={beverages} />
}
