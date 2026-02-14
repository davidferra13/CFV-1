// Public landing page

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          The Operating System for{' '}
          <span className="text-orange-500">Private Chefs</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Manage events, clients, menus, and payments all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/auth/signup"
            className="bg-orange-500 text-white px-8 py-3 rounded-md hover:bg-orange-600"
          >
            Get Started
          </a>
        </div>
      </div>
    </main>
  )
}
