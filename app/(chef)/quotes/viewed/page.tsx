// Thin redirect: /quotes/viewed -> /quotes?status=viewed
// Kept for backwards compatibility with bookmarks and links
import { redirect } from 'next/navigation'

export default function ViewedQuotesPage() {
  redirect('/quotes?status=viewed')
}
