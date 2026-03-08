// New Shopping List Page
// Manual creation of a shopping list with name and items

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { NewShoppingListForm } from './new-list-form'

export const metadata: Metadata = { title: 'New Shopping List - ChefFlow' }

export default async function NewShoppingListPage() {
  await requireChef()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Shopping List</h1>
      <NewShoppingListForm />
    </div>
  )
}
