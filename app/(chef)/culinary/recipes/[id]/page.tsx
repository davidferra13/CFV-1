import { redirect } from 'next/navigation'

export default function CulinaryRecipeDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/recipes/${params.id}`)
}
