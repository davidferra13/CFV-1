'use client'

import { useCallback, useState } from 'react'
import { signOut } from '@/lib/auth/actions'
import { LogOut } from '@/components/ui/icons'

export function SignOutButton() {
  const [pending, setPending] = useState(false)

  const handleSignOut = useCallback(async () => {
    setPending(true)
    try {
      await signOut()
    } catch {
      // ignore
    }
    window.location.href = '/'
  }, [])

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 disabled:opacity-50 transition-colors"
    >
      <LogOut className="w-4 h-4" />
      {pending ? 'Signing out...' : 'Sign out of ChefFlow'}
    </button>
  )
}
