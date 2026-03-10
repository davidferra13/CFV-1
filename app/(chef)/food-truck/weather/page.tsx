import { requireChef } from '@/lib/auth/get-user'
import WeatherDemand from '@/components/food-truck/weather-demand'

export const metadata = {
  title: 'Weather Demand | Food Truck | ChefFlow',
}

export default async function WeatherDemandPage() {
  await requireChef()

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4">
      <WeatherDemand />
    </div>
  )
}
