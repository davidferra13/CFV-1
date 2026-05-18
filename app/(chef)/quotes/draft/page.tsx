// Thin redirect: /quotes/draft -> /quotes?status=draft
// Kept for backwards compatibility with bookmarks and links
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Draft Quotes | ChefFlow' }

export default function DraftQuotesPage() {
  redirect('/quotes?status=draft')
}
