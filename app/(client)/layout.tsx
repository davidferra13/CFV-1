// Client Portal Layout - Layer 2 of Defense in Depth

import { requireClient } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user
  try {
    user = await requireClient()
  } catch {
    redirect('/auth/signin?portal=client')
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">ChefFlow</h1>
              <div className="hidden md:flex space-x-4">
                <a
                  href="/client/my-events"
                  className="text-gray-600 hover:text-gray-900"
                >
                  My Events
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
