import { requireChef } from '@/lib/auth/get-user'
import FermentationTracker from '@/components/bakery/fermentation-tracker'

export const metadata = {
  title: 'Fermentation Tracker | Bakery | ChefFlow',
}

export default async function FermentationPage() {
  await requireChef()

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4">
      <FermentationTracker />
    </div>
  )
}
