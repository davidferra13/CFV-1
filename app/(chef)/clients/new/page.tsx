import type { Metadata } from 'next'
import { ClientCreateForm } from './client-create-form'

export const metadata: Metadata = { title: 'Add Client - ChefFlow' }

export default function NewClientPage() {
  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Add Client</h1>
      <ClientCreateForm />
    </div>
  )
}
