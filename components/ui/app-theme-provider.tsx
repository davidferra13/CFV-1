'use client'

import { ThemeProvider } from '@/components/ui/theme-provider'

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="chefflow-theme"
      forcedTheme="dark"
    >
      {children}
    </ThemeProvider>
  )
}
