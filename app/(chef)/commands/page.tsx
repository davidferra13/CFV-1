import { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { RemyHubDashboard } from '@/components/ai/remy-hub-dashboard'

export const metadata: Metadata = {
  title: 'Remy',
  description:
    'Your AI assistant. Commands, conversations, history, memory, and privacy - all in one place.',
}

export default async function CommandsPage() {
  await requireAdmin()

  return (
    <div className="container max-w-4xl py-8">
      <RemyHubDashboard />
    </div>
  )
}
