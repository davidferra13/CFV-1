// Admin Portal Layout
// Requires admin access (email in ADMIN_EMAILS env var)
// Completely separate from chef/client portals — own sidebar, dark nav

import { requireAdmin } from '@/lib/auth/admin'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export const metadata = {
  title: 'Admin — ChefFlow',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    redirect('/auth/signin?redirect=/admin')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar adminEmail={admin.email} />
      {/* Main content offset for sidebar */}
      <main className="ml-52 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
