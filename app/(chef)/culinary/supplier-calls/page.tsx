import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

// The Supplier Call Log has been renamed and moved to the Call Sheet.

export const metadata: Metadata = { title: 'Supplier Calls | ChefFlow' }

export default function SupplierCallsRedirect() {
  redirect('/culinary/call-sheet')
}
