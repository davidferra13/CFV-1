'use client'

import { usePathname } from 'next/navigation'
import { ThemeProvider } from '@/components/ui/theme-provider'

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const forceLightTheme = pathname?.startsWith('/embed') ?? false

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="chefflow-theme"
      forcedTheme={forceLightTheme ? 'light' : undefined}
    >
      {children}
    </ThemeProvider>
  )
}
