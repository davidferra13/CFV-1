import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
  return { title: 'Nutrition Details | ChefFlow' }
}

export default function NutritionRedirect({ params }: { params: { menuId: string } }) {
  redirect(`/culinary/menus/${params.menuId}/nutrition`)
}
