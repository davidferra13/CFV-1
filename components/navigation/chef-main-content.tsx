// Client component that adjusts main content padding based on sidebar collapse state
'use client'

import { useSidebar } from '@/components/navigation/chef-nav'
import { BreadcrumbBar } from '@/components/navigation/breadcrumb-bar'
import { QuickExpenseTrigger } from '@/components/expenses/quick-expense-trigger'

export function ChefMainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`pt-mobile-header pb-mobile-nav lg:pt-0 lg:pb-0 transition-all duration-200 ${
        collapsed ? 'lg:pl-16' : 'lg:pl-60'
      }`}
    >
      <BreadcrumbBar />
      <QuickExpenseTrigger />
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
    </main>
  )
}
