// Thin redirect: /quotes/draft -> /quotes?status=draft
// Kept for backwards compatibility with bookmarks and links
import { redirect } from 'next/navigation'

export default function DraftQuotesPage() {
  redirect('/quotes?status=draft')
}
