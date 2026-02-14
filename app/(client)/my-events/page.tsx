// Client Events List - Protected by layout

import { requireClient } from '@/lib/auth/get-user'

export default async function MyEvents() {
  const user = await requireClient()

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Events</h1>
      <p className="text-gray-600">Welcome, {user.email}</p>
    </div>
  )
}
