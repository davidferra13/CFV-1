// Receipt Library - Chef-wide archive of every receipt ever uploaded.
// Upload anything here: event receipts, supply runs, annual purchases, etc.
// Receipts can optionally link to an event or client - or stand alone.

import { requireChef } from '@/lib/auth/get-user'
import {
  getAllReceiptsForChef,
  getEventOptionsForChef,
  getClientOptionsForChef,
} from '@/lib/receipts/library-actions'
import { ReceiptLibraryClient } from '@/components/receipts/receipt-library-client'
import { StandaloneUpload } from '@/components/receipts/standalone-upload'
import { Card } from '@/components/ui/card'

export const metadata = { title: 'Receipt Library' }

export default async function ReceiptLibraryPage() {
  await requireChef()

  const [receipts, events, clients] = await Promise.all([
    getAllReceiptsForChef(),
    getEventOptionsForChef(),
    getClientOptionsForChef(),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-stone-100">Receipt Library</h1>
        <p className="text-stone-500 text-sm mt-1">
          Every receipt you've ever uploaded - across all events or standalone.
        </p>
      </div>

      {/* Upload widget */}
      <StandaloneUpload events={events} clients={clients} />

      {/* Instructions */}
      <Card className="p-4 bg-stone-800 border-stone-700">
        <p className="text-sm text-stone-400">
          Upload receipts for any expense - groceries, equipment, gas, supplies, or anything else.
          Optionally link to an event or client for reporting. Use <strong>Auto-Extract</strong> to
          read line items automatically, then tag each item as <em>business</em> or{' '}
          <em>personal</em> and approve to add them to your expenses.
        </p>
      </Card>

      {/* Library */}
      <ReceiptLibraryClient receipts={receipts} events={events} clients={clients} />
    </div>
  )
}
