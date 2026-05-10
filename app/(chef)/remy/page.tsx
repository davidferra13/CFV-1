import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { loadConciergeContext } from '@/lib/remy/actions'
import { getAiPreferences } from '@/lib/ai/privacy-actions'
import { RemyChatClient } from './remy-chat-client'

export const metadata: Metadata = {
  title: 'Remy',
  description: 'Your AI concierge',
}

export default async function RemyPage() {
  await requireChef()

  const [context, preferences] = await Promise.all([
    loadConciergeContext().catch(() => null),
    getAiPreferences().catch(() => null),
  ])

  return <RemyChatClient initialContext={context} remyEnabled={preferences?.remy_enabled ?? true} />
}
