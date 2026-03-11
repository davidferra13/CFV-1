// Public Layout - No authentication required

import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'
import { ThemeProvider } from '@/components/ui/theme-provider'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="public-shell relative flex min-h-screen flex-col overflow-x-clip text-stone-900 dark:bg-gradient-to-b dark:from-[#1a1210] dark:via-[#141110] dark:to-stone-950 dark:text-stone-100">
        {/* Skip link removed - root layout.tsx already provides one */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 dark:hidden bg-[radial-gradient(circle_at_top,_rgba(248,221,192,0.38),_transparent_34%),linear-gradient(180deg,_#fffdf9_0%,_#faf6ef_52%,_#f3ede4_100%)]" />
          <div className="absolute -top-20 left-[-6rem] h-[22rem] w-[22rem] rounded-full bg-brand-200/55 blur-[90px] dark:hidden" />
          <div className="absolute top-[18%] right-[-7rem] h-[18rem] w-[18rem] rounded-full bg-[#efd7bf]/55 blur-[80px] dark:hidden" />
          <div className="absolute bottom-[-7rem] left-1/2 h-[18rem] w-[34rem] -translate-x-1/2 rounded-full bg-[#e8d8c8]/45 blur-[110px] dark:hidden" />
          <div className="absolute inset-0 opacity-40 dark:hidden md:bg-[linear-gradient(rgba(177,92,38,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(177,92,38,0.08)_1px,transparent_1px)] md:bg-[size:120px_120px]" />
          <div className="absolute -top-20 left-1/2 hidden h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-brand-800/30 blur-[80px] dark:block" />
          <div className="absolute top-[50%] -left-20 hidden h-[300px] w-[300px] rounded-full bg-brand-900/35 blur-[60px] dark:block" />
          <div className="absolute top-[75%] -right-20 hidden h-[250px] w-[250px] rounded-full bg-brand-800/20 blur-[60px] dark:block" />
        </div>
        <PublicHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <PublicFooter />
      </div>
    </ThemeProvider>
  )
}
