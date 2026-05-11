// Thin redirect: /quotes/accepted -> /quotes?status=accepted
// Kept for backwards compatibility with bookmarks and links
import { redirect } from 'next/navigation'

export default function AcceptedQuotesPage() {
  redirect('/quotes?status=accepted')
}
