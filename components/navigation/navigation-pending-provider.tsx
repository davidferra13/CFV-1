'use client'

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'

type NavigationPendingContextType = {
  pendingHref: string | null
  setPendingHref: (href: string | null) => void
}

const NavigationPendingContext = createContext<NavigationPendingContextType>({
  pendingHref: null,
  setPendingHref: () => {},
})

export function NavigationPendingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const value = useMemo(
    () => ({ pendingHref, setPendingHref }),
    [pendingHref]
  )

  // Clear pending state when navigation completes
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  )
}

export function useNavigationPending() {
  return useContext(NavigationPendingContext)
}
