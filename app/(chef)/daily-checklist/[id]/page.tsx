import { redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'

export default async function DailyChecklistDetailPage({ params }: { params: { id: string } }) {
  await requireChef()
  await requireFocusAccess()

  if (params.id === 'today') {
    redirect('/daily-checklist')
  }

  redirect(`/tasks/templates?template=${encodeURIComponent(params.id)}`)
}
