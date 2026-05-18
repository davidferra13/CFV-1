import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

// Vendor directory is now part of the Call Sheet (/culinary/call-sheet?tab=vendors)

export const metadata: Metadata = { title: 'Culinary Vendors | ChefFlow' }

export default function VendorsRedirect() {
  redirect('/culinary/call-sheet?tab=vendors')
}
