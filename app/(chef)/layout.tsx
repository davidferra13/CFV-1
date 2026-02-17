// Chef Portal Layout - Layer 2 of Defense in Depth
// Server Component checks role before rendering any child components

import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { ChefSidebar, ChefMobileNav, SidebarProvider } from '@/components/navigation/chef-nav'
import { ChefMainContent } from '@/components/navigation/chef-main-content'

export default async function ChefLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side role check - happens BEFORE any client code ships
  let user
  try {
    user = await requireChef()
  } catch {
    redirect('/auth/signin?portal=chef')
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-surface-muted">
        {/* Desktop sidebar */}
        <ChefSidebar />
        {/* Mobile nav (top bar + bottom tabs) */}
        <ChefMobileNav />

        {/* Main content — offset adjusts dynamically based on sidebar state */}
        <ChefMainContent>
          {children}
        </ChefMainContent>
      </div>
    </SidebarProvider>
  )
}
