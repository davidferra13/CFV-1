// Public Layout - No authentication required

import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'
import { ThemeProvider } from '@/components/ui/theme-provider'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="public-shell relative flex min-h-screen flex-col overflow-x-clip bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        {/* Skip link removed - root layout.tsx already provides one */}
        <PublicHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <PublicFooter />
      </div>
    </ThemeProvider>
  )
}
