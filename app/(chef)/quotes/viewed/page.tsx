// Thin redirect: /quotes/viewed -> /quotes?status=viewed
// Kept for backwards compatibility with bookmarks and links
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Viewed Quotes | ChefFlow' }

export default function ViewedQuotesPage() {
  redirect('/quotes?status=viewed')
}
