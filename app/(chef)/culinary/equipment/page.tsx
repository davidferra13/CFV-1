import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  listEquipmentExtended,
  getEquipmentCategories,
  getEquipmentSummary,
} from '@/lib/equipment/intelligence-actions'
import { EquipmentHubClient } from './equipment-hub-client'

export const metadata: Metadata = { title: 'Equipment' }

export default async function EquipmentHubPage() {
  await requireChef()

  const [items, categories, summary] = await Promise.all([
    listEquipmentExtended(),
    getEquipmentCategories(),
    getEquipmentSummary(),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-100">Equipment</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your complete kit. Track, plan, and never forget a pan again.
        </p>
      </div>
      <EquipmentHubClient initialItems={items} categories={categories} summary={summary} />
    </div>
  )
}
