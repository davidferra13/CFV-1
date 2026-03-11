import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Client Preferences - ChefFlow' }

const VIEWS = [
  {
    href: '/clients/preferences/dietary-restrictions',
    label: 'Dietary Restrictions',
    description: 'Vegetarian, vegan, kosher, halal, and other dietary requirements',
    icon: '🥗',
  },
  {
    href: '/clients/preferences/allergies',
    label: 'Allergies',
    description: 'Food allergy records across your entire clientele',
    icon: '⚠️',
  },
  {
    href: '/clients/preferences/favorite-dishes',
    label: 'Favorite Dishes',
    description: 'Dishes and flavors each client loves',
    icon: '❤️',
  },
  {
    href: '/clients/preferences/dislikes',
    label: 'Dislikes',
    description: 'Ingredients and dishes to avoid for each client',
    icon: '🚫',
  },
]

export default async function ClientPreferencesPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const withDietary = clients.filter(
    (c: any) => c.dietary_restrictions && (c.dietary_restrictions as string[]).length > 0
  ).length
  const withAllergies = clients.filter(
    (c: any) => c.allergies && (c.allergies as string[]).length > 0
  ).length
  const withPreferences = clients.filter(
    (c: any) =>
      (c.favorite_dishes && (c.favorite_dishes as string[]).length > 0) ||
      (c.dislikes && (c.dislikes as string[]).length > 0)
  ).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          ← Clients
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Client Preferences</h1>
        <p className="text-stone-500 mt-1">
          Dietary requirements, allergies, and taste profiles for every client
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-200">{withDietary}</p>
          <p className="text-sm text-stone-500 mt-1">With dietary restrictions</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-200">{withAllergies}</p>
          <p className="text-sm text-stone-500 mt-1">With known allergies</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-200">{withPreferences}</p>
          <p className="text-sm text-stone-500 mt-1">With taste preferences on file</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VIEWS.map((view) => (
          <Link key={view.href} href={view.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-2xl mb-2">{view.icon}</div>
              <h2 className="font-semibold text-stone-100">{view.label}</h2>
              <p className="text-sm text-stone-500 mt-1">{view.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
