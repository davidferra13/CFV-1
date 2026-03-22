// CSV Import
// Redirects to the Smart Import hub with CSV mode pre-selected.

import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'

export default async function ImportCSVPage() {
  await requireChef()
  redirect('/import?mode=csv')
}
