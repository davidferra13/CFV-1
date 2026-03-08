'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startClientImpersonation } from '@/lib/auth/client-impersonation-actions'

export function ViewAsClientButton({
  clientId,
  className,
}: {
  clientId: string
  className?: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await startClientImpersonation(clientId)
        if (result.success) {
          router.push('/client-portal')
          router.refresh()
        }
      } catch (err) {
        console.error('[ViewAsClient]', err)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={
        className ??
        'text-xs text-purple-500 hover:text-purple-400 font-medium transition-colors disabled:opacity-50'
      }
    >
      {isPending ? 'Loading...' : 'View as Client'}
    </button>
  )
}
