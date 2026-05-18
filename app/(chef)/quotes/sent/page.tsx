// Thin redirect: /quotes/sent -> /quotes?status=sent
// Kept for backwards compatibility with bookmarks and links
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Sent Quotes | ChefFlow' }

export default function SentQuotesPage() {
  redirect('/quotes?status=sent')
}
