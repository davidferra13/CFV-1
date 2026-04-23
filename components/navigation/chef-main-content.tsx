// Client component that adjusts main content padding based on sidebar collapse state
'use client'

import { useSidebar } from '@/components/navigation/chef-nav'
import { BreadcrumbBar } from '@/components/navigation/breadcrumb-bar'
import { QuickExpenseTrigger } from '@/components/expenses/quick-expense-trigger'
import { usePathname } from 'next/navigation'

export function ChefMainContent({
  children,
  showDesktopSidebar = true,
  showMobileNav = true,
  showBreadcrumbBar = true,
  showQuickExpenseTrigger = true,
  contentWidth = 'constrained',
}: {
  children: React.ReactNode
  showDesktopSidebar?: boolean
  showMobileNav?: boolean
  showBreadcrumbBar?: boolean
  showQuickExpenseTrigger?: boolean
  contentWidth?: 'constrained' | 'full'
}) {
  const { collapsed } = useSidebar()
  const pathname = usePathname()

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`transition-all duration-200 ${
        showMobileNav ? 'pt-mobile-header pb-mobile-nav lg:pt-0 lg:pb-0' : 'pt-0 pb-0'
      } ${
        showDesktopSidebar ? (collapsed ? 'lg:pl-16' : 'lg:pl-60') : 'lg:pl-0'
      }`}
    >
      {showBreadcrumbBar ? <BreadcrumbBar /> : null}
      {showQuickExpenseTrigger ? <QuickExpenseTrigger /> : null}
      <div
        key={pathname}
        className={`animate-fade-slide-up ${
          contentWidth === 'full'
            ? 'w-full'
            : 'max-w-content mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
        }`}
      >
        {children}
      </div>
    </main>
  )
}
