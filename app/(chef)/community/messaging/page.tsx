import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { PeerMessaging } from '@/components/community/peer-messaging'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Peer Messaging | Community' }

export default async function MessagingPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Peer Messaging</h1>
      </div>

      <PeerMessaging />
    </div>
  )
}
