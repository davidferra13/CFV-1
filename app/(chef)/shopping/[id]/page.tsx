// Shopping List Detail Page (server component wrapper)
// Fetches data and renders the mobile-optimized shopping mode client component

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getShoppingList } from '@/lib/shopping/actions'
import { ShoppingModeClient } from './shopping-mode-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Shopping Mode - ChefFlow' }

export default async function ShoppingListDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  let list: Awaited<ReturnType<typeof getShoppingList>> | null = null
  let fetchError = false

  try {
    list = await getShoppingList(params.id)
  } catch {
    fetchError = true
  }

  if (fetchError || !list) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Link
          href="/shopping"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lists
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Shopping list not found or could not be loaded.
        </div>
      </div>
    )
  }

  return <ShoppingModeClient initialList={list} />
}
