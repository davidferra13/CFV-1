'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const CommandPalette = dynamic(() => import('./command-palette').then((m) => m.CommandPalette), {
  ssr: false,
})

export function CommandPaletteLauncher({ userId, tenantId }: { userId: string; tenantId: string }) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const activate = () => setLoaded(true)

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation()
        activate()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('open-search', activate)
    window.addEventListener('open-command-palette', activate)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('open-search', activate)
      window.removeEventListener('open-command-palette', activate)
    }
  }, [])

  if (!loaded) return null
  return <CommandPalette userId={userId} tenantId={tenantId} defaultOpen />
}
