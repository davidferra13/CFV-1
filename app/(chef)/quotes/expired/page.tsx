// Thin redirect: /quotes/expired -> /quotes?status=expired
// Kept for backwards compatibility with bookmarks and links
import { redirect } from 'next/navigation'

export default function ExpiredQuotesPage() {
  redirect('/quotes?status=expired')
}
