'use client'

// Admin Impersonation Banner
// Persistent top bar shown when an admin is viewing the app as another chef.
// Includes the chef's name, a link back to their admin profile, and an exit button.

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { stopImpersonation } from '@/lib/auth/admin-impersonation-actions'

interface ImpersonationBannerProps {
  chefId: string
  businessName: string | null
  email: string | null
}

export function ImpersonationBanner({ chefId, businessName, email }: ImpersonationBannerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStop() {
    startTransition(async () => {
      try {
        await stopImpersonation()
        router.push('/admin/users')
        router.refresh()
      } catch (err) {
        console.error('[Impersonation] Failed to stop:', err)
      }
    })
  }

  const displayName = businessName || email || chefId.slice(0, 8)

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-sm font-medium shadow-lg">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          Admin View
        </span>
        <span className="hidden sm:inline">
          Viewing as <strong>{displayName}</strong>
          {email && businessName && <span className="text-amber-200 ml-1">({email})</span>}
        </span>
        <span className="sm:hidden">
          <strong>{displayName}</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={`/admin/users/${chefId}`}
          className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded transition-colors"
        >
          Admin Profile
        </a>
        <button
          onClick={handleStop}
          disabled={isPending}
          className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Exiting...' : 'Exit View'}
        </button>
      </div>
    </div>
  )
}
