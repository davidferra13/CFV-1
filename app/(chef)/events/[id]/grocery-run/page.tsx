import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getGroceryRunList } from '@/lib/mobile/grocery-run-actions'
import { GroceryRunClient } from './grocery-run-client'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Grocery Run | ChefFlow' }
}

export default async function GroceryRunPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  const { id: eventId } = await params

  let data
  try {
    data = await getGroceryRunList(eventId)
  } catch (err) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">Failed to load grocery list</p>
          <p className="text-stone-500 text-sm">
            {err instanceof Error ? err.message : 'Unknown error'}
          </p>
          <a
            href={`/events/${eventId}`}
            className="inline-block mt-4 px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-sm"
          >
            Back to Event
          </a>
        </div>
      </div>
    )
  }

  return <GroceryRunClient initialData={data} />
}
