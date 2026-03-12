// Public Layout - No authentication required

import { PublicHeader } from '@/components/navigation/public-header'
import { PublicFooter } from '@/components/navigation/public-footer'
import { ThemeProvider } from '@/components/ui/theme-provider'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="public-shell relative flex min-h-screen flex-col overflow-x-clip bg-[linear-gradient(180deg,_#ffffff_0%,_#fff9f5_52%,_#fff0e0_100%)] text-stone-900 dark:bg-[radial-gradient(circle_at_top,_rgba(237,168,107,0.16),_transparent_34%),linear-gradient(180deg,_#31180f_0%,_#1f120f_46%,_#0c0a09_100%)] dark:text-stone-100">
        {/* Skip link removed - root layout.tsx already provides one */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 dark:hidden bg-[radial-gradient(circle_at_top,_rgba(243,197,150,0.34),_transparent_36%)]" />
          <div className="absolute -top-24 left-[-7rem] h-[24rem] w-[24rem] rounded-full bg-brand-300/55 blur-[100px] dark:hidden" />
          <div className="absolute top-[16%] right-[-8rem] h-[20rem] w-[20rem] rounded-full bg-brand-500/30 blur-[100px] dark:hidden" />
          <div className="absolute bottom-[-8rem] left-1/2 h-[20rem] w-[38rem] -translate-x-1/2 rounded-full bg-orange-200/45 blur-[120px] dark:hidden" />
          <div className="absolute inset-0 opacity-35 dark:hidden md:bg-[linear-gradient(rgba(177,92,38,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(177,92,38,0.08)_1px,transparent_1px)] md:bg-[size:120px_120px]" />
          <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(circle_at_top,_rgba(237,168,107,0.12),_transparent_34%)]" />
          <div className="absolute -top-24 left-1/2 hidden h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-700/35 blur-[90px] dark:block" />
          <div className="absolute top-[44%] -left-24 hidden h-[320px] w-[320px] rounded-full bg-brand-800/35 blur-[70px] dark:block" />
          <div className="absolute top-[72%] -right-24 hidden h-[280px] w-[280px] rounded-full bg-[#b15c26]/25 blur-[70px] dark:block" />
          <div className="absolute bottom-[-10rem] left-1/2 hidden h-[22rem] w-[40rem] -translate-x-1/2 rounded-full bg-[#6a2f1c]/30 blur-[130px] dark:block" />
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
