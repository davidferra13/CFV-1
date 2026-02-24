// Create Purchase Order Page
// Manual PO creation or generate from event menu.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { CreatePOClient } from './create-po-client'

export const metadata: Metadata = { title: 'Create Purchase Order - ChefFlow' }

export default async function CreatePOPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/inventory/purchase-orders"
          className="text-sm text-stone-500 hover:text-stone-300"
        >
          &larr; Purchase Orders
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Create Purchase Order</h1>
        <p className="text-stone-500 mt-1">
          Create a new purchase order manually or generate one from an upcoming event&apos;s menu.
        </p>
      </div>

      <CreatePOClient />
    </div>
  )
}
