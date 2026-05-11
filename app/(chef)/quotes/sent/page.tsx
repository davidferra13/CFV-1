// Thin redirect: /quotes/sent -> /quotes?status=sent
// Kept for backwards compatibility with bookmarks and links
import { redirect } from 'next/navigation'

export default function SentQuotesPage() {
  redirect('/quotes?status=sent')
}
