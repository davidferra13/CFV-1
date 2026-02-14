// Public Layout - No authentication required

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">ChefFlow</h1>
            <div className="flex items-center space-x-4">
              <a
                href="/auth/signin"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign In
              </a>
              <a
                href="/auth/signup"
                className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
              >
                Get Started
              </a>
            </div>
          </div>
        </nav>
      </header>
      {children}
    </div>
  )
}
