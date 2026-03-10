import { requireChef } from '@/lib/auth/get-user'
import PreorderManager from '@/components/food-truck/preorder-manager'

export const metadata = {
  title: 'Pre-Orders | Food Truck | ChefFlow',
}

export default async function PreordersPage() {
  await requireChef()

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4">
      <PreorderManager />
    </div>
  )
}
