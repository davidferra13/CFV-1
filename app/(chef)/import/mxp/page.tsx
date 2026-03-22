// MasterCook Import
// Redirects to the Smart Import hub with file-upload mode pre-selected.

import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'

export default async function ImportMXPPage() {
  await requireChef()
  redirect('/import?mode=file-upload')
}
