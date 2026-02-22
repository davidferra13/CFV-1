import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { RemyHubDashboard } from '@/components/ai/remy-hub-dashboard'

export const metadata: Metadata = {
  title: 'Remy — ChefFlow',
  description:
    'Your AI assistant. Commands, conversations, history, memory, and privacy — all in one place.',
}

export default async function CommandsPage() {
  await requireChef()

  return (
    <div className="container max-w-4xl py-8">
      <RemyHubDashboard />
    </div>
  )
}
