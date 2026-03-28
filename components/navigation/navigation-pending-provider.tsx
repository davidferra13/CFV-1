'use client'

import { createContext, useContext, useState, useEffect } from 'react'
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

  // Clear pending state when navigation completes
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  return (
    <NavigationPendingContext.Provider value={{ pendingHref, setPendingHref }}>
      {children}
    </NavigationPendingContext.Provider>
  )
}

export function useNavigationPending() {
  return useContext(NavigationPendingContext)
}
