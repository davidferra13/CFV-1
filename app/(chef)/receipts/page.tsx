// Receipt Library - Chef-wide archive of every receipt ever uploaded.
// Upload anything here: event receipts, supply runs, annual purchases, etc.
// Receipts can optionally link to an event or client - or stand alone.

import { Card } from '@/components/ui/card'
import { ReceiptLibraryClient } from '@/components/receipts/receipt-library-client'
import { StandaloneUpload } from '@/components/receipts/standalone-upload'
import { requireChef } from '@/lib/auth/get-user'
import {
  getAllReceiptsForChef,
  getClientOptionsForChef,
  getEventOptionsForChef,
} from '@/lib/receipts/library-actions'

export const metadata = { title: 'Receipt Library - ChefFlow' }

export default async function ReceiptLibraryPage() {
  await requireChef()

  const [receipts, events, clients] = await Promise.all([
    getAllReceiptsForChef(),
    getEventOptionsForChef(),
    getClientOptionsForChef(),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-stone-100">Receipt Library</h1>
        <p className="mt-1 text-sm text-stone-500">
          Every receipt you have uploaded, across all events or standalone.
        </p>
      </div>

      <StandaloneUpload events={events} clients={clients} />

      <Card className="border-stone-700 bg-stone-800 p-4">
        <p className="text-sm text-stone-400">
          Upload receipts for any expense: groceries, equipment, gas, supplies, or anything else.
          Optionally link them to an event or client for reporting. Use <strong>Auto-Extract</strong>{' '}
          to read line items automatically, then review and tag each item as <em>business</em> or{' '}
          <em>personal</em>. Nothing is added to expenses until you approve the receipt.
        </p>
      </Card>

      <ReceiptLibraryClient receipts={receipts} events={events} clients={clients} />
    </div>
  )
}
