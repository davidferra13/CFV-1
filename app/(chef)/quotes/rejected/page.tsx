// Thin redirect: /quotes/rejected -> /quotes?status=rejected
// Kept for backwards compatibility with bookmarks and links
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Rejected Quotes | ChefFlow' }

export default function RejectedQuotesPage() {
  redirect('/quotes?status=rejected')
}
