// Thin redirect: /quotes/accepted -> /quotes?status=accepted
// Kept for backwards compatibility with bookmarks and links
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Accepted Quotes | ChefFlow' }

export default function AcceptedQuotesPage() {
  redirect('/quotes?status=accepted')
}
