import { requireChef } from '@/lib/auth/get-user'
import DisplayCase from '@/components/bakery/display-case'

export const metadata = {
  title: 'Display Case | ChefFlow',
}

export default async function DisplayCasePage() {
  await requireChef()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Display Case</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track what is in the retail case. Monitor quantities, freshness, and low-stock alerts.
        </p>
      </div>
      <DisplayCase />
    </div>
  )
}
