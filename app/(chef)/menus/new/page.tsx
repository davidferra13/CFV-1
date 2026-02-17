// Create Menu - Protected by layout

import { requireChef } from '@/lib/auth/get-user'
import { CreateMenuForm } from './create-menu-form'

export default async function CreateMenuPage() {
  const user = await requireChef()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Create Menu</h1>
        <p className="text-stone-600 mt-1">Create a new menu template</p>
      </div>

      <CreateMenuForm />
    </div>
  )
}
