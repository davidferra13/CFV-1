// Chef Portal Layout - Layer 2 of Defense in Depth
// Server Component checks role before rendering any child components

import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">ChefFlow</h1>
              <div className="hidden md:flex space-x-4">
                <a
                  href="/chef/dashboard"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </a>
                <a
                  href="/chef/events"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Events
                </a>
                <a
                  href="/chef/clients"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Clients
                </a>
                <a
                  href="/chef/menus"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Menus
                </a>
                <a
                  href="/chef/financials"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Financials
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button className="text-sm text-gray-600 hover:text-gray-900">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
