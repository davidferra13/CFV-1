import { requireChef } from '@/lib/auth/get-user'
import { getPackingTemplates } from '@/lib/packing/template-actions'
import { PackingTemplatesClient } from './packing-templates-client'

export const metadata = {
  title: 'Packing Templates | ChefFlow',
}

export default async function PackingTemplatesPage() {
  await requireChef()
  const templates = await getPackingTemplates()

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Packing Templates</h1>
        <p className="text-stone-500 text-sm mt-1">
          Reusable packing lists by event type. Create once, apply to any event.
        </p>
      </div>

      <PackingTemplatesClient initialTemplates={templates} />
    </div>
  )
}
