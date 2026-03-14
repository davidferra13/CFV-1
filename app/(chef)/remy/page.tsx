import { Suspense } from 'react'
import { Bot } from '@/components/ui/icons'
import { RemyHistoryList } from '@/components/ai/remy-history-list'
import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { isFounderEmail } from '@/lib/platform/owner-account'

export const metadata = {
  title: 'Remy History',
  description: 'Everything Remy has ever created for you',
}

export default async function RemyHistoryPage() {
  const admin = await requireAdmin()
  if (!isFounderEmail(admin.email)) {
    redirect('/unauthorized')
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-brand-900 dark:bg-brand-900/30">
          <Bot className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-100 dark:text-stone-100">Remy History</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Everything Remy has created for you — nothing goes into the abyss.
          </p>
        </div>
      </div>

      {/* Content */}
      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-stone-800 dark:bg-stone-800 animate-pulse"
              />
            ))}
          </div>
        }
      >
        <RemyHistoryList />
      </Suspense>
    </div>
  )
}
