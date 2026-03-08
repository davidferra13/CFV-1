'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { startImpersonation } from '@/lib/auth/admin-impersonation-actions'

interface ViewAsChefButtonProps {
  chefId: string
  className?: string
}

export function ViewAsChefButton({ chefId, className }: ViewAsChefButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await startImpersonation(chefId)
        if (result.success) {
          router.push('/dashboard')
          router.refresh()
        } else {
          console.error('[Impersonation] Failed:', result.error)
        }
      } catch (err) {
        console.error('[Impersonation] Error:', err)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={
        className ?? 'text-xs text-amber-600 hover:text-amber-400 font-medium disabled:opacity-50'
      }
    >
      {isPending ? 'Loading...' : 'View as Chef'}
    </button>
  )
}
