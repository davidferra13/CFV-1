import { requireChef } from '@/lib/auth/get-user'
import { getRestaurantGroupName } from '@/lib/chef/profile-actions'
import { getMyRestaurants } from '@/lib/restaurants/actions'
import { MyRestaurantsSettings } from './my-restaurants-settings'

export const metadata = { title: 'My Restaurants | ChefFlow' }

export default async function MyRestaurantsPage() {
  await requireChef()

  const [groupName, restaurants] = await Promise.all([getRestaurantGroupName(), getMyRestaurants()])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Restaurants</h1>
        <p className="text-stone-400 mt-1">
          Showcase restaurants you own or operate on your public profile.
        </p>
      </div>
      <MyRestaurantsSettings restaurantGroupName={groupName} restaurants={restaurants} />
    </div>
  )
}
