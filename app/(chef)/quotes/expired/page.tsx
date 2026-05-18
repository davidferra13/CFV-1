// Thin redirect: /quotes/expired -> /quotes?status=expired
// Kept for backwards compatibility with bookmarks and links
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Expired Quotes | ChefFlow' }

export default function ExpiredQuotesPage() {
  redirect('/quotes?status=expired')
}
