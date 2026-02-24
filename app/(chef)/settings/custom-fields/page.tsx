import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getAllCustomFieldDefinitions } from '@/lib/custom-fields/actions'
import { CustomFieldBuilder } from '@/components/settings/custom-field-builder'

export const metadata: Metadata = { title: 'Custom Fields - ChefFlow' }

export default async function CustomFieldsPage() {
  await requireChef()
  const grouped = await getAllCustomFieldDefinitions()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Custom Fields</h1>
        <p className="text-stone-400 mt-1">
          Add extra fields to events, clients, and recipes to capture information specific to your
          business.
        </p>
      </div>
      <CustomFieldBuilder initialGrouped={grouped} />
    </div>
  )
}
