// Client Portal Layout - Layer 2 of Defense in Depth

import { requireClient } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { ClientNav } from '@/components/navigation/client-nav'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await requireClient()
  } catch {
    redirect('/auth/signin?portal=client')
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <ClientNav userEmail={user.email} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}
