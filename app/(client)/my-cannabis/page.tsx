// Cannabis Portal - Admin-only feature, hidden from client portal
import { requireClient } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export default async function ClientCannabisPage() {
  await requireClient()
  // Cannabis is admin-only - always redirect clients away
  redirect('/my-events')
}
