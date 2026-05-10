import { redirect } from 'next/navigation'

export default function NutritionRedirect({ params }: { params: { menuId: string } }) {
  redirect(`/culinary/menus/${params.menuId}/nutrition`)
}
