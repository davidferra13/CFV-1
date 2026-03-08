'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { stopClientImpersonation } from '@/lib/auth/client-impersonation-actions'

export function ClientImpersonationBanner({
  clientName,
  clientEmail,
  chefName,
}: {
  clientName: string | null
  clientEmail: string | null
  chefName: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleExit() {
    startTransition(async () => {
      try {
        await stopClientImpersonation()
        router.push('/admin/clients')
        router.refresh()
      } catch (err) {
        console.error('[ClientImpersonation] Exit failed:', err)
      }
    })
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-purple-600 text-white px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-200" />
        </span>
        <span className="font-medium">Admin View</span>
        <span className="hidden sm:inline text-purple-200">
          Viewing as client: {clientName ?? 'Unknown'}
          {clientEmail && <span className="hidden md:inline"> ({clientEmail})</span>}
          {chefName && <span className="text-purple-300"> - Chef: {chefName}</span>}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href="/admin/clients"
          className="text-xs text-purple-200 hover:text-white transition-colors"
        >
          Admin Clients
        </a>
        <button
          onClick={handleExit}
          disabled={isPending}
          className="bg-purple-700 hover:bg-purple-800 text-white text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
        >
          {isPending ? 'Exiting...' : 'Exit View'}
        </button>
      </div>
    </div>
  )
}
