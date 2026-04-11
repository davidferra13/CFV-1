import { redirect } from 'next/navigation'

// The Supplier Call Log has been renamed and moved to the Call Sheet.
export default function SupplierCallsRedirect() {
  redirect('/culinary/call-sheet')
}
