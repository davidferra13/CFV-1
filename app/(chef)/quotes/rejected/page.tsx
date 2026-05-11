// Thin redirect: /quotes/rejected -> /quotes?status=rejected
// Kept for backwards compatibility with bookmarks and links
import { redirect } from 'next/navigation'

export default function RejectedQuotesPage() {
  redirect('/quotes?status=rejected')
}
